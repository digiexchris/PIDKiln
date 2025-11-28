/**
 * Mock data generators for PIDKiln simulator
 * Simulates ESP32 responses for frontend development
 */

const EventEmitter = require('events');

// Event emitter for state changes
const stateEmitter = new EventEmitter();

// Program status constants (matches pidkiln.h)
const PROGRAM_STATUS = {
  NONE: 0,
  READY: 1,
  RUNNING: 2,
  PAUSED: 3,
  STOPPED: 4,
  ABORTED: 5,
  WAITING_THRESHOLD: 6,
  FINISHED: 7,
  FAILED: 8
};

// Simulator state
const state = {
  programStatus: PROGRAM_STATUS.READY,
  loadedProgram: 'program1.txt',
  loadedProgramContent: null,  // Store program content when loaded
  kilnTemp: 25.5,
  setTemp: 0,
  envTemp: 22.3,
  caseTemp: 28.1,
  heatPercent: 0,
  tempChange: 0.0,
  currentStep: 0,
  totalSteps: 7,
  programStartTime: null,
  programEndTime: null
};

// Temperature history buffer (24h at 10s intervals = max 8640 points)
const HISTORY_INTERVAL_MS = 10000; // 10 seconds
const HISTORY_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const HISTORY_MAX_POINTS = Math.ceil(HISTORY_MAX_AGE_MS / HISTORY_INTERVAL_MS);

// History data structure
// Each point: { t: timestamp (ms), k: kiln_temp, s: set_temp, p: power, m?: marker }
// Marker types:
//   - 'start'    : program started
//   - 'stop'     : program stopped by user
//   - 'abort'    : program aborted
//   - 'finish'   : program completed successfully
//   - 'pause'    : program paused
//   - 'resume'   : program resumed
//   - 'target'   : target temperature changed (manual set_temp)
//   - 'step'     : program step completed (value = step number)
const temperatureHistory = [];
let historyInterval = null;

// Simulation intervals
let simulationInterval = null;
let broadcastInterval = null;

/**
 * Format date for display
 */
function formatTime(d) {
  if (!d) return '-';
  return d.toLocaleString('en-GB', { 
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).replace(',', '');
}

// =============================================================================
// Temperature History
// =============================================================================

/**
 * Record a history point
 */
function recordHistoryPoint(marker = null) {
  const point = {
    t: Date.now(),
    k: parseFloat(state.kilnTemp.toFixed(1)),
    s: parseFloat(state.setTemp.toFixed(1)),
    p: state.heatPercent
  };
  
  if (marker) {
    point.m = marker;
  }
  
  temperatureHistory.push(point);
  
  // Trim old data
  const cutoff = Date.now() - HISTORY_MAX_AGE_MS;
  while (temperatureHistory.length > 0 && temperatureHistory[0].t < cutoff) {
    temperatureHistory.shift();
  }
  
  // Also enforce max points limit
  while (temperatureHistory.length > HISTORY_MAX_POINTS) {
    temperatureHistory.shift();
  }
}

/**
 * Add a marker to history (program events)
 */
function addHistoryMarker(type, value = null) {
  const marker = { type };
  if (value !== null) {
    marker.value = value;
  }
  recordHistoryPoint(marker);
}

/**
 * Start history recording (called on simulator init)
 */
function startHistoryRecording() {
  if (historyInterval) return;
  
  historyInterval = setInterval(() => {
    recordHistoryPoint();
  }, HISTORY_INTERVAL_MS);
  
  // Record initial point
  recordHistoryPoint();
}

/**
 * Get temperature history
 */
function getHistory() {
  return temperatureHistory;
}

/**
 * Generate initial history data (for demo purposes)
 * Creates ~1 hour of simulated past data
 */
function generateInitialHistory() {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  // Generate points for the last hour
  let temp = 25;
  for (let t = oneHourAgo; t < now; t += HISTORY_INTERVAL_MS) {
    // Simulate some temperature variation
    temp += (Math.random() - 0.5) * 0.5;
    temp = Math.max(20, Math.min(30, temp)); // Keep around room temp
    
    temperatureHistory.push({
      t,
      k: parseFloat(temp.toFixed(1)),
      s: 0,
      p: 0
    });
  }
}

/**
 * Get current state as object (for WebSocket broadcast)
 */
function getState() {
  const now = new Date();
  return {
    program_status: state.programStatus,
    program_name: state.loadedProgram || '',
    kiln_temp: parseFloat(state.kilnTemp.toFixed(1)),
    set_temp: parseFloat(state.setTemp.toFixed(1)),
    env_temp: parseFloat(state.envTemp.toFixed(1)),
    case_temp: parseFloat(state.caseTemp.toFixed(1)),
    heat_percent: state.heatPercent,
    temp_change: parseFloat(state.tempChange.toFixed(1)),
    step: `${state.currentStep} of ${state.totalSteps}`,
    prog_start: formatTime(state.programStartTime),
    prog_end: formatTime(state.programEndTime),
    curr_time: formatTime(now)
  };
}

/**
 * Get log data point (for WebSocket broadcast during program run)
 */
function getLogPoint() {
  return {
    timestamp: new Date().toISOString(),
    kiln_temp: parseFloat(state.kilnTemp.toFixed(1)),
    set_temp: parseFloat(state.setTemp.toFixed(1)),
    power: state.heatPercent
  };
}

/**
 * Emit state change event
 */
function emitStateChange() {
  stateEmitter.emit('state', getState());
}

/**
 * Emit log data point
 */
function emitLogPoint() {
  stateEmitter.emit('log', getLogPoint());
}

/**
 * Start simulation (called when program starts)
 */
function startSimulation() {
  if (simulationInterval) return;
  
  state.programStartTime = new Date();
  state.programEndTime = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours
  state.setTemp = 95;
  state.currentStep = 1;
  
  startSimulationLoop();
}

/**
 * Start the simulation loop (handles both heating and cooling)
 */
function startSimulationLoop() {
  if (simulationInterval) return;
  
  // Simulation tick - update temperatures
  simulationInterval = setInterval(() => {
    const isRunning = state.programStatus === PROGRAM_STATUS.RUNNING;
    const isCooling = [
      PROGRAM_STATUS.STOPPED,
      PROGRAM_STATUS.ABORTED,
      PROGRAM_STATUS.FINISHED,
      PROGRAM_STATUS.FAILED
    ].includes(state.programStatus);
    
    if (isRunning) {
      // Simulate heating towards set temperature
      const diff = state.setTemp - state.kilnTemp;
      if (diff > 0) {
        state.kilnTemp += Math.min(diff * 0.1, 2);
        state.heatPercent = Math.min(100, Math.round(diff * 2));
        state.tempChange = Math.round((Math.random() * 50 + 20) * 10) / 10;
      } else if (diff < 0) {
        // Cooling down to lower set temp
        state.kilnTemp += Math.max(diff * 0.05, -1);
        state.heatPercent = 0;
        state.tempChange = -Math.round((Math.random() * 30 + 10) * 10) / 10;
      } else {
        state.heatPercent = Math.max(0, state.heatPercent - 5);
        state.tempChange = 0;
      }
    } else if (isCooling) {
      // Passive cooling towards environment temperature
      const diff = state.envTemp - state.kilnTemp;
      if (Math.abs(diff) > 0.5) {
        // Cooling rate depends on temperature difference (faster when hotter)
        const coolingRate = Math.max(0.1, Math.abs(diff) * 0.02);
        state.kilnTemp += diff > 0 ? coolingRate : -coolingRate;
        state.tempChange = -Math.round(coolingRate * 3600 * 10) / 10; // °C/hour
      } else {
        // Close enough to env temp, stop cooling simulation
        state.kilnTemp = state.envTemp;
        state.tempChange = 0;
        stopSimulationLoop();
      }
      state.heatPercent = 0;
    }
    
    // Update case temperature based on kiln temp
    state.caseTemp = 28 + (state.kilnTemp - 25) * 0.05;
    
    // Add some random variation to env temp
    state.envTemp = 22 + (Math.random() - 0.5) * 0.2;
  }, 1000);
  
  // Broadcast state every second
  broadcastInterval = setInterval(() => {
    emitStateChange();
    
    // Also emit log point during running state (simulating LOG_Window)
    if (state.programStatus === PROGRAM_STATUS.RUNNING) {
      emitLogPoint();
    }
  }, 1000);
  
  emitStateChange();
}

/**
 * Stop the simulation loop completely
 */
function stopSimulationLoop() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    broadcastInterval = null;
  }
}

/**
 * Stop program but continue cooling simulation
 */
function stopSimulation() {
  state.heatPercent = 0;
  state.setTemp = 0;  // Reset target temperature
  
  // If already at room temp, stop the loop
  if (Math.abs(state.kilnTemp - state.envTemp) < 1) {
    state.tempChange = 0;
    stopSimulationLoop();
  } else {
    // Start cooling simulation if not already running
    if (!simulationInterval) {
      startSimulationLoop();
    }
  }
  
  emitStateChange();
}

/**
 * Convert time object to total minutes
 */
function timeToMinutes(time) {
  return (time.hours || 0) * 60 + (time.minutes || 0) + (time.seconds || 0) / 60;
}

/**
 * Parse a program file (JSON format)
 * Returns array of { target, ramp, dwell } objects (ramp/dwell in minutes)
 */
function parseProgram(content) {
  try {
    // Try to parse as JSON first
    const program = JSON.parse(content);
    
    if (!program.segments || !Array.isArray(program.segments)) {
      throw new Error('Invalid program format: missing segments array');
    }
    
    return program.segments.map(seg => ({
      target: seg.target,
      ramp: timeToMinutes(seg.ramp_time),
      dwell: timeToMinutes(seg.dwell_time)
    }));
  } catch (e) {
    // Fallback to old text format for backwards compatibility
    const segments = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Remove inline comments
      const cleanLine = trimmed.split('#')[0].trim();
      const parts = cleanLine.split(':').map(p => parseFloat(p.trim()));
      
      if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        segments.push({
          target: parts[0],  // Target temperature
          ramp: parts[1],    // Minutes to reach target
          dwell: parts[2]    // Minutes to hold at target
        });
      }
    }
    
    return segments;
  }
}

/**
 * Calculate program timing
 * Returns { totalMinutes, segmentTimes: [{ start, end, segment }] }
 */
function calculateProgramTiming(segments) {
  let currentMinute = 0;
  const segmentTimes = [];
  
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segmentDuration = seg.ramp + seg.dwell;
    
    segmentTimes.push({
      segment: i + 1,
      startMinute: currentMinute,
      endMinute: currentMinute + segmentDuration,
      rampEnd: currentMinute + seg.ramp,
      target: seg.target,
      ramp: seg.ramp,
      dwell: seg.dwell
    });
    
    currentMinute += segmentDuration;
  }
  
  return {
    totalMinutes: currentMinute,
    segmentTimes
  };
}

/**
 * Find start point from minute offset
 * Returns { segment, minuteIntoSegment, startTemp }
 */
function findStartPointByMinute(segments, minute) {
  const timing = calculateProgramTiming(segments);
  
  for (const seg of timing.segmentTimes) {
    if (minute >= seg.startMinute && minute < seg.endMinute) {
      return {
        segment: seg.segment,
        minuteIntoSegment: minute - seg.startMinute,
        segmentInfo: seg
      };
    }
  }
  
  // If minute is beyond program, return last segment
  if (timing.segmentTimes.length > 0) {
    const lastSeg = timing.segmentTimes[timing.segmentTimes.length - 1];
    return {
      segment: lastSeg.segment,
      minuteIntoSegment: 0,
      segmentInfo: lastSeg
    };
  }
  
  return null;
}

/**
 * Execute a command (from WebSocket or HTTP)
 * Returns { success: boolean, error?: string }
 */
function executeCommand(action, params = {}) {
  switch (action) {
    case 'start':
      if (state.programStatus === PROGRAM_STATUS.NONE) {
        return { success: false, error: 'No program loaded' };
      }
      
      // Parse program to handle segment/minute parameters
      // Use stored content or fallback to in-memory programs
      const programContent = state.loadedProgramContent || programs[state.loadedProgram];
      if (!programContent) {
        return { success: false, error: 'Program not found' };
      }
      
      const segments = parseProgram(programContent);
      const timing = calculateProgramTiming(segments);
      
      // Determine start point
      let startSegment = 1;
      let startInfo = null;
      
      if (params.segment !== undefined) {
        // Start from specific segment
        const seg = parseInt(params.segment, 10);
        if (isNaN(seg) || seg < 1 || seg > segments.length) {
          return { success: false, error: `Invalid segment. Must be 1-${segments.length}` };
        }
        startSegment = seg;
        startInfo = { fromSegment: seg };
      } else if (params.minute !== undefined) {
        // Start from specific minute
        const minute = parseInt(params.minute, 10);
        if (isNaN(minute) || minute < 0 || minute >= timing.totalMinutes) {
          return { success: false, error: `Invalid minute. Program duration is ${timing.totalMinutes} minutes` };
        }
        const startPoint = findStartPointByMinute(segments, minute);
        if (startPoint) {
          startSegment = startPoint.segment;
          startInfo = { fromMinute: minute, segment: startSegment };
        }
      }
      
      state.currentStep = startSegment;
      state.totalSteps = segments.length;
      state.programStatus = PROGRAM_STATUS.RUNNING;
      
      // Set initial target temperature for the starting segment
      if (segments[startSegment - 1]) {
        state.setTemp = segments[startSegment - 1].target;
      }
      
      addHistoryMarker('start', startInfo || state.loadedProgram);
      startSimulation();
      return { success: true, startSegment, totalSegments: segments.length };
      
    case 'resume':
      if (state.programStatus !== PROGRAM_STATUS.PAUSED) {
        return { success: false, error: 'Program not paused' };
      }
      state.programStatus = PROGRAM_STATUS.RUNNING;
      addHistoryMarker('resume');
      emitStateChange();
      return { success: true };
      
    case 'pause':
      if (state.programStatus !== PROGRAM_STATUS.RUNNING) {
        return { success: false, error: 'Program not running' };
      }
      state.programStatus = PROGRAM_STATUS.PAUSED;
      addHistoryMarker('pause');
      emitStateChange();
      return { success: true };
      
    case 'stop':
      addHistoryMarker('stop');
      state.programStatus = PROGRAM_STATUS.STOPPED;
      stopSimulation();
      return { success: true };
      
    case 'load': {
      const filename = params.program || params.filename;
      if (!filename) {
        return { success: false, error: 'No program specified' };
      }
      
      // Get program content (from params or in-memory)
      const programContent = params.content || programs[filename];
      if (!programContent) {
        return { success: false, error: 'Program not found' };
      }
      
      state.loadedProgram = filename;
      state.loadedProgramContent = programContent;  // Store content for later use
      state.programStatus = PROGRAM_STATUS.READY;
      state.currentStep = 0;
      
      // Parse program to get total steps
      const segments = parseProgram(programContent);
      state.totalSteps = segments.length;
      
      emitStateChange();
      return { success: true };
    }
      
    case 'set_temp':
    case 'setTemp':
      const temp = parseFloat(params.temperature ?? params.temp);
      if (isNaN(temp)) {
        return { success: false, error: 'Invalid temperature value' };
      }
      if (temp < preferences.MIN_Temperature || temp > preferences.MAX_Temperature) {
        return { success: false, error: `Temperature must be between ${preferences.MIN_Temperature} and ${preferences.MAX_Temperature}` };
      }
      
      const prevTemp = state.setTemp;
      state.setTemp = temp;
      
      // If no program running, start manual hold mode
      if (state.programStatus === PROGRAM_STATUS.NONE || 
          state.programStatus === PROGRAM_STATUS.READY ||
          state.programStatus === PROGRAM_STATUS.STOPPED ||
          state.programStatus === PROGRAM_STATUS.FINISHED ||
          state.programStatus === PROGRAM_STATUS.ABORTED) {
        state.loadedProgram = '(manual hold)';
        state.programStatus = PROGRAM_STATUS.RUNNING;
        state.currentStep = 1;
        state.totalSteps = 1;
        state.programStartTime = new Date();
        state.programEndTime = null; // Indefinite hold
        addHistoryMarker('start', '(manual hold)');
        startSimulation();
      } else {
        // Program running - record target change
        addHistoryMarker('target', temp);
      }
      
      emitStateChange();
      return { success: true, temperature: temp };
      
    default:
      return { success: false, error: 'Unknown action' };
  }
}

/**
 * Record a step completion marker
 */
function recordStepComplete(stepNumber) {
  addHistoryMarker('step', stepNumber);
}

/**
 * Generate PIDKiln_vars.json response (legacy format)
 */
function getVarsJson() {
  const s = getState();
  return {
    program_status: s.program_status,
    log_file: s.program_status >= PROGRAM_STATUS.RUNNING ? `/logs/${new Date().toISOString().slice(0,10)}_${state.loadedProgram.replace('.txt', '')}.csv` : '',
    pidkiln: [
      { html_id: '#kiln_temp', value: s.kiln_temp.toString() },
      { html_id: '#set_temp', value: s.set_temp.toString() },
      { html_id: '#env_temp', value: s.env_temp.toString() },
      { html_id: '#case_temp', value: s.case_temp.toString() },
      { html_id: '#prog_start', value: s.prog_start },
      { html_id: '#prog_end', value: s.prog_end },
      { html_id: '#curr_time', value: s.curr_time },
      { html_id: '#heat_time', value: s.heat_percent.toString() },
      { html_id: '#temp_change', value: s.temp_change.toString() },
      { html_id: '#step', value: s.step }
    ]
  };
}

/**
 * Sample program files (stored in memory)
 */
const programs = {
  'program1.txt': `# Short, clear description of the program.
# Full description on as many lines you wish -
#   just remember about default program limit - 10KiB
# Program parameters target temperature in Celcius:minutes to achieve this temperature:dwelling time in minutes
95:30:20
134:20:30
# You can add as many comments as you wish
97:80:30
360:180:20
600:100:30 # You can even comment each line
970:120:50
600:90:0 # But in program you can use only numbers and : sign. Max value for temperature is 1350C`,

  'program2.txt': `# Test program 2
# Simple two-step program
100:30:10
200:60:30`,

  '500c_10m_2h.txt': `# Reach 500C in 10 minutes, hold for 2 hours
500:10:120`,

  'test_lowtemp.txt': `# Low temperature test
# For testing at safe temperatures
50:10:5
75:10:5
100:15:10
75:15:0`,

  'test_up_down.txt': `# Up and down test
100:20:10
200:20:10
100:30:10
200:20:10
50:60:0`,

  'pristige_optima.txt': `# Prestige Optima firing schedule
# Standard cone 06 bisque
93:60:60
260:120:0
537:120:30
1000:180:15`,

  'vfail1.txt': `# Validation fail test 1
# Invalid: temperature too high
1500:60:30`,

  'vfail2.txt': `# Validation fail test 2
# Invalid format test
abc:60:30`
};

/**
 * Sample log files
 */
function generateLogCsv() {
  const lines = ['Date,Temperature,Set,Power'];
  const now = Date.now();
  for (let i = 0; i < 100; i++) {
    const time = new Date(now - (100 - i) * 60000);
    const temp = 25 + i * 2 + Math.random() * 2;
    const set = 25 + i * 2;
    const power = Math.max(0, Math.min(100, (set - temp + 10) * 10));
    lines.push(`${time.toISOString()},${temp.toFixed(1)},${set.toFixed(1)},${power.toFixed(0)}`);
  }
  return lines.join('\n');
}

const logs = {
  '2024-01-15_program1.csv': generateLogCsv(),
  '2024-01-14_test.csv': generateLogCsv(),
  '2024-01-10_bisque.csv': generateLogCsv()
};

/**
 * Default preferences (parsed from pidkiln.conf format)
 */
const preferences = {
  WiFi_SSID: 'MyNetwork',
  WiFi_Password: 'secret123',
  WiFi_Retry_cnt: 9,
  WiFi_Mode: 1,
  HTTP_Local_JS: 1,
  Auth_Username: 'admin',
  Auth_Password: 'hotashell',
  NTP_Server1: '0.pl.pool.ntp.org',
  NTP_Server2: '1.pl.pool.ntp.org',
  NTP_Server3: '2.pl.pool.ntp.org',
  GMT_Offset_sec: 3600,
  Daylight_Offset_sec: 3600,
  Initial_Date: '2022-05-30',
  Initial_Time: '11:00:00',
  PID_Window: 5000,
  PID_Kp: 20,
  PID_Ki: 0.2,
  PID_Kd: 0.1,
  PID_POE: 0,
  PID_Temp_Threshold: -1,
  LOG_Window: 10,
  LOG_Files_Limit: 40,
  DBG_Serial: 1,
  DBG_Syslog: 0,
  DBG_Syslog_Srv: '192.168.1.2',
  DBG_Syslog_Port: 514,
  MIN_Temperature: 10,
  MAX_Temperature: 1350,
  MAX_Housing_Temperature: 130,
  Thermal_Runaway: 0,
  Alarm_Timeout: 5,
  MAX31855_Error_Grace_Count: 5
};

/**
 * Debug/system info
 */
const debugInfo = {
  CHIP_ID: 'ESP32-D0WDQ6',
  CHIP_REV: '1',
  CHIP_REVF: '1',
  CHIP_MODEL: 'ESP32',
  CHIP_CORES: '2',
  CPU_FREQ: '240',
  SDK_VERSION: 'v4.4.4',
  MAC_ADDRESS: 'AA:BB:CC:DD:EE:FF',
  SFLASH_RAM: '4',
  FLASH_FREQ: '80',
  FLASH_MODE: 'QIO',
  SKETCH_SIZE: '1234',
  SKETCH_TOTAL: '1966',
  TOTAL_PSRAM: '4096',
  FREE_PSRAM: '3800',
  SMALEST_PSRAM: '3500',
  LARGEST_PSRAM: '3700',
  TOTAL_HEAP: '320',
  FREE_HEAP: '180',
  SMALEST_HEAP: '150',
  LARGEST_HEAP: '170',
  TOTAL_KB: '1500',
  USED_KB: '450',
  VERSION: 'PIDKiln v1.2.3 (Simulator)'
};

// Initialize history recording and generate initial data
generateInitialHistory();
startHistoryRecording();

module.exports = {
  PROGRAM_STATUS,
  state,
  stateEmitter,
  getState,
  getLogPoint,
  getVarsJson,
  executeCommand,
  programs,
  logs,
  preferences,
  debugInfo,
  startSimulation,
  stopSimulation,
  stopSimulationLoop,
  // History functions
  getHistory,
  addHistoryMarker,
  recordStepComplete,
  // Program parsing
  parseProgram,
  calculateProgramTiming
};

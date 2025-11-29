/**
 * Mock data generators for Furnace simulator
 * Simulates ESP32 responses for frontend development
 */

import { EventEmitter } from 'events';
import { getTimeScale, getThermalConfig, getTickIntervalMs, setTimeScale as configSetTimeScale } from './config.js';

// Event emitter for state changes
export const stateEmitter = new EventEmitter();

// Program status constants (matches pidkiln.h)
export const PROGRAM_STATUS = {
  NONE: 0,
  READY: 1,
  RUNNING: 2,
  PAUSED: 3,
  STOPPED: 4,
  ERROR: 5,
  WAITING_THRESHOLD: 6,
  FINISHED: 7
} as const;

export type ProgramStatusCode = typeof PROGRAM_STATUS[keyof typeof PROGRAM_STATUS];

// Types
interface SimulatorState {
  programStatus: ProgramStatusCode;
  loadedProgram: string | null;
  loadedProgramContent: string | null;
  kilnTemp: number;
  setTemp: number;
  envTemp: number;
  caseTemp: number;
  heatPercent: number;
  tempChange: number;
  currentStep: number;
  totalSteps: number;
  programStartTime: number | null;  // Simulated time ms
  programEndTime: number | null;    // Simulated time ms
  programStartTemp: number;         // Kiln temp when program started (for first segment ramp)
  errorMessage: string | null;      // Error reason when in ERROR state
}

interface HistoryMarker {
  type: string;
  value?: string | number | Record<string, unknown>;
}

interface HistoryPoint {
  t: number;
  k: number;
  s: number;
  p: number;
  e: number;
  c: number;
  m?: HistoryMarker;
}

interface TimeValue {
  hours?: number;
  minutes?: number;
  seconds?: number;
}

interface ProgramSegment {
  target: number;
  ramp_time: TimeValue;
  dwell_time: TimeValue;
}

interface ParsedSegment {
  target: number;
  ramp: number;
  dwell: number;
}

interface SegmentTiming {
  segment: number;
  startMinute: number;
  endMinute: number;
  rampEnd: number;
  target: number;
  ramp: number;
  dwell: number;
}

interface ProgramTiming {
  totalMinutes: number;
  segmentTimes: SegmentTiming[];
}

interface CommandResult {
  success: boolean;
  error?: string;
  temperature?: number;
  startSegment?: number;
  totalSegments?: number;
}

interface CommandParams {
  program?: string;
  filename?: string;
  content?: string;
  segment?: number | string;
  minute?: number | string;
  temperature?: number | string;
  temp?: number | string;
}

// =============================================================================
// Simulated Time
// =============================================================================

// Simulated time starts at real time and advances at timeScale rate
let simulatedTimeMs = Date.now();
let lastRealTimeMs = Date.now();

/**
 * Get current simulated time in milliseconds
 */
export function getSimulatedTime(): number {
  return simulatedTimeMs;
}

/**
 * Advance simulated time based on real elapsed time and time scale
 */
function advanceSimulatedTime(): void {
  const now = Date.now();
  const realElapsed = now - lastRealTimeMs;
  // Round to integer to avoid BigInt conversion errors
  const simulatedElapsed = Math.round(realElapsed * getTimeScale());
  simulatedTimeMs = Math.round(simulatedTimeMs + simulatedElapsed);
  lastRealTimeMs = now;
}


/**
 * Format simulated date for display
 */
function formatSimulatedTime(ms: number | null): string {
  if (!ms) return '-';
  const d = new Date(ms);
  return d.toLocaleString('en-GB', { 
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).replace(',', '');
}

/**
 * Set time scale (exposed for API)
 */
export function setTimeScale(scale: number): void {
  // Sync simulated time before changing scale
  advanceSimulatedTime();
  configSetTimeScale(scale);
}

// =============================================================================
// Simulator State
// =============================================================================

export const state: SimulatorState = {
  programStatus: PROGRAM_STATUS.NONE,
  loadedProgram: null,
  loadedProgramContent: null,
  kilnTemp: 20.0,  // Start at ambient
  setTemp: 0,
  envTemp: 20.0,
  caseTemp: 25.0,
  heatPercent: 0,
  tempChange: 0.0,
  currentStep: 0,
  totalSteps: 0,
  programStartTime: null,
  programEndTime: null,
  programStartTemp: 0,
  errorMessage: null
};

// Temperature history buffer (24h at 10s intervals = max 8640 points)
const HISTORY_INTERVAL_SIMULATED_MS = 10000; // 10 simulated seconds
const HISTORY_MAX_AGE_SIMULATED_MS = 24 * 60 * 60 * 1000; // 24 simulated hours
const HISTORY_MAX_POINTS = Math.ceil(HISTORY_MAX_AGE_SIMULATED_MS / HISTORY_INTERVAL_SIMULATED_MS);

const temperatureHistory: HistoryPoint[] = [];
let lastHistoryTime = 0;

// PID controller state
let pidIntegral = 0;
let pidLastError = 0;

// PID tuning constants
const PID_KP = 5.0;    // Proportional gain
const PID_KI = 0.02;   // Integral gain
const PID_KD = 1.0;    // Derivative gain
const PID_INTEGRAL_MAX = 100;  // Anti-windup limit

// Simulation intervals
let simulationInterval: ReturnType<typeof setInterval> | null = null;
let broadcastInterval: ReturnType<typeof setInterval> | null = null;

// =============================================================================
// Temperature History
// =============================================================================

/**
 * Record a history point at current simulated time
 */
function recordHistoryPoint(marker: HistoryMarker | null = null): void {
  const point: HistoryPoint = {
    t: simulatedTimeMs,
    k: parseFloat(state.kilnTemp.toFixed(1)),
    s: parseFloat(state.setTemp.toFixed(1)),
    p: state.heatPercent,
    e: parseFloat(state.envTemp.toFixed(1)),
    c: parseFloat(state.caseTemp.toFixed(1))
  };
  
  if (marker) {
    point.m = marker;
  }
  
  temperatureHistory.push(point);
  
  // Trim old data (based on simulated time)
  const cutoff = simulatedTimeMs - HISTORY_MAX_AGE_SIMULATED_MS;
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
function addHistoryMarker(type: string, value: string | number | Record<string, unknown> | null = null): void {
  const marker: HistoryMarker = { type };
  if (value !== null) {
    marker.value = value;
  }
  recordHistoryPoint(marker);
}

/**
 * Check if we should record a history point (every 10 simulated seconds)
 */
function maybeRecordHistory(): void {
  if (simulatedTimeMs - lastHistoryTime >= HISTORY_INTERVAL_SIMULATED_MS) {
    recordHistoryPoint();
    lastHistoryTime = simulatedTimeMs;
  }
}

/**
 * Get temperature history
 */
export function getHistory(): HistoryPoint[] {
  return temperatureHistory;
}

/**
 * Generate initial history data (for demo purposes)
 * Creates ~1 simulated hour of past data
 */
function generateInitialHistory(): void {
  const thermal = getThermalConfig();
  const now = simulatedTimeMs;
  const oneHourAgo = now - 60 * 60 * 1000;
  
  let temp = thermal.ambientTemp;
  for (let t = oneHourAgo; t < now; t += HISTORY_INTERVAL_SIMULATED_MS) {
    // Simulate some temperature variation around ambient
    temp += (Math.random() - 0.5) * 0.5;
    temp = Math.max(thermal.ambientTemp - 2, Math.min(thermal.ambientTemp + 2, temp));
    
    temperatureHistory.push({
      t,
      k: parseFloat(temp.toFixed(1)),
      s: 0,
      p: 0,
      e: parseFloat((thermal.ambientTemp + (Math.random() - 0.5) * thermal.ambientVariation).toFixed(1)),
      c: parseFloat((thermal.caseBaseTemp + (Math.random() - 0.5) * 0.5).toFixed(1))
    });
  }
  
  lastHistoryTime = now;
}

// =============================================================================
// State Getters
// =============================================================================

/**
 * Get current state as object (for WebSocket broadcast)
 */
export function getState(): Record<string, unknown> {
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
    prog_start: formatSimulatedTime(state.programStartTime),
    prog_end: formatSimulatedTime(state.programEndTime),
    curr_time: formatSimulatedTime(simulatedTimeMs),
    error_message: state.errorMessage,
    // Simulator-specific fields
    is_simulator: true,
    time_scale: getTimeScale(),
    curr_time_ms: simulatedTimeMs,
  };
}

/**
 * Get log data point (for WebSocket broadcast during program run)
 */
export function getLogPoint(): Record<string, unknown> {
  return {
    timestamp: new Date(simulatedTimeMs).toISOString(),
    kiln_temp: parseFloat(state.kilnTemp.toFixed(1)),
    set_temp: parseFloat(state.setTemp.toFixed(1)),
    power: state.heatPercent
  };
}

/**
 * Emit state change event
 */
function emitStateChange(): void {
  stateEmitter.emit('state', getState());
}

/**
 * Emit log data point
 */
function emitLogPoint(): void {
  stateEmitter.emit('log', getLogPoint());
}

// =============================================================================
// Thermal Simulation
// =============================================================================

/**
 * Calculate temperature change for one simulation tick
 * Uses realistic thermal model with configurable parameters
 */
function simulateThermalTick(): void {
  const thermal = getThermalConfig();
  const timeScale = getTimeScale();
  
  // Simulated seconds per real tick
  const simulatedSeconds = (getTickIntervalMs() / 1000) * timeScale;
  
  const isRunning = state.programStatus === PROGRAM_STATUS.RUNNING;
  const coolingStatuses: ProgramStatusCode[] = [
    PROGRAM_STATUS.STOPPED,
    PROGRAM_STATUS.ERROR,
    PROGRAM_STATUS.FINISHED
  ];
  const isCooling = coolingStatuses.includes(state.programStatus);
  
  // Calculate heat input using PID controller
  let heatInput = 0;
  if (isRunning && state.setTemp > 0) {
    // PID controller
    const error = state.setTemp - state.kilnTemp;
    
    // Proportional term
    const pTerm = PID_KP * error;
    
    // Integral term (with anti-windup)
    pidIntegral += error * simulatedSeconds;
    pidIntegral = Math.max(-PID_INTEGRAL_MAX, Math.min(PID_INTEGRAL_MAX, pidIntegral));
    const iTerm = PID_KI * pidIntegral;
    
    // Derivative term
    const dTerm = PID_KD * (error - pidLastError) / simulatedSeconds;
    pidLastError = error;
    
    // Combined PID output (0-100%)
    const pidOutput = pTerm + iTerm + dTerm;
    state.heatPercent = Math.max(0, Math.min(100, Math.round(pidOutput)));
    
    heatInput = thermal.heaterPower * (state.heatPercent / 100);
  } else if (isCooling) {
    // Reset PID state when not running
    pidIntegral = 0;
    pidLastError = 0;
    state.heatPercent = 0;
    heatInput = 0;
  } else {
    // Not running, not cooling - reset PID
    pidIntegral = 0;
    pidLastError = 0;
    state.heatPercent = 0;
    heatInput = 0;
  }
  
  // Calculate heat loss (Newton's law of cooling)
  const tempDiff = state.kilnTemp - thermal.ambientTemp;
  const heatLoss = thermal.coolingCoefficient * tempDiff;
  
  // Net temperature change
  const netChange = (heatInput - heatLoss) * simulatedSeconds / thermal.thermalMass;
  state.kilnTemp += netChange;
  
  // Calculate rate of change in °C/hour (for display)
  state.tempChange = parseFloat((netChange * 3600 / simulatedSeconds).toFixed(1));
  
  // Update case temperature based on kiln temp
  const caseHeatFromKiln = (state.kilnTemp - thermal.ambientTemp) * thermal.caseHeatTransfer;
  state.caseTemp = thermal.caseBaseTemp + caseHeatFromKiln;
  
  // Add some random variation to env temp
  state.envTemp = thermal.ambientTemp + (Math.random() - 0.5) * thermal.ambientVariation;
  
  // Stop cooling simulation if close enough to ambient
  if (isCooling && Math.abs(state.kilnTemp - thermal.ambientTemp) < 0.5) {
    state.kilnTemp = thermal.ambientTemp;
    state.tempChange = 0;
    stopSimulationLoop();
  }
}

/**
 * Start simulation (called when program starts)
 */
export function startSimulation(): void {
  // Always update start time when a program starts (even if restarting)
  state.programStartTime = simulatedTimeMs;
  // Capture the kiln temperature at program start (for first segment ramp)
  state.programStartTemp = state.kilnTemp;
  // Estimate end time (will be updated as program runs)
  state.programEndTime = simulatedTimeMs + 4 * 60 * 60 * 1000;
  
  // Only start the loop if not already running
  if (!simulationInterval) {
    startSimulationLoop();
  }
}

/**
 * Update program progress - calculates current segment and target temperature
 */
function updateProgramProgress(): void {
  if (state.programStatus !== PROGRAM_STATUS.RUNNING || !state.programStartTime) {
    return;
  }
  
  const programContent = state.loadedProgramContent;
  if (!programContent) return;
  
  const segments = parseProgram(programContent);
  if (segments.length === 0) return;
  
  const timing = calculateProgramTiming(segments);
  const elapsedMs = simulatedTimeMs - state.programStartTime;
  const elapsedMinutes = elapsedMs / 60000;
  
  // Check if program is complete
  if (elapsedMinutes >= timing.totalMinutes) {
    state.programStatus = PROGRAM_STATUS.FINISHED;
    state.setTemp = 0;
    state.currentStep = timing.segmentTimes.length;
    addHistoryMarker('finish');
    stopSimulation();
    return;
  }
  
  // Find current segment
  let currentSegment: SegmentTiming | null = null;
  for (const seg of timing.segmentTimes) {
    if (elapsedMinutes >= seg.startMinute && elapsedMinutes < seg.endMinute) {
      currentSegment = seg;
      break;
    }
  }
  
  if (!currentSegment) return;
  
  // Update current step
  const newStep = currentSegment.segment;
  if (newStep !== state.currentStep) {
    // Step changed - record marker for completed step
    if (state.currentStep > 0 && state.currentStep < newStep) {
      recordStepComplete(state.currentStep);
    }
    state.currentStep = newStep;
  }
  
  // Calculate target temperature based on position in segment
  const minuteInSegment = elapsedMinutes - currentSegment.startMinute;
  
  if (currentSegment.ramp > 0 && minuteInSegment < currentSegment.ramp) {
    // During ramp phase - linearly interpolate from previous target to current target
    const prevTarget = currentSegment.segment === 1 
      ? state.programStartTemp  // First segment ramps from kiln temp at program start
      : timing.segmentTimes[currentSegment.segment - 2]?.target ?? 0;
    const rampProgress = minuteInSegment / currentSegment.ramp;
    state.setTemp = prevTarget + (currentSegment.target - prevTarget) * rampProgress;
  } else {
    // Ramp time is 0 OR we're past ramp (in dwell phase) - hold at target
    state.setTemp = currentSegment.target;
  }
  
  // Update estimated end time
  state.programEndTime = state.programStartTime + timing.totalMinutes * 60000;
}

/**
 * Start the simulation loop (handles both heating and cooling)
 */
function startSimulationLoop(): void {
  if (simulationInterval) return;
  
  const tickInterval = getTickIntervalMs();
  
  // Simulation tick - update temperatures
  simulationInterval = setInterval(() => {
    // Advance simulated time
    advanceSimulatedTime();
    
    // Update program progress (target temp, current step)
    updateProgramProgress();
    
    // Run thermal simulation
    simulateThermalTick();
    
    // Record history if enough simulated time has passed
    maybeRecordHistory();
  }, tickInterval);
  
  // Broadcast state every tick
  broadcastInterval = setInterval(() => {
    emitStateChange();
    
    // Also emit log point during running state
    if (state.programStatus === PROGRAM_STATUS.RUNNING) {
      emitLogPoint();
    }
  }, tickInterval);
  
  emitStateChange();
}

/**
 * Stop the simulation loop completely
 */
export function stopSimulationLoop(): void {
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
export function stopSimulation(): void {
  state.heatPercent = 0;
  state.setTemp = 0;
  
  const thermal = getThermalConfig();
  
  // If already at room temp, stop the loop
  if (Math.abs(state.kilnTemp - thermal.ambientTemp) < 1) {
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
 * Set error state with message
 */
export function setError(message: string): void {
  state.programStatus = PROGRAM_STATUS.ERROR;
  state.errorMessage = message;
  state.heatPercent = 0;
  addHistoryMarker('error', message);
  
  // Continue cooling simulation
  const thermal = getThermalConfig();
  if (Math.abs(state.kilnTemp - thermal.ambientTemp) >= 1 && !simulationInterval) {
    startSimulationLoop();
  }
  
  emitStateChange();
}

/**
 * Clear error state - returns to STOPPED
 */
export function clearError(): void {
  if (state.programStatus !== PROGRAM_STATUS.ERROR) {
    return;
  }
  state.programStatus = PROGRAM_STATUS.STOPPED;
  state.errorMessage = null;
  emitStateChange();
}

// =============================================================================
// Program Parsing
// =============================================================================

/**
 * Convert time object to total minutes
 */
function timeToMinutes(time: TimeValue): number {
  return (time.hours || 0) * 60 + (time.minutes || 0) + (time.seconds || 0) / 60;
}

/**
 * Parse a program file (JSON format)
 * Returns array of { target, ramp, dwell } objects (ramp/dwell in minutes)
 */
export function parseProgram(content: string): ParsedSegment[] {
  try {
    const program = JSON.parse(content) as { segments?: ProgramSegment[]; description?: string };
    
    if (!program.segments || !Array.isArray(program.segments)) {
      throw new Error('Invalid program format: missing segments array');
    }
    
    return program.segments.map(seg => ({
      target: seg.target,
      ramp: timeToMinutes(seg.ramp_time),
      dwell: timeToMinutes(seg.dwell_time)
    }));
  } catch {
    // Fallback to old text format for backwards compatibility
    const segments: ParsedSegment[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const cleanLine = trimmed.split('#')[0].trim();
      const parts = cleanLine.split(':').map(p => parseFloat(p.trim()));
      
      if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        segments.push({
          target: parts[0],
          ramp: parts[1],
          dwell: parts[2]
        });
      }
    }
    
    return segments;
  }
}

/**
 * Calculate program timing
 */
export function calculateProgramTiming(segments: ParsedSegment[]): ProgramTiming {
  let currentMinute = 0;
  const segmentTimes: SegmentTiming[] = [];
  
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
 */
function findStartPointByMinute(segments: ParsedSegment[], minute: number): { segment: number; minuteIntoSegment: number; segmentInfo: SegmentTiming } | null {
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

// =============================================================================
// Command Execution
// =============================================================================

/**
 * Execute a command (from WebSocket or HTTP)
 */
export function executeCommand(action: string, params: CommandParams = {}): CommandResult {
  switch (action) {
    case 'start': {
      if (state.programStatus === PROGRAM_STATUS.NONE) {
        return { success: false, error: 'No program loaded' };
      }
      
      const programContent = state.loadedProgramContent || (state.loadedProgram ? programs[state.loadedProgram] : null);
      if (!programContent) {
        return { success: false, error: 'Program not found' };
      }
      
      const segments = parseProgram(programContent);
      const timing = calculateProgramTiming(segments);
      
      let startSegment = 1;
      let startInfo: Record<string, unknown> | null = null;
      
      if (params.segment !== undefined) {
        const seg = parseInt(String(params.segment), 10);
        if (isNaN(seg) || seg < 1 || seg > segments.length) {
          return { success: false, error: `Invalid segment. Must be 1-${segments.length}` };
        }
        startSegment = seg;
        startInfo = { fromSegment: seg };
      } else if (params.minute !== undefined) {
        const minute = parseInt(String(params.minute), 10);
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
      
      if (segments[startSegment - 1]) {
        state.setTemp = segments[startSegment - 1].target;
      }
      
      addHistoryMarker('start', startInfo || state.loadedProgram || undefined);
      startSimulation();
      return { success: true, startSegment, totalSegments: segments.length };
    }
      
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
      
      const programContent = params.content || programs[filename];
      if (!programContent) {
        return { success: false, error: 'Program not found' };
      }
      
      state.loadedProgram = filename;
      state.loadedProgramContent = programContent;
      state.programStatus = PROGRAM_STATUS.READY;
      state.currentStep = 0;
      // Clear start/end times - will be set when program actually starts
      state.programStartTime = null;
      state.programEndTime = null;
      
      const segments = parseProgram(programContent);
      state.totalSteps = segments.length;
      
      emitStateChange();
      return { success: true };
    }
    
    case 'unload':
      if (state.programStatus === PROGRAM_STATUS.RUNNING) {
        return { success: false, error: 'Cannot unload while program is running' };
      }
      state.loadedProgram = null;
      state.loadedProgramContent = null;
      state.programStatus = PROGRAM_STATUS.NONE;
      state.currentStep = 0;
      state.totalSteps = 0;
      emitStateChange();
      return { success: true };
      
    case 'set_temp':
    case 'setTemp': {
      const temp = parseFloat(String(params.temperature ?? params.temp));
      if (isNaN(temp)) {
        return { success: false, error: 'Invalid temperature value' };
      }
      const minTemp = Number(preferences.MIN_Temperature);
      const maxTemp = Number(preferences.MAX_Temperature);
      if (temp < minTemp || temp > maxTemp) {
        return { success: false, error: `Temperature must be between ${minTemp} and ${maxTemp}` };
      }
      
      state.setTemp = temp;
      
      if (state.programStatus === PROGRAM_STATUS.NONE || 
          state.programStatus === PROGRAM_STATUS.READY ||
          state.programStatus === PROGRAM_STATUS.STOPPED ||
          state.programStatus === PROGRAM_STATUS.FINISHED ||
          state.programStatus === PROGRAM_STATUS.ERROR) {
        state.loadedProgram = '(manual hold)';
        state.programStatus = PROGRAM_STATUS.RUNNING;
        state.currentStep = 1;
        state.totalSteps = 1;
        state.programStartTime = simulatedTimeMs;
        state.programEndTime = null;
        addHistoryMarker('start', '(manual hold)');
        startSimulation();
      } else {
        addHistoryMarker('target', temp);
      }
      
      emitStateChange();
      return { success: true, temperature: temp };
    }
      
    default:
      return { success: false, error: 'Unknown action' };
  }
}

/**
 * Record a step completion marker
 */
export function recordStepComplete(stepNumber: number): void {
  addHistoryMarker('step', stepNumber);
}

/**
 * Generate PIDKiln_vars.json response (legacy format)
 */
export function getVarsJson(): Record<string, unknown> {
  const s = getState();
  return {
    program_status: s.program_status,
    log_file: (s.program_status as number) >= PROGRAM_STATUS.RUNNING && state.loadedProgram
      ? `/logs/${new Date(simulatedTimeMs).toISOString().slice(0,10)}_${state.loadedProgram.replace('.json', '')}.csv`
      : '',
    pidkiln: [
      { html_id: '#kiln_temp', value: String(s.kiln_temp) },
      { html_id: '#set_temp', value: String(s.set_temp) },
      { html_id: '#env_temp', value: String(s.env_temp) },
      { html_id: '#case_temp', value: String(s.case_temp) },
      { html_id: '#prog_start', value: s.prog_start },
      { html_id: '#prog_end', value: s.prog_end },
      { html_id: '#curr_time', value: s.curr_time },
      { html_id: '#heat_time', value: String(s.heat_percent) },
      { html_id: '#temp_change', value: String(s.temp_change) },
      { html_id: '#step', value: s.step }
    ]
  };
}

// =============================================================================
// Static Data
// =============================================================================

/**
 * Sample program files (stored in memory as fallback)
 */
export const programs: Record<string, string> = {};

/**
 * Sample log files
 */
function generateLogCsv(): string {
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

export const logs: Record<string, string> = {
  '2024-01-15_program1.csv': generateLogCsv(),
  '2024-01-14_test.csv': generateLogCsv(),
  '2024-01-10_bisque.csv': generateLogCsv()
};

/**
 * Default preferences
 */
export const preferences: Record<string, string | number> = {
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
export const debugInfo: Record<string, string> = {
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
  VERSION: 'Furnace v1.0.0 (Simulator)'
};

// =============================================================================
// Initialization
// =============================================================================

// Initialize with thermal config values
const thermal = getThermalConfig();
state.kilnTemp = thermal.ambientTemp;
state.envTemp = thermal.ambientTemp;
state.caseTemp = thermal.caseBaseTemp;

// Generate initial history and start recording
generateInitialHistory();

// Start continuous state broadcast (even when idle)
setInterval(() => {
  // Advance simulated time
  advanceSimulatedTime();
  
  // Add small random variation to env temp
  const thermal = getThermalConfig();
  state.envTemp = thermal.ambientTemp + (Math.random() - 0.5) * thermal.ambientVariation;
  
  // If idle (not running/cooling), add tiny variation to kiln temp too
  if (state.programStatus !== PROGRAM_STATUS.RUNNING && 
      Math.abs(state.kilnTemp - thermal.ambientTemp) < 1) {
    state.kilnTemp = thermal.ambientTemp + (Math.random() - 0.5) * 0.2;
  }
  
  // Record history periodically
  maybeRecordHistory();
  
  emitStateChange();
}, getTickIntervalMs());

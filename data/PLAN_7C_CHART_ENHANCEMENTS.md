# Step 7c: Dashboard Chart Enhancements

## Overview

Enhance the dashboard temperature chart in `data/index.html` with:
1. Pan and zoom controls (mouse + touch)
2. Environment and Case temperature series
3. Program profile overlay
4. Overview bar (minimap)
5. Recenter button

This is a standalone plan extracted from the main SPA plan. All changes are to existing files - no new files needed except downloading one optional library.

---

## Files to Modify

| File | Purpose |
|------|---------|
| `data/index.html` | Main SPA - add chart features |
| `simulator/mock-data.js` | Add env/case temps to history |
| `API.md` | Document new history fields |

---

## Current State

The chart already exists and works. Key existing code in `data/index.html`:

### Chart State Variables (around line 1019)
```javascript
let chart = null;
let chartInitializing = false;
let chartData = {
  timestamps: [],  // Unix seconds
  kilnTemps: [],
  setTemps: [],
  markers: []
};
```

### Chart Initialization Function (around line 1724)
- `initChart()` - Creates uPlot instance
- Uses container `#chartContainer`
- Currently shows 2 series: Kiln (orange `#ff6b4a`) and Target (green `#4ade80`)

### Chart Update Functions
- `loadChartHistory()` - Fetches `/api/history` on load
- `addChartPoint(kilnTemp, setTemp)` - Called on each WebSocket state update
- `updateChartData()` - Pushes data to uPlot

### WebSocket State (already includes env/case temps)
```javascript
// In handleMessage(), state object contains:
state.kiln_temp   // Kiln temperature
state.set_temp    // Target temperature
state.env_temp    // Environment temperature (ALREADY AVAILABLE)
state.case_temp   // Case temperature (ALREADY AVAILABLE)
state.program_name // Currently loaded program
state.program_status // 0=NONE, 1=READY, 2=RUNNING, etc.
```

---

## Task 1: Update Simulator History API

**File:** `simulator/mock-data.js`

### 1.1 Modify `recordHistoryPoint()` (around line 82)

Current:
```javascript
function recordHistoryPoint(marker = null) {
  const point = {
    t: Date.now(),
    k: parseFloat(state.kilnTemp.toFixed(1)),
    s: parseFloat(state.setTemp.toFixed(1)),
    p: state.heatPercent
  };
  // ...
}
```

Change to:
```javascript
function recordHistoryPoint(marker = null) {
  const point = {
    t: Date.now(),
    k: parseFloat(state.kilnTemp.toFixed(1)),
    s: parseFloat(state.setTemp.toFixed(1)),
    p: state.heatPercent,
    e: parseFloat(state.envTemp.toFixed(1)),    // ADD THIS
    c: parseFloat(state.caseTemp.toFixed(1))    // ADD THIS
  };
  // ...
}
```

### 1.2 Modify `generateInitialHistory()` (around line 144)

Current:
```javascript
temperatureHistory.push({
  t,
  k: parseFloat(temp.toFixed(1)),
  s: 0,
  p: 0
});
```

Change to:
```javascript
temperatureHistory.push({
  t,
  k: parseFloat(temp.toFixed(1)),
  s: 0,
  p: 0,
  e: parseFloat((22 + (Math.random() - 0.5) * 0.2).toFixed(1)),  // ADD THIS
  c: parseFloat((28 + (Math.random() - 0.5) * 0.5).toFixed(1))   // ADD THIS
});
```

---

## Task 2: Update API Documentation

**File:** `API.md`

Find the `/api/history` section and add `e` and `c` fields:

```markdown
**Data Point Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `t` | int | Timestamp in milliseconds (Unix epoch) |
| `k` | float | Kiln temperature (°C) |
| `s` | float | Set/target temperature (°C) |
| `p` | int | Heater power (0-100%) |
| `e` | float | Environment temperature (°C) |
| `c` | float | Case/housing temperature (°C) |
| `m` | object | Event marker (optional) |
```

---

## Task 3: Add Environment and Case Temp Series

**File:** `data/index.html`

### 3.1 Update chartData structure (around line 1021)

```javascript
let chartData = {
  timestamps: [],
  kilnTemps: [],
  setTemps: [],
  envTemps: [],    // ADD THIS
  caseTemps: [],   // ADD THIS
  markers: []
};
```

### 3.2 Update chart series in initChart() (around line 1778)

Current series array:
```javascript
series: [
  {},
  { label: 'Kiln', stroke: '#ff6b4a', width: 2, points: { show: false } },
  { label: 'Target', stroke: '#4ade80', width: 2, points: { show: false } }
],
```

Change to:
```javascript
series: [
  {},
  { label: 'Kiln', stroke: '#ff6b4a', width: 2, points: { show: false } },
  { label: 'Target', stroke: '#4ade80', width: 2, points: { show: false } },
  { label: 'Env', stroke: '#888888', width: 1, points: { show: false } },
  { label: 'Case', stroke: '#666666', width: 1, points: { show: false } }
],
```

### 3.3 Update loadChartHistory() (around line 1860)

Add arrays for env and case temps:
```javascript
chartData.envTemps = [];
chartData.caseTemps = [];

for (const point of data.data) {
  if (point.t && point.k !== undefined && point.s !== undefined) {
    chartData.timestamps.push(point.t / 1000);
    chartData.kilnTemps.push(point.k);
    chartData.setTemps.push(point.s);
    chartData.envTemps.push(point.e ?? 22);   // ADD THIS
    chartData.caseTemps.push(point.c ?? 28);  // ADD THIS
    // ... markers code unchanged
  }
}
```

### 3.4 Update addChartPoint() (around line 1891)

Change function signature and body:
```javascript
function addChartPoint(kilnTemp, setTemp, envTemp, caseTemp) {
  if (kilnTemp === undefined || setTemp === undefined) return;
  
  const now = Date.now() / 1000;
  
  chartData.timestamps.push(now);
  chartData.kilnTemps.push(parseFloat(kilnTemp));
  chartData.setTemps.push(parseFloat(setTemp));
  chartData.envTemps.push(parseFloat(envTemp ?? 22));
  chartData.caseTemps.push(parseFloat(caseTemp ?? 28));
  
  // Trim old data
  while (chartData.timestamps.length > CHART_MAX_POINTS) {
    chartData.timestamps.shift();
    chartData.kilnTemps.shift();
    chartData.setTemps.shift();
    chartData.envTemps.shift();
    chartData.caseTemps.shift();
  }
  
  updateChartData();
}
```

### 3.5 Update the call to addChartPoint() in handleMessage() (around line 1148)

```javascript
if (state.kiln_temp !== undefined && state.set_temp !== undefined) {
  addChartPoint(state.kiln_temp, state.set_temp, state.env_temp, state.case_temp);
}
```

### 3.6 Update updateChartData() (around line 1913)

```javascript
function updateChartData() {
  if (!chart) return;
  
  const len = chartData.timestamps.length;
  if (len === 0) return;
  
  chart.setData([
    chartData.timestamps,
    chartData.kilnTemps,
    chartData.setTemps,
    chartData.envTemps,
    chartData.caseTemps
  ]);
}
```

---

## Task 4: Add Pan and Zoom

**File:** `data/index.html`

### 4.1 Add zoom/pan state variables (after chartData declaration)

```javascript
// Chart zoom/pan state
let chartZoomMin = null;  // Current visible min timestamp (seconds)
let chartZoomMax = null;  // Current visible max timestamp (seconds)
const CHART_DEFAULT_WINDOW = 6 * 60 * 60;  // 6 hours in seconds
const CHART_MIN_WINDOW = 30 * 60;          // 30 minutes minimum zoom
```

### 4.2 Enable cursor drag in uPlot options

In the `opts` object inside `initChart()`, add cursor configuration:

```javascript
cursor: {
  show: true,
  drag: {
    x: true,   // Enable horizontal drag to pan
    y: false   // Disable vertical drag
  }
},
hooks: {
  setScale: [
    (u, key) => {
      if (key === 'x') {
        chartZoomMin = u.scales.x.min;
        chartZoomMax = u.scales.x.max;
      }
    }
  ]
}
```

### 4.3 Add wheel zoom handler

After creating the chart in initChart(), add:

```javascript
// Wheel zoom
el.addEventListener('wheel', (e) => {
  if (!chart) return;
  e.preventDefault();
  
  const { left, width } = chart.bbox;
  const cursorX = e.clientX - left;
  const cursorPct = cursorX / width;
  
  const xMin = chart.scales.x.min;
  const xMax = chart.scales.x.max;
  const xRange = xMax - xMin;
  
  // Zoom factor: scroll up = zoom in, scroll down = zoom out
  const factor = e.deltaY > 0 ? 1.2 : 0.8;
  let newRange = xRange * factor;
  
  // Enforce zoom limits
  newRange = Math.max(CHART_MIN_WINDOW, newRange);
  const maxRange = getChartMaxRange();
  newRange = Math.min(maxRange, newRange);
  
  // Calculate new bounds centered on cursor position
  const cursorTime = xMin + xRange * cursorPct;
  const newMin = cursorTime - newRange * cursorPct;
  const newMax = cursorTime + newRange * (1 - cursorPct);
  
  chart.setScale('x', { min: newMin, max: newMax });
}, { passive: false });
```

### 4.4 Add helper function for max range

```javascript
function getChartMaxRange() {
  // Max range = from oldest data to now + 6h (or program end if longer)
  const now = Date.now() / 1000;
  const oldest = chartData.timestamps.length > 0 ? chartData.timestamps[0] : now - 3600;
  const programEnd = getProgramEndTime();  // Will implement in Task 6
  const rightEdge = Math.max(now + 6 * 3600, programEnd);
  return rightEdge - oldest;
}
```

### 4.5 Add touch support for pinch zoom

Add touch event handlers after the wheel handler:

```javascript
// Touch support for pan and pinch zoom
let touchStartX = null;
let touchStartScale = null;
let initialPinchDistance = null;

el.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    // Single touch - prepare for pan
    touchStartX = e.touches[0].clientX;
    touchStartScale = { min: chart.scales.x.min, max: chart.scales.x.max };
  } else if (e.touches.length === 2) {
    // Two touches - prepare for pinch zoom
    initialPinchDistance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    touchStartScale = { min: chart.scales.x.min, max: chart.scales.x.max };
  }
}, { passive: true });

el.addEventListener('touchmove', (e) => {
  if (!chart || !touchStartScale) return;
  
  if (e.touches.length === 1 && touchStartX !== null) {
    // Pan
    e.preventDefault();
    const dx = e.touches[0].clientX - touchStartX;
    const pxPerSec = chart.bbox.width / (touchStartScale.max - touchStartScale.min);
    const dt = dx / pxPerSec;
    
    chart.setScale('x', {
      min: touchStartScale.min - dt,
      max: touchStartScale.max - dt
    });
  } else if (e.touches.length === 2 && initialPinchDistance !== null) {
    // Pinch zoom
    e.preventDefault();
    const currentDistance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const scale = initialPinchDistance / currentDistance;
    const range = (touchStartScale.max - touchStartScale.min) * scale;
    const center = (touchStartScale.min + touchStartScale.max) / 2;
    
    // Enforce limits
    const clampedRange = Math.max(CHART_MIN_WINDOW, Math.min(getChartMaxRange(), range));
    
    chart.setScale('x', {
      min: center - clampedRange / 2,
      max: center + clampedRange / 2
    });
  }
}, { passive: false });

el.addEventListener('touchend', () => {
  touchStartX = null;
  touchStartScale = null;
  initialPinchDistance = null;
}, { passive: true });
```

---

## Task 5: Add Recenter Button

**File:** `data/index.html`

### 5.1 Add button to HTML (in the chart card, around line 832)

Change:
```html
<div class="card" style="margin-top: 1rem;">
  <div class="card-title">Temperature History</div>
  <div id="chartContainer" style="width: 100%; height: 300px;"></div>
</div>
```

To:
```html
<div class="card" style="margin-top: 1rem;">
  <div class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
    <span>Temperature History</span>
    <button class="btn-small" onclick="recenterChart()">⟲ Recenter</button>
  </div>
  <div id="chartContainer" style="width: 100%; height: 300px;"></div>
  <div id="chartOverview" style="width: 100%; height: 40px; margin-top: 8px;"></div>
</div>
```

### 5.2 Add recenterChart() function

```javascript
function recenterChart() {
  if (!chart) return;
  
  const now = Date.now() / 1000;
  const windowSize = CHART_DEFAULT_WINDOW;  // 6 hours
  
  // Position "now" at 70% from left, showing some future space
  const min = now - windowSize * 0.7;
  const max = now + windowSize * 0.3;
  
  chart.setScale('x', { min, max });
}
```

---

## Task 6: Add Program Profile Overlay

**File:** `data/index.html`

### 6.1 Add program profile state variables

```javascript
// Program profile state
let programProfile = null;        // { name, startTime, segments, data }
let programProfileLocked = false; // true when program is running/stopped
```

### 6.2 Add program profile series to chart

In the series array, add after case temp:
```javascript
{
  label: 'Program',
  stroke: '#22d3ee',  // Cyan
  width: 2,
  dash: [5, 5],       // Dashed line
  points: { show: false }
}
```

### 6.3 Add function to build program profile data

```javascript
async function loadProgramProfile(programName) {
  if (!programName || programName === '(manual hold)') {
    programProfile = null;
    updateChartData();
    return;
  }
  
  try {
    const res = await fetch(`/programs/${encodeURIComponent(programName)}`);
    if (!res.ok) throw new Error('Failed to load program');
    const content = await res.text();
    
    // Parse program (same logic as buildProgramPreviewData)
    const program = JSON.parse(content);
    const segments = program.segments || [];
    
    if (!segments.length) {
      programProfile = null;
      updateChartData();
      return;
    }
    
    // Build time/temp arrays
    const times = [0];  // Minutes from start
    const temps = [segments[0].target ?? 0];
    let elapsed = 0;
    let currentTemp = temps[0];
    
    for (const segment of segments) {
      const target = segment.target ?? currentTemp;
      const rampSeconds = timeToSeconds(segment.ramp_time);
      
      if (rampSeconds > 0) {
        elapsed += rampSeconds;
        times.push(elapsed / 60);
        temps.push(target);
      } else if (target !== currentTemp) {
        times.push(elapsed / 60);
        temps.push(target);
      }
      
      currentTemp = target;
      const dwellSeconds = timeToSeconds(segment.dwell_time);
      
      if (dwellSeconds > 0) {
        elapsed += dwellSeconds;
        times.push(elapsed / 60);
        temps.push(target);
      }
    }
    
    programProfile = {
      name: programName,
      startTime: null,  // Will be set when program starts
      durationMinutes: elapsed / 60,
      times,  // Minutes from program start
      temps
    };
    
    updateChartData();
  } catch (e) {
    console.warn('Failed to load program profile:', e.message);
    programProfile = null;
  }
}
```

### 6.4 Add function to get program end time

```javascript
function getProgramEndTime() {
  if (!programProfile) return Date.now() / 1000;
  
  const startTime = programProfile.startTime || Date.now() / 1000;
  return startTime + programProfile.durationMinutes * 60;
}
```

### 6.5 Add function to build profile data for chart

```javascript
function buildProfileChartData() {
  if (!programProfile || !programProfile.times.length) {
    return null;
  }
  
  // Determine anchor time
  let anchorTime;
  if (programProfileLocked && programProfile.startTime) {
    // Locked to actual start time
    anchorTime = programProfile.startTime;
  } else {
    // Float at current time
    anchorTime = Date.now() / 1000;
  }
  
  // Convert minutes to absolute timestamps
  const timestamps = programProfile.times.map(m => anchorTime + m * 60);
  
  return {
    timestamps,
    temps: programProfile.temps
  };
}
```

### 6.6 Update updateChartData() to include profile

```javascript
function updateChartData() {
  if (!chart) return;
  
  const len = chartData.timestamps.length;
  if (len === 0) return;
  
  // Base data arrays
  const data = [
    chartData.timestamps,
    chartData.kilnTemps,
    chartData.setTemps,
    chartData.envTemps,
    chartData.caseTemps
  ];
  
  // Add program profile if available
  const profile = buildProfileChartData();
  if (profile) {
    // Merge profile timestamps with main timestamps
    // uPlot requires all series to have same x values, so we need to interpolate
    const profileTemps = interpolateProfile(chartData.timestamps, profile);
    data.push(profileTemps);
  } else {
    // Add null array for profile series
    data.push(new Array(len).fill(null));
  }
  
  chart.setData(data);
}

function interpolateProfile(targetTimestamps, profile) {
  // For each target timestamp, find the corresponding profile temp
  return targetTimestamps.map(t => {
    // Check if t is within profile range
    const profileStart = profile.timestamps[0];
    const profileEnd = profile.timestamps[profile.timestamps.length - 1];
    
    if (t < profileStart || t > profileEnd) return null;
    
    // Find surrounding profile points
    for (let i = 0; i < profile.timestamps.length - 1; i++) {
      if (t >= profile.timestamps[i] && t <= profile.timestamps[i + 1]) {
        // Linear interpolation
        const t0 = profile.timestamps[i];
        const t1 = profile.timestamps[i + 1];
        const v0 = profile.temps[i];
        const v1 = profile.temps[i + 1];
        const pct = (t - t0) / (t1 - t0);
        return v0 + (v1 - v0) * pct;
      }
    }
    
    return null;
  });
}
```

### 6.7 Update handleMessage() to manage profile state

In handleMessage(), after `updateUI()`:

```javascript
// Manage program profile
const prevProgramName = programProfile?.name;
const currentProgramName = state.program_name;

// Load profile when program changes
if (currentProgramName && currentProgramName !== prevProgramName) {
  loadProgramProfile(currentProgramName);
}

// Lock/unlock profile based on status
const wasRunning = programProfileLocked;
const isRunning = state.program_status === 2;  // RUNNING
const isStopped = [4, 5, 7, 8].includes(state.program_status);  // STOPPED, ABORTED, FINISHED, FAILED

if (isRunning && !wasRunning) {
  // Program just started - lock to current time
  programProfileLocked = true;
  if (programProfile) {
    programProfile.startTime = Date.now() / 1000;
  }
} else if (isStopped) {
  // Program stopped - keep locked
  programProfileLocked = true;
}

// Clear profile when no program loaded
if (!currentProgramName || state.program_status === 0) {
  programProfile = null;
  programProfileLocked = false;
}
```

---

## Task 7: Add Overview Bar

**File:** `data/index.html`

### 7.1 Add CSS for overview bar

In the `<style>` section:

```css
#chartOverview {
  background: var(--surface-2);
  border-radius: 4px;
  position: relative;
  cursor: pointer;
}

.overview-viewport {
  position: absolute;
  top: 2px;
  bottom: 2px;
  background: rgba(255, 107, 74, 0.3);
  border: 1px solid var(--accent);
  border-radius: 2px;
  cursor: grab;
}

.overview-viewport:active {
  cursor: grabbing;
}
```

### 7.2 Add overview bar update function

```javascript
function updateOverviewBar() {
  const overview = document.getElementById('chartOverview');
  if (!overview || !chart) return;
  
  // Calculate full data range
  const now = Date.now() / 1000;
  const oldest = chartData.timestamps.length > 0 ? chartData.timestamps[0] : now - 3600;
  const programEnd = getProgramEndTime();
  const rightEdge = Math.max(now + 6 * 3600, programEnd);
  const fullRange = rightEdge - oldest;
  
  // Get current viewport
  const viewMin = chart.scales.x.min;
  const viewMax = chart.scales.x.max;
  
  // Calculate viewport position as percentage
  const leftPct = ((viewMin - oldest) / fullRange) * 100;
  const widthPct = ((viewMax - viewMin) / fullRange) * 100;
  
  // Update or create viewport element
  let viewport = overview.querySelector('.overview-viewport');
  if (!viewport) {
    viewport = document.createElement('div');
    viewport.className = 'overview-viewport';
    overview.appendChild(viewport);
    
    // Add drag handlers
    setupOverviewDrag(overview, viewport);
  }
  
  viewport.style.left = `${Math.max(0, leftPct)}%`;
  viewport.style.width = `${Math.min(100 - leftPct, widthPct)}%`;
}

function setupOverviewDrag(overview, viewport) {
  let dragging = false;
  let startX = 0;
  let startLeft = 0;
  
  viewport.addEventListener('mousedown', (e) => {
    dragging = true;
    startX = e.clientX;
    startLeft = parseFloat(viewport.style.left) || 0;
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!dragging || !chart) return;
    
    const dx = e.clientX - startX;
    const overviewWidth = overview.clientWidth;
    const dPct = (dx / overviewWidth) * 100;
    
    // Calculate new position
    const now = Date.now() / 1000;
    const oldest = chartData.timestamps[0] || now - 3600;
    const programEnd = getProgramEndTime();
    const rightEdge = Math.max(now + 6 * 3600, programEnd);
    const fullRange = rightEdge - oldest;
    
    const viewRange = chart.scales.x.max - chart.scales.x.min;
    const newLeftPct = Math.max(0, Math.min(100 - (viewRange / fullRange * 100), startLeft + dPct));
    const newMin = oldest + (newLeftPct / 100) * fullRange;
    const newMax = newMin + viewRange;
    
    chart.setScale('x', { min: newMin, max: newMax });
  });
  
  document.addEventListener('mouseup', () => {
    dragging = false;
  });
  
  // Click to jump
  overview.addEventListener('click', (e) => {
    if (e.target === viewport) return;  // Don't jump when clicking viewport
    
    const rect = overview.getBoundingClientRect();
    const clickPct = (e.clientX - rect.left) / rect.width;
    
    const now = Date.now() / 1000;
    const oldest = chartData.timestamps[0] || now - 3600;
    const programEnd = getProgramEndTime();
    const rightEdge = Math.max(now + 6 * 3600, programEnd);
    const fullRange = rightEdge - oldest;
    
    const viewRange = chart.scales.x.max - chart.scales.x.min;
    const centerTime = oldest + clickPct * fullRange;
    const newMin = centerTime - viewRange / 2;
    const newMax = centerTime + viewRange / 2;
    
    chart.setScale('x', { min: newMin, max: newMax });
  });
}
```

### 7.3 Call updateOverviewBar() when chart updates

Add to the setScale hook in initChart():
```javascript
hooks: {
  setScale: [
    (u, key) => {
      if (key === 'x') {
        chartZoomMin = u.scales.x.min;
        chartZoomMax = u.scales.x.max;
        updateOverviewBar();
      }
    }
  ]
}
```

Also call `updateOverviewBar()` at the end of `updateChartData()`.

---

## Testing Checklist

After implementing each task, verify:

### Task 1 (Simulator)
- [ ] Restart simulator: `cd simulator && docker-compose down && docker-compose up --build`
- [ ] Check `/api/history` returns `e` and `c` fields in data points

### Task 2 (API.md)
- [ ] Documentation accurately describes new fields

### Task 3 (Env/Case temps)
- [ ] Chart shows 4 series in legend: Kiln, Target, Env, Case
- [ ] Clicking legend labels hides/shows series
- [ ] Historical data includes env/case temps
- [ ] Real-time updates include env/case temps

### Task 4 (Pan/Zoom)
- [ ] Mouse wheel zooms in/out
- [ ] Click and drag pans left/right
- [ ] Zoom limits work (min 30min, max full range)
- [ ] Touch drag pans on mobile
- [ ] Pinch zoom works on mobile

### Task 5 (Recenter)
- [ ] Recenter button visible above chart
- [ ] Clicking recenter returns to default view (now at 70% from left)

### Task 6 (Program Profile)
- [ ] Loading a program shows cyan dashed line
- [ ] Profile starts at current time when not running
- [ ] Profile locks to start time when program starts
- [ ] Profile stays locked when program stops
- [ ] Loading new program replaces old profile
- [ ] No profile shown when no program loaded

### Task 7 (Overview Bar)
- [ ] Overview bar visible below chart
- [ ] Viewport rectangle shows current view position
- [ ] Dragging viewport pans main chart
- [ ] Clicking overview bar jumps main chart

---

## Prompting Guide for Executing This Plan

When asking a less capable model to execute this plan, break it into separate prompts:

### Prompt 1: Simulator Update
```
Read the file simulator/mock-data.js. Find the recordHistoryPoint() function around line 82 and the generateInitialHistory() function around line 144. Add 'e' (env_temp) and 'c' (case_temp) fields to the history data points. Follow the exact changes described in Task 1 of data/PLAN_7C_CHART_ENHANCEMENTS.md.
```

### Prompt 2: API Documentation
```
Read API.md and find the /api/history endpoint documentation. Add the 'e' and 'c' fields to the Data Point Fields table as described in Task 2 of data/PLAN_7C_CHART_ENHANCEMENTS.md.
```

### Prompt 3: Chart Series
```
Read data/index.html. Update the chart to show Environment and Case temperature series. This involves:
1. Adding envTemps and caseTemps arrays to chartData
2. Adding two new series to the chart options
3. Updating loadChartHistory(), addChartPoint(), and updateChartData()
Follow Task 3 in data/PLAN_7C_CHART_ENHANCEMENTS.md exactly.
```

### Prompt 4: Pan/Zoom
```
Read data/index.html. Add pan and zoom functionality to the temperature chart. This involves:
1. Adding zoom state variables
2. Enabling cursor drag in uPlot options
3. Adding wheel zoom handler
4. Adding touch support
Follow Task 4 in data/PLAN_7C_CHART_ENHANCEMENTS.md exactly.
```

### Prompt 5: Recenter Button
```
Read data/index.html. Add a Recenter button above the chart and implement the recenterChart() function. Follow Task 5 in data/PLAN_7C_CHART_ENHANCEMENTS.md exactly.
```

### Prompt 6: Program Profile
```
Read data/index.html. Add program profile overlay functionality. This is the most complex task - it involves:
1. Adding profile state variables
2. Adding a new chart series for the profile
3. Implementing loadProgramProfile(), buildProfileChartData(), interpolateProfile()
4. Updating handleMessage() to manage profile state
Follow Task 6 in data/PLAN_7C_CHART_ENHANCEMENTS.md exactly.
```

### Prompt 7: Overview Bar
```
Read data/index.html. Add an overview bar (minimap) below the chart. This involves:
1. Adding CSS styles
2. Adding the overview bar HTML element
3. Implementing updateOverviewBar() and setupOverviewDrag()
4. Calling updateOverviewBar() when chart scale changes
Follow Task 7 in data/PLAN_7C_CHART_ENHANCEMENTS.md exactly.
```

### Tips for the executing model:
- Do one task at a time and test before moving to the next
- Read the target files first before making changes
- Use search_replace for precise edits
- If something doesn't work, check the browser console for errors
- The simulator needs to be restarted after changing mock-data.js


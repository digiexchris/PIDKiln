# SPA Frontend Plan

Single-page application frontend for PIDKiln.

## Status: IN PROGRESS

## Dependencies

- [Dev Container](../PLAN_DEVCONTAINER.md) - For running the development server
- [Simulator](../simulator/README.md) - Mock API for development

## Overview

A zero-dependency vanilla JavaScript SPA that provides the complete PIDKiln user interface.

**Architecture:**
- Single HTML file with embedded CSS and JS
- Hash-based routing (`#/programs`, `#/logs`, etc.)
- WebSocket for real-time state updates
- Persistent status bar showing critical info
- Sidebar navigation with always-accessible controls

---

## Step 1: Initial SPA Shell [COMPLETE]

Created the base SPA structure with navigation and views.

**File:** `test-client.html` (to be renamed to `index.html`)

**Completed features:**
- [x] Status bar (connection, temps, program status)
- [x] Sidebar navigation (Dashboard, Programs, Logs, Preferences, Debug, About)
- [x] Controls section (Start/Pause/Stop, Load/Clear program, Set temp, Connect/Disconnect, Reboot)
- [x] Hash-based routing
- [x] Auto-reconnect WebSocket with 30s timeout
- [x] Connection lost overlay on chart
- [x] N/A temps and OFFLINE status when disconnected
- [x] Separate Connect/Disconnect buttons with proper state management
- [x] Dashboard with stats cards
- [x] Programs list with Load/Edit/Delete
- [x] Logs list with View/Download
- [x] Preferences editor (all settings)
- [x] Debug info display
- [x] About page

---

## Step 2: File Rename and Cleanup [COMPLETE]

Renamed test client to become the main frontend.

**Completed:**
- [x] Renamed `test-client.html` → `index.html`
- [x] Removed legacy HTML files
- [x] Removed legacy JS files and `js/` directory

---

## Step 3: Program Editor View [COMPLETE]

Created a proper full-screen editor for programs.

**Completed:**
- [x] Added `#/editor` view
- [x] Full-height textarea with monospace font
- [x] Filename display in toolbar
- [x] Syntax hints (format: `temp:ramp:dwell`)
- [x] Line numbers (synced scrolling)
- [x] Save and Cancel buttons
- [x] File size validation (max 10KB)
- [x] Status bar showing line/byte count
- [x] Navigate back to Programs list on save/cancel
- [x] Confirm dialog on discard

---

## Step 4: Move WebSocket Log to Debug [COMPLETE]

Moved the WebSocket message log from Dashboard to Debug page.

**Completed:**
- [x] Removed log container from Dashboard view
- [x] Added log container to Debug view
- [x] Added checkbox "Show WebSocket messages" (default: off)
- [x] Log only updates when checkbox is checked
- [x] Checkbox state persisted in localStorage

---

## Step 5: Preferences Enhancements [COMPLETE]

Added missing features to the Preferences view.

**Completed:**
- [x] Added "Download Config" button/link to `/etc/pidkiln.conf`

---

## Step 6: Firmware Update Widget [COMPLETE]

Added firmware upload functionality to Debug page.

**Completed:**
- [x] Added "Firmware Update" card to Debug view
- [x] File input accepting `.bin` files only
- [x] Upload button with confirmation dialog
- [x] Status feedback (uploading, success, error)
- [x] Warning message about device restart
- [x] POST to `/update-firmware` endpoint

---

## Step 7a: Dashboard Temperature Chart [COMPLETE]

Added live temperature visualization to Dashboard using uPlot.

**Library:** uPlot v1.6.31 (~45KB JS + 2KB CSS)

**Completed:**
- [x] Downloaded `uPlot.iife.min.js` and `uPlot.min.css` to `data/`
- [x] Added `<link>` and `<script>` tags to `index.html`
- [x] Added chart container to Dashboard
- [x] On load, fetch `/api/history` to populate chart with historical data
- [x] Plot kiln temp (orange) vs set temp (green dashed) over time
- [x] Update in real-time from WebSocket state messages
- [x] Time-based X axis with HH:MM format
- [x] Responsive sizing with ResizeObserver
- [x] Dark theme matching the SPA

**Pending enhancements (future):**
- [ ] Show event markers on chart (program start/stop, step changes)
- [ ] Show program profile overlay when program loaded

---

## Step 7b: Program Preview Chart [COMPLETE]

Add program profile preview on Programs page.

**Completed:**
- [x] Add "Preview" button to each program row
- [x] When clicked, expand description row and chart row below that program
- [x] Parse JSON program file and render target temperature curve with uPlot
- [x] Show time on X axis (hh:mm format, offset from current time), temperature on Y axis
- [x] Collapse when clicked again
- [x] Cache fetched program content to avoid redundant requests

---

## Step 7c: Dashboard Chart Enhancements [COMPLETE]

Enhanced the dashboard chart with:
- [x] Pan (drag) and zoom (scroll wheel / pinch-to-zoom)
- [x] Environment and Case temperature series (gray `#888` and `#666`)
- [x] Program profile overlay (cyan `#22d3ee` dashed line)
- [x] Overview bar (minimap) for navigation
- [x] Recenter button

**Files modified:**
- `simulator/mock-data.js` - Added `e` and `c` fields to history
- `API.md` - Documented new history fields
- `data/index.html` - All frontend chart enhancements

---

## Step 7d: Navigate to Dashboard on Load [PENDING]

After loading a program, switch to Dashboard to monitor.

**Tasks:**
- [ ] When "Load" button clicked on Programs page, after successful load:
  - Navigate to `#/` (Dashboard)
  - Dashboard chart shows the loaded program's target profile (via Step 7c)
- [ ] Also applies to Load button in sidebar controls

---

## Step 7e: Start Program from Specific Point [PENDING]

Allow starting a program from a specific segment or time offset.

**Use Cases:**
- Resume a program that was interrupted
- Skip initial warm-up segments for testing
- Start at a specific point in a long program

**Tasks:**
- [ ] Add UI to specify start point when starting a program:
  - "Start from segment" dropdown/input
  - "Start from minute" input
- [ ] Send start command with optional `segment` or `minute` parameter
- [ ] Show current start point in program status display
- [ ] Update chart to show actual vs planned timeline

---

## Step 7f: UI-Based Program Editor [PENDING]

Replace text editor with a visual segment-based editor for JSON program format.

**Use Cases:**
- Easier program creation without JSON syntax knowledge
- Visual feedback for program structure
- Validation and error prevention

**Tasks:**
- [ ] Replace text editor with segment list UI
- [ ] Add/Remove segment buttons
- [ ] Segment editor widget with:
  - Target temperature input (0-1350°C)
  - Ramp time inputs (hours, minutes, seconds)
  - Dwell time inputs (hours, minutes, seconds)
- [ ] Program description field
- [ ] Real-time validation (temperature range, time values)
- [ ] Preview total program duration
- [ ] Save as JSON format
- [ ] Import/export JSON (for backup/sharing)
- [ ] Optional: Visual timeline preview

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Edit Program: program1.json                    [Save] [Cancel]│
├─────────────────────────────────────────────────────────────┤
│  Description: [________________________________]            │
│                                                             │
│  Segments:                                    [+ Add Segment]│
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Segment 1                              [↑] [↓] [×]    │ │
│  │ Target: [500] °C                                       │ │
│  │ Ramp:   [0]h [30]m [0]s                               │ │
│  │ Dwell:  [0]h [20]m [0]s                               │ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Segment 2                              [↑] [↓] [×]    │ │
│  │ Target: [750] °C                                       │ │
│  │ Ramp:   [1]h [0]m [0]s                                │ │
│  │ Dwell:  [0]h [15]m [0]s                               │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Total Duration: 1h 45m 0s                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 8: Configurable State Broadcast Interval [PENDING]

Add a preference to control how often the backend sends state updates.

**Use Case:** Reduce network traffic and CPU usage on slower connections or when high-frequency updates aren't needed.

**Tasks:**
- [ ] Add "State Broadcast Interval" setting to Preferences page
- [ ] Input field for interval in milliseconds (default: 1000ms)
- [ ] Valid range: 100ms - 10000ms
- [ ] Store in backend preferences (pidkiln.conf)
- [ ] Backend reads this value and adjusts broadcast interval
- [ ] Update simulator to support configurable interval
- [ ] Document in API.md

**UI (in Preferences):**
```
State Broadcast Interval: [1000] ms  (100-10000)
```

---

## Step 9: Polish and Testing [PENDING]

Final refinements.

**Tasks:**
- [ ] Mobile responsiveness testing
- [ ] Loading states for async operations
- [ ] Error toast/notification system
- [ ] Keyboard shortcuts (optional)
- [ ] Accessibility review
- [ ] Test all views with simulator
- [ ] Document any backend API changes needed

---

## Step 10: Configurable Backend URL [PENDING]

Allow the SPA to connect to a different backend host.

**Use Case:** User hosts the GUI on a separate server (e.g., local dev machine, CDN) while connecting to the ESP32 backend on the network.

**Tasks:**
- [ ] Add "Backend URL" setting to Preferences or Debug page
- [ ] Store in localStorage (not sent to backend)
- [ ] Default: same origin (`location.host`)
- [ ] Override WebSocket URL (`ws://custom-host/ws`)
- [ ] Override API fetch URLs (`http://custom-host/api/...`)
- [ ] Show current backend URL in status bar or Debug
- [ ] "Reset to Default" button

**UI (in Preferences or Debug):**
```
Backend URL: [http://192.168.1.50______] [Save] [Reset]
             Current: http://192.168.1.50 (custom)
```

---

## File Structure (Target)

```
data/
├── index.html          # SPA (single file)
├── PLAN_SPA.md         # This file
├── PIDKiln_vars.json   # Template for ESP32
├── css/
│   └── (can be removed or kept for ESP32 legacy)
├── icons/              # Keep for now
├── etc/
│   └── pidkiln.conf
└── programs/
    └── *.txt
```


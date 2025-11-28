# SPA Frontend Plan

Single-page application frontend for PIDKiln.

## Status: IN PROGRESS

## Dependencies

- [Dev Container](../PLAN_DEVCONTAINER.md) - For running the development server
- [Simulator](../simulator/PLAN_SIMULATOR.md) - Mock API for development

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
- [x] Controls section (Start/Pause/Stop/Abort, Load program, Set temp, Reboot)
- [x] Hash-based routing
- [x] Auto-reconnect WebSocket
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
- [x] POST to `/update` endpoint

---

## Step 7a: Dashboard Temperature Chart [PENDING]

Add live temperature visualization to Dashboard using uPlot.

**Library:** uPlot v1.6.31 (~45KB JS + 2KB CSS)
- Download `uPlot.iife.min.js` and `uPlot.min.css` to `data/`
- No npm/build required

**Data Source:** `GET /api/history` - Returns 24h of temperature data with event markers

**Tasks:**
- [ ] Download uPlot files to `data/`
- [ ] Add `<link>` and `<script>` tags to `index.html`
- [ ] Add chart container to Dashboard
- [ ] On load, fetch `/api/history` to populate chart with historical data
- [ ] Plot kiln temp vs set temp over time
- [ ] Update in real-time from WebSocket state messages
- [ ] Show event markers (program start/stop, step changes)
- [ ] Show program profile overlay (target curve) when program loaded
- [ ] Time-based X axis
- [ ] Responsive sizing

---

## Step 7b: Program Preview Chart [PENDING]

Add program profile preview on Programs page.

**Tasks:**
- [ ] Add "Preview" button to each program row
- [ ] When clicked, expand a chart row below that program
- [ ] Parse program file and render target temperature curve
- [ ] Show time on X axis, temperature on Y axis
- [ ] Display total program duration
- [ ] Collapse when clicked again or another preview opened

**UI:**
```
┌──────────────────────────────────────────────────────────────┐
│ Name           Size    Description              Actions      │
├──────────────────────────────────────────────────────────────┤
│ bisque.txt     124B    Cone 06 bisque    [Load][Preview][...]│
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐   │
│ │  1000°C ─────────────────────────╮                     │   │
│ │                                   │                     │   │
│ │  500°C ──────────────────╮       │                     │   │
│ │                           │       │                     │   │
│ │  0°C ───────────────────────────────────────────────── │   │
│ │       0h        2h        4h        6h        8h       │   │
│ │                                      Total: 8h 30m     │   │
│ └────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────┤
│ glaze.txt      98B     High fire         [Load][Preview][...]│
└──────────────────────────────────────────────────────────────┘
```

---

## Step 7c: Navigate to Dashboard on Load [PENDING]

After loading a program, switch to Dashboard to monitor.

**Tasks:**
- [ ] When "Load" button clicked on Programs page, after successful load:
  - Navigate to `#/` (Dashboard)
  - Dashboard chart shows the loaded program's target profile
- [ ] Also applies to Load button in sidebar controls

---

## Step 7d: Start Program from Specific Point [PENDING]

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

## Step 8: Polish and Testing [PENDING]

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

## Step 9: Configurable Backend URL [PENDING]

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


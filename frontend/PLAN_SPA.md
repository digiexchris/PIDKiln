# SPA Frontend Plan

Single-page application frontend for Furnace.

## Status: IN PROGRESS

## Dependencies

- [Simulator](../simulator/README.md) - Mock API for development

## Overview

A TypeScript SPA that provides the complete Furnace user interface.

**Architecture:**
- TypeScript compiled with esbuild
- Hash-based routing (`#/programs`, `#/logs`, etc.)
- FlatBuffers over WebSocket for real-time communication
- Persistent status bar showing critical info
- Sidebar navigation with always-accessible controls

**Retained HTTP Endpoints:**
- `GET /logs/:name` - Direct file download
- `POST /api/stop` - Emergency stop (HTTP fallback for safety)
- `POST /api/reboot` - Device restart
- `POST /update-firmware` - Firmware upload

**All other API communication uses FlatBuffers over WebSocket.**

---

## Step 1: Navigate to Dashboard on Load [PENDING]

After loading a program, switch to Dashboard to monitor.

**Tasks:**
- [ ] When "Load" button clicked on Programs page, after successful load:
  - Navigate to `#/` (Dashboard)
  - Dashboard chart shows the loaded program's target profile
- [ ] Also applies to Load button in sidebar controls

---

## Step 2: Start Program from Specific Point [PENDING]

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

## Step 3: UI-Based Program Editor [PENDING]

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

## Step 4: Configurable State Broadcast Interval [PENDING]

Add a preference to control how often the backend sends state updates.

**Use Case:** Reduce network traffic and CPU usage on slower connections or when high-frequency updates aren't needed.

**Tasks:**
- [ ] Add "State Broadcast Interval" setting to Preferences page
- [ ] Input field for interval in milliseconds (default: 1000ms)
- [ ] Valid range: 100ms - 10000ms
- [ ] Store in backend preferences (furnace.conf)
- [ ] Backend reads this value and adjusts broadcast interval
- [ ] Update simulator to support configurable interval
- [ ] Document in API.md

**UI (in Preferences):**
```
State Broadcast Interval: [1000] ms  (100-10000)
```

---

## Step 5: Polish and Testing [PENDING]

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

## Step 6: Configurable Backend URL [PENDING]

Allow the SPA to connect to a different backend host.

**Use Case:** User hosts the GUI on a separate server (e.g., local dev machine, CDN) while connecting to the ESP32 backend on the network.

**Tasks:**
- [ ] Add "Backend URL" setting to Preferences in a new section dedicated to client side only settings.
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

## File Structure

```
frontend/
├── src/
│   ├── main.ts             # Entry point, global exports
│   ├── state.ts            # Global state management
│   ├── router.ts           # Hash-based routing
│   ├── websocket.ts        # WebSocket connection management
│   ├── commands.ts         # Command sending functions
│   ├── flatbuffers.ts      # FlatBuffers encode/decode helpers
│   ├── utils.ts            # Utility functions
│   ├── chart/
│   │   ├── dashboard.ts    # Main chart setup, update logic
│   │   ├── profile.ts      # Program profile overlay
│   │   └── preview.ts      # Program preview charts
│   ├── views/
│   │   ├── programs.ts     # Programs list, editor
│   │   ├── logs.ts         # Logs viewer
│   │   ├── preferences.ts  # Preferences form
│   │   ├── debug.ts        # Debug page, firmware upload
│   │   └── about.ts        # About page
│   ├── ui/
│   │   └── statusbar.ts    # Status bar and UI updates
│   ├── types/
│   │   ├── api.ts          # API response types
│   │   ├── state.ts        # Application state types
│   │   └── uplot.d.ts      # uPlot type declarations
│   └── generated/          # Generated FlatBuffers types
│       └── furnace/
├── dist/                   # Build output (generated)
│   ├── index.html
│   ├── app.js
│   ├── app.js.map
│   ├── uPlot.iife.min.js
│   └── uPlot.min.css
├── programs/               # Program files
│   └── *.json
├── index.html              # HTML template
├── build.js                # esbuild configuration
├── tsconfig.json
├── package.json
└── PLAN_SPA.md             # This file
```

---

## Related Documentation

- [API Reference](../API.md) - Complete API documentation
- [FlatBuffers Schema](../proto/furnace.fbs) - Message definitions
- [ESP32 FlatBuffers Plan](../src/PLAN_FLATBUFFERS.md) - Backend implementation

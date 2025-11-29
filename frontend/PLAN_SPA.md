# SPA Frontend Plan

Single-page application frontend for Furnace.

## Status: IN PROGRESS

## Dependencies

- [Dev Container](../PLAN_DEVCONTAINER.md) - For running the development server
- [Simulator](../simulator/README.md) - Mock API for development

## Overview

A zero-dependency vanilla JavaScript SPA that provides the complete Furnace user interface.

**Architecture:**
- Single HTML file with embedded CSS and JS
- Hash-based routing (`#/programs`, `#/logs`, etc.)
- WebSocket for real-time state updates
- Persistent status bar showing critical info
- Sidebar navigation with always-accessible controls

---

## Step 1: Initial SPA Shell [COMPLETE]

Created the base SPA structure with navigation and views.

**File:** `index.html`

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
- [x] Created `index.html` as main SPA entry point
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

## Step 8: TypeScript Migration [IN PROGRESS]

Convert the frontend from vanilla JavaScript to TypeScript with a proper build toolchain.

### Scaffolding [COMPLETE]

The build toolchain is set up:
- `frontend/package.json` - npm project with esbuild and TypeScript
- `frontend/tsconfig.json` - TypeScript config (strict mode, noEmit for type checking)
- `frontend/build.js` - esbuild configuration with watch mode
- `frontend/src/main.ts` - Entry point placeholder
- `simulator/Dockerfile` - Updated to build frontend and run watch
- `simulator/docker-compose.yml` - Updated with volume mounts for live development
- `simulator/server.js` - Updated to serve from `frontend/dist/`

### Remaining Work [PENDING - Use cheaper model]

Extract JavaScript from `index.html` into TypeScript modules:

**Rationale:**
- Type safety catches errors at compile time
- Better IDE support (autocomplete, refactoring)
- Required foundation for protobuf code generation (Step 9)
- Modern development practices

**Build Toolchain:**
- esbuild for bundling and TypeScript transpilation (single dependency, ~9MB)
- TypeScript for type checking only (`tsc --noEmit`)
- npm scripts for build/watch

**Project Structure (after migration):**
```
frontend/
├── src/
│   ├── main.ts              # Entry point
│   ├── types/
│   │   ├── api.ts           # API response types
│   │   ├── state.ts         # Application state types
│   │   └── program.ts       # Program/segment types
│   ├── services/
│   │   ├── websocket.ts     # WebSocket connection management
│   │   ├── api.ts           # HTTP API calls
│   │   └── chart.ts         # uPlot chart management
│   ├── views/
│   │   ├── dashboard.ts     # Dashboard view logic
│   │   ├── programs.ts      # Programs list/preview
│   │   ├── editor.ts        # Program editor
│   │   ├── preferences.ts   # Preferences form
│   │   ├── logs.ts          # Logs viewer
│   │   ├── debug.ts         # Debug page
│   │   └── about.ts         # About page
│   ├── components/
│   │   ├── statusBar.ts     # Top status bar
│   │   ├── sidebar.ts       # Navigation sidebar
│   │   └── controls.ts      # Program control buttons
│   ├── router.ts            # Hash-based router
│   ├── store.ts             # Application state management
│   └── utils.ts             # Utility functions
├── public/                  # Static assets (copied to dist/)
│   ├── icons/
│   ├── uPlot.iife.min.js
│   └── uPlot.min.css
├── dist/                    # Build output (generated, served by simulator)
│   ├── index.html
│   ├── app.js
│   ├── app.js.map
│   └── (static assets)
├── index.html               # HTML template
├── tsconfig.json
├── package.json
├── programs/                # Program files (served separately)
│   └── *.json
├── etc/
│   └── furnace.conf
└── PLAN_SPA.md
```

**Decisions Made:**
- **Bundler:** esbuild (minimal dependencies, fast)
- **CSS handling:** Keep CSS in HTML or separate file, no CSS-in-JS
- **uPlot:** Keep as external script (not bundled) - already minified, avoid duplicate
- **Source maps:** Enabled for development debugging
- **Watch mode:** esbuild's built-in `--watch` flag

**Scaffolding Tasks:** [COMPLETE]
- [x] Rename `data/` to `frontend/`
- [x] Initialize npm project in `frontend/` with `package.json`
- [x] Install esbuild and TypeScript as dev dependencies
- [x] Create `tsconfig.json` with strict mode (for type checking only)
- [x] Create `build.js` script for esbuild configuration
- [x] Create `src/main.ts` entry point placeholder
- [x] Add npm scripts: `build`, `watch`, `typecheck`
- [x] Update Docker container to run `npm run watch` on startup
- [x] Update simulator `server.js` to serve from `frontend/dist/`
- [x] Update `docker-compose.yml` with correct volume mounts

**Conversion Tasks:** [PENDING - Cheaper model can do this]
- [ ] Extract JavaScript from `index.html` into `src/main.ts`
- [ ] Extract CSS from `index.html` into separate file (or keep inline)
- [ ] Update `index.html` to reference `dist/app.js` instead of inline script
- [ ] Define types for API responses and state in `src/types/`
- [ ] Convert functions to typed TypeScript incrementally
- [ ] Verify all functionality works after migration
- [ ] Update `.gitignore` for `dist/` and `node_modules/`
- [ ] Run `npm run typecheck` with no errors

**Docker Container Changes:**
```dockerfile
# In simulator/Dockerfile
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Start both watch and server
CMD npm run watch & node /app/simulator/server.js
```

**package.json:**
```json
{
  "name": "pidkiln-frontend",
  "private": true,
  "scripts": {
    "build": "node build.js",
    "watch": "node build.js --watch",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "esbuild": "^0.20.0",
    "typescript": "^5.3.0"
  }
}
```

**build.js:**
```javascript
const esbuild = require('esbuild');
const watch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'dist/app.js',
  sourcemap: true,
  minify: !watch,
  target: ['es2020'],
};

if (watch) {
  esbuild.context(config).then(ctx => {
    ctx.watch();
    console.log('Watching for changes...');
  });
} else {
  esbuild.build(config);
}
```

**Type Definitions (examples):**

```typescript
// types/state.ts
interface FurnaceState {
  programStatus: ProgramStatus;
  programName: string | null;
  kilnTemp: number;
  setTemp: number;
  envTemp: number;
  caseTemp: number;
  heatPercent: number;
  tempChange: number;
  step: string;
  progStart: string | null;
  progEnd: string | null;
  currTime: string;
}

enum ProgramStatus {
  NONE = 0,
  READY = 1,
  RUNNING = 2,
  PAUSED = 3,
  STOPPED = 4,
  ABORTED = 5,
  WAITING_THRESHOLD = 6,
  FINISHED = 7,
  FAILED = 8,
}

// types/program.ts
interface ProgramSegment {
  target: number;
  ramp_time: TimeValue;
  dwell_time: TimeValue;
}

interface TimeValue {
  hours?: number;
  minutes?: number;
  seconds?: number;
}

interface Program {
  description?: string;
  segments: ProgramSegment[];
}

// types/api.ts
interface HistoryPoint {
  t: number;  // timestamp ms
  k: number;  // kiln temp
  s: number;  // set temp
  p: number;  // power %
  e: number;  // env temp
  c: number;  // case temp
  m?: Marker;
}

interface Marker {
  type: 'start' | 'stop' | 'finish' | 'pause' | 'resume' | 'target' | 'step';
  value?: string | number;
}
```

**Dev Workflow:**
```bash
# Development (hot reload)
npm run dev

# Production build
npm run build

# Type checking only
npm run typecheck
```

---

## Step 9: WebSocket + FlatBuffers API Migration [PENDING]

**Note:** This step depends on Step 8 (TypeScript Migration) for proper type generation from `.fbs` files.

Migrate the entire API from REST/WebSocket JSON to WebSocket with FlatBuffers for improved performance, type safety, and minimal ESP32 CPU overhead.

**Rationale:**
- **Zero-copy reads** - ESP32 reads fields directly from buffer, no deserialization
- **Minimal encode overhead** - Builder pattern, predictable memory
- **Smaller payloads** - Binary format, no field names
- **Strong typing** - Code generation for TypeScript and C++
- **Schema evolution** - Add fields without breaking compatibility
- **Single transport** - Everything over WebSocket, no HTTP endpoints

**Architecture:**
```
┌─────────────┐    WebSocket    ┌─────────────┐
│   Browser   │ ◄────────────► │    ESP32    │
│ flatbuffers │   FlatBuffer   │   flatcc/   │
│     npm     │    messages    │  flatbuffers│
└─────────────┘                └─────────────┘
```

**Dependencies:**
- **Frontend:** `flatbuffers` npm package (~50KB)
- **ESP32:** `flatcc` or `flatbuffers` C library (header-only, ~20KB)
- **Build:** `flatc` compiler for code generation

**FlatBuffers Schema:**

```flatbuffers
// furnace.fbs
namespace Furnace;

// ============================================
// Enums
// ============================================

enum ProgramStatus : byte {
  None = 0,
  Ready = 1,
  Running = 2,
  Paused = 3,
  Stopped = 4,
  Aborted = 5,
  WaitingThreshold = 6,
  Finished = 7,
  Failed = 8
}

enum MarkerType : byte {
  Start = 0,
  Stop = 1,
  Finish = 2,
  Pause = 3,
  Resume = 4,
  Target = 5,
  Step = 6
}

// ============================================
// Server → Client Messages
// ============================================

table State {
  program_status: ProgramStatus;
  program_name: string;
  kiln_temp: float;
  set_temp: float;
  env_temp: float;
  case_temp: float;
  heat_percent: ubyte;
  temp_change: float;
  step: string;
  prog_start_ms: long;
  prog_end_ms: long;
  curr_time_ms: long;
}

table Ack {
  success: bool;
  request_id: uint;
  error: string;
}

table HistoryPoint {
  timestamp_ms: long;
  kiln_temp: float;
  set_temp: float;
  heat_percent: ubyte;
  env_temp: float;
  case_temp: float;
  marker_type: MarkerType = null;
  marker_value: string;
}

table HistoryResponse {
  interval_ms: uint;
  max_age_ms: uint;
  data: [HistoryPoint];
}

table ProgramInfo {
  name: string;
  size: uint;
  description: string;
}

table ProgramListResponse {
  programs: [ProgramInfo];
}

table ProgramContentResponse {
  name: string;
  content: string;  // JSON program content
}

table PreferencesResponse {
  json: string;  // Preferences as JSON string (flexible schema)
}

table DebugInfoResponse {
  json: string;  // Debug info as JSON string
}

table LogInfo {
  name: string;
  size: uint;
}

table LogListResponse {
  logs: [LogInfo];
}

table LogContentResponse {
  name: string;
  content: string;  // CSV log content
}

table Error {
  code: int;
  message: string;
}

// ============================================
// Client → Server Messages
// ============================================

table StartCommand {
  segment: int = 0;  // 0 = from beginning
  minute: int = 0;   // 0 = from beginning
}

table PauseCommand {}
table ResumeCommand {}
table StopCommand {}
table LoadCommand { program: string (required); }
table UnloadCommand {}
table SetTempCommand { temperature: float; }
table RebootCommand {}

table HistoryRequest {
  since_ms: long = 0;
  limit: int = 0;
}

table ListProgramsRequest {}
table GetProgramRequest { name: string (required); }
table SaveProgramRequest { 
  name: string (required);
  content: string (required);
}
table DeleteProgramRequest { name: string (required); }

table GetPreferencesRequest {}
table SavePreferencesRequest { json: string (required); }

table GetDebugInfoRequest {}

table ListLogsRequest {}
table GetLogRequest { name: string (required); }

table UploadFirmwareChunk {
  offset: uint;
  data: [ubyte];
  is_last: bool;
}

// ============================================
// Message Envelope (Union-based framing)
// ============================================

union ClientMessage {
  // Commands
  StartCommand,
  PauseCommand,
  ResumeCommand,
  StopCommand,
  LoadCommand,
  UnloadCommand,
  SetTempCommand,
  RebootCommand,
  // Requests
  HistoryRequest,
  ListProgramsRequest,
  GetProgramRequest,
  SaveProgramRequest,
  DeleteProgramRequest,
  GetPreferencesRequest,
  SavePreferencesRequest,
  GetDebugInfoRequest,
  ListLogsRequest,
  GetLogRequest,
  UploadFirmwareChunk
}

union ServerMessage {
  State,
  Ack,
  HistoryResponse,
  ProgramListResponse,
  ProgramContentResponse,
  PreferencesResponse,
  DebugInfoResponse,
  LogListResponse,
  LogContentResponse,
  Error
}

table ClientEnvelope {
  request_id: uint;  // For matching responses to requests
  message: ClientMessage;
}

table ServerEnvelope {
  request_id: uint;  // 0 for unsolicited (state broadcasts)
  message: ServerMessage;
}

root_type ServerEnvelope;
```

**Message Flow:**

```
Client                                Server
  │                                      │
  │──── ClientEnvelope(StartCommand) ───►│
  │◄─── ServerEnvelope(Ack) ─────────────│
  │                                      │
  │◄─── ServerEnvelope(State) ───────────│  (broadcast every 1s)
  │◄─── ServerEnvelope(State) ───────────│
  │                                      │
  │──── ClientEnvelope(HistoryRequest) ─►│
  │◄─── ServerEnvelope(HistoryResponse) ─│
  │                                      │
```

**Request/Response Matching:**
- Client sends `request_id` in ClientEnvelope
- Server echoes `request_id` in ServerEnvelope response
- State broadcasts use `request_id = 0`

**Tasks:**

*Schema & Code Generation:*
- [ ] Create `proto/furnace.fbs` schema file
- [ ] Add `flatc` to build toolchain (npm: `flatbuffers`)
- [ ] Add code generation script to `package.json`
- [ ] Generate TypeScript types from schema into `generated/`

*Frontend Changes:*
- [ ] Create `services/flatbuffers.ts` for encode/decode helpers
- [ ] Update `services/websocket.ts` to send/receive binary frames
- [ ] Update all views to use typed FlatBuffer messages
- [ ] Implement request/response matching with `request_id`

*Simulator Changes:*
- [ ] Install `flatbuffers` npm package in simulator
- [ ] Copy/share schema with frontend (`proto/furnace.fbs`)
- [ ] Generate JavaScript code from schema
- [ ] Create `simulator/flatbuffers.js` for encode/decode
- [ ] Update `server.js` WebSocket handler for binary frames
- [ ] Update `mock-data.js` to build FlatBuffer state messages
- [ ] Implement all ClientMessage handlers (commands, requests)
- [ ] Implement all ServerMessage builders (responses, broadcasts)
- [ ] Implement chunked firmware upload simulation
- [ ] Remove all HTTP endpoints (except static file serving)
- [ ] Update simulator README with new protocol

*Message Migration:*
- [ ] Migrate state broadcasts
- [ ] Migrate all commands (start, pause, stop, load, unload, set_temp, reboot)
- [ ] Migrate history request/response
- [ ] Migrate program management (list, get, save, delete)
- [ ] Migrate preferences (get, save)
- [ ] Migrate debug info
- [ ] Migrate logs (list, get)
- [ ] Implement firmware upload via chunks

*Documentation:*
- [ ] Update API.md with FlatBuffers schema documentation
- [ ] Remove deprecated HTTP endpoint documentation
- [ ] Document message flow and request_id matching

*Testing:*
- [ ] Test all functionality end-to-end
- [ ] Verify binary frame handling in browser
- [ ] Test reconnection with binary protocol

**Frontend Code Example:**

```typescript
// services/flatbuffers.ts
import * as flatbuffers from 'flatbuffers';
import { Furnace } from '../generated/furnace';

export function encodeStartCommand(segment?: number, minute?: number): Uint8Array {
  const builder = new flatbuffers.Builder(64);
  
  Furnace.StartCommand.startStartCommand(builder);
  if (segment) Furnace.StartCommand.addSegment(builder, segment);
  if (minute) Furnace.StartCommand.addMinute(builder, minute);
  const cmd = Furnace.StartCommand.endStartCommand(builder);
  
  Furnace.ClientEnvelope.startClientEnvelope(builder);
  Furnace.ClientEnvelope.addRequestId(builder, nextRequestId());
  Furnace.ClientEnvelope.addMessageType(builder, Furnace.ClientMessage.StartCommand);
  Furnace.ClientEnvelope.addMessage(builder, cmd);
  const envelope = Furnace.ClientEnvelope.endClientEnvelope(builder);
  
  builder.finish(envelope);
  return builder.asUint8Array();
}

export function decodeServerMessage(data: ArrayBuffer): ServerMessage {
  const buf = new flatbuffers.ByteBuffer(new Uint8Array(data));
  const envelope = Furnace.ServerEnvelope.getRootAsServerEnvelope(buf);
  
  switch (envelope.messageType()) {
    case Furnace.ServerMessage.State:
      return { type: 'state', data: parseState(envelope.message(new Furnace.State())) };
    case Furnace.ServerMessage.Ack:
      return { type: 'ack', data: parseAck(envelope.message(new Furnace.Ack())) };
    // ... etc
  }
}
```

**ESP32 Implementation:**
See `src/PLAN_FLATBUFFERS.md` for backend implementation details.

---

## Step 10: Navigate to Dashboard on Load [PENDING]

After loading a program, switch to Dashboard to monitor.

**Tasks:**
- [ ] When "Load" button clicked on Programs page, after successful load:
  - Navigate to `#/` (Dashboard)
  - Dashboard chart shows the loaded program's target profile (via Step 7c)
- [ ] Also applies to Load button in sidebar controls

---

## Step 11: Start Program from Specific Point [PENDING]

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

## Step 12: UI-Based Program Editor [PENDING]

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

## Step 13: Configurable State Broadcast Interval [PENDING]

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

## Step 14: Polish and Testing [PENDING]

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

## Step 15: Configurable Backend URL [PENDING]

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

## File Structure (Target)

```
frontend/                   # Renamed from data/
├── src/                    # TypeScript source (Step 8)
│   ├── main.ts
│   ├── types/
│   ├── services/
│   ├── views/
│   ├── components/
│   └── ...
├── public/                 # Static assets
│   ├── icons/
│   ├── uPlot.iife.min.js
│   └── uPlot.min.css
├── dist/                   # Build output (generated, gitignored)
│   ├── index.html
│   ├── app.js
│   └── app.js.map
├── proto/                  # FlatBuffers schema (Step 9)
│   └── furnace.fbs
├── generated/              # Generated TypeScript (from flatc)
├── index.html              # HTML template
├── build.js                # esbuild configuration
├── tsconfig.json
├── package.json
├── PLAN_SPA.md             # This file
├── PIDKiln_vars.json       # Template for ESP32
├── etc/
│   └── furnace.conf
└── programs/
    └── *.json
```


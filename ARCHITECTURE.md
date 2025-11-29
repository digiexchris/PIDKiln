# Furnace System Architecture

Technical documentation for the Furnace kiln controller system.

---

## Overview

Furnace is a programmable kiln controller built on the ESP32 platform. It provides:

- **Temperature Control**: PID-based heating with thermocouple feedback
- **Program Execution**: Multi-segment firing schedules with ramp/dwell phases
- **Web Interface**: Single-page application for monitoring and control
- **Real-time Communication**: FlatBuffers over WebSocket for efficient data transfer

---

## System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Browser                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Frontend SPA                                │  │
│  │  TypeScript + uPlot + FlatBuffers                             │  │
│  │  - Dashboard with live temperature chart                       │  │
│  │  - Program management (list, edit, preview)                   │  │
│  │  - Preferences configuration                                   │  │
│  │  - Debug/logs viewer                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                    WebSocket (FlatBuffers)                          │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         ESP32 Backend                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  WebSocket  │  │    HTTP     │  │   SPIFFS    │                 │
│  │   Server    │  │   Server    │  │ Filesystem  │                 │
│  │ (FlatBuffers)│  │(static,fw) │  │(programs,   │                 │
│  └──────┬──────┘  └──────┬──────┘  │ logs,conf)  │                 │
│         │                │         └──────┬──────┘                 │
│         └────────────────┴────────────────┘                        │
│                          │                                          │
│  ┌───────────────────────┴───────────────────────────────────────┐  │
│  │                    Core Controller                             │  │
│  │  - PID temperature control                                     │  │
│  │  - Program execution engine                                    │  │
│  │  - Safety monitoring (thermal runaway, max temps)             │  │
│  │  - State management and broadcasting                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                          │                                          │
│  ┌───────────────────────┴───────────────────────────────────────┐  │
│  │                      Hardware                                  │  │
│  │  - MAX31855 thermocouple interface                            │  │
│  │  - SSR (Solid State Relay) for heater control                 │  │
│  │  - WiFi connectivity                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Communication Protocol

### WebSocket + FlatBuffers

The primary communication channel uses binary FlatBuffers messages over WebSocket for:

- **Efficiency**: Zero-copy reads on ESP32, minimal CPU overhead
- **Type Safety**: Schema-defined messages with code generation
- **Small Payloads**: Binary format without field names

**Endpoint:** `ws://[host]/ws`

**Message Flow:**
```
Client                                Server
  │                                      │
  │──── ClientEnvelope ─────────────────►│
  │     (request_id, message)            │
  │                                      │
  │◄──── ServerEnvelope ─────────────────│
  │      (request_id, response)          │
  │                                      │
  │◄──── ServerEnvelope ─────────────────│  (broadcast, request_id=0)
  │      (State update)                  │
```

**Request/Response Matching:**
- Client assigns unique `request_id` to each request
- Server echoes `request_id` in response
- State broadcasts use `request_id = 0`

### Retained HTTP Endpoints

A small number of HTTP endpoints are retained for specific use cases:

| Endpoint | Purpose |
|----------|---------|
| `GET /logs/:file` | Direct file download |
| `POST /api/stop` | Emergency stop (safety fallback), usable from simple automated systems using tooling such as curl, as well as the frontend |
| `POST /api/reboot` | Device restart |
| `POST /update-firmware` | Firmware upload |

---

## Frontend Architecture

### Technology Stack

- **TypeScript**: Type-safe JavaScript with compile-time checks
- **esbuild**: Fast bundler (~9MB, minimal dependencies)
- **uPlot**: Lightweight time-series charting (~45KB)
- **FlatBuffers**: Binary serialization for WebSocket messages

### Build Process

```bash
# Development (watch mode)
npm run watch

# Production build
npm run build

# Type checking only
npm run typecheck

# Generate FlatBuffers types
npm run generate
```

### File Structure

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
│   │   └── uplot.d.ts      # uPlot declarations
│   └── generated/          # FlatBuffers generated code
│       └── furnace/
├── dist/                   # Build output
├── programs/               # Firing program files (*.json)
├── index.html              # HTML template
├── build.js                # esbuild configuration
├── tsconfig.json
└── package.json
```

### State Management

The frontend maintains several state objects:

```typescript
// Current furnace state (from WebSocket broadcasts)
let state: FurnaceState = {
  program_status: 0,      // See ProgramStatusCode enum
  program_name: null,
  kiln_temp: 0,
  set_temp: 0,
  env_temp: 0,
  case_temp: 0,
  heat_percent: 0,
  temp_change: 0,
  step: '',
  prog_start: null,
  prog_end: null,
  curr_time: ''
};

// Chart data (temperature history)
const chartData: ChartData = {
  timestamps: [],
  kilnTemps: [],
  setTemps: [],
  envTemps: [],
  caseTemps: [],
  markers: []
};

// Program profile overlay
let programProfile: ProgramProfile | null = null;
```

### Routing

Hash-based routing with views:

| Hash | View |
|------|------|
| `#/` or `#/dashboard` | Dashboard with chart |
| `#/programs` | Program list |
| `#/editor` | Program editor |
| `#/logs` | Log files |
| `#/preferences` | Settings |
| `#/debug` | Debug info |
| `#/about` | About page |

---

## Program Format

Programs are stored as JSON files with a structured segment format:

```json
{
  "description": "Bisque firing schedule",
  "segments": [
    {
      "target": 500,
      "ramp_time": { "hours": 2, "minutes": 0, "seconds": 0 },
      "dwell_time": { "hours": 0, "minutes": 30, "seconds": 0 }
    },
    {
      "target": 1000,
      "ramp_time": { "hours": 3, "minutes": 0, "seconds": 0 },
      "dwell_time": { "hours": 1, "minutes": 0, "seconds": 0 }
    }
  ]
}
```

**Segment Fields:**
- `target`: Target temperature in °C
- `ramp_time`: Time to reach target from previous temperature
- `dwell_time`: Time to hold at target before next segment

---

## Program Status Codes

```typescript
enum ProgramStatus {
  NONE = 0,              // No program loaded
  READY = 1,             // Program loaded, ready to start
  RUNNING = 2,           // Program executing
  PAUSED = 3,            // Program paused
  STOPPED = 4,           // Program stopped by user
  ERROR = 5,             // Program encountered an error
  WAITING_THRESHOLD = 6, // Waiting for temperature threshold
  FINISHED = 7           // Program completed successfully
}
```

---

## Development Environment

See [DEVELOPMENT.md](DEVELOPMENT.md) for the complete development guide, including:
- Docker setup and commands
- Running npm commands through the container
- FlatBuffers code generation
- Simulator configuration
- Adding new features

### Quick Start

```bash
cd simulator
docker-compose up --build
# Open http://localhost:3000
```

---

## FlatBuffers Schema

The schema is defined in `proto/furnace.fbs` and shared between frontend and backend.

**Key Message Types:**

**Client → Server:**
- Commands: `StartCommand`, `PauseCommand`, `ResumeCommand`, `StopCommand`, `LoadCommand`, `UnloadCommand`, `SetTempCommand`
- Requests: `HistoryRequest`, `ListProgramsRequest`, `GetProgramRequest`, `SaveProgramRequest`, `DeleteProgramRequest`, `GetPreferencesRequest`, `SavePreferencesRequest`, `GetDebugInfoRequest`, `ListLogsRequest`, `GetLogRequest`

**Server → Client:**
- Broadcasts: `State` (periodic updates)
- Responses: `Ack`, `HistoryResponse`, `ProgramListResponse`, `ProgramContentResponse`, `PreferencesResponse`, `DebugInfoResponse`, `LogListResponse`, `LogContentResponse`, `Error`

**Code Generation:**
```bash
# Frontend
cd frontend && npm run generate

# Simulator
cd simulator && npm run generate
```

---

## Temperature History

The system maintains 24 hours of temperature history at 10-second intervals:

```typescript
interface HistoryPoint {
  t: number;   // Timestamp (ms)
  k: number;   // Kiln temperature (°C)
  s: number;   // Set/target temperature (°C)
  p: number;   // Heat power (%)
  e: number;   // Environment temperature (°C)
  c: number;   // Case temperature (°C)
  m?: {        // Optional marker
    type: number;
    value: string;
  };
}
```

**Marker Types:**
- `0`: Program start
- `1`: Program stop
- `2`: Target change
- `3`: Step complete

---

## Chart Features

The dashboard chart (uPlot) provides:

- **Multiple Series**: Kiln temp, target temp, env temp, case temp
- **Program Profile Overlay**: Shows target curve when program loaded
- **Pan/Zoom**: Mouse drag and scroll wheel
- **Overview Bar**: Minimap for navigation
- **Auto-scroll**: Follows current time during program execution
- **Reset/Recenter**: Buttons to restore default view

---

## Safety Features

The ESP32 backend implements several safety mechanisms:

- **Thermal Runaway Detection**: Alerts if temperature rises unexpectedly
- **Maximum Temperature Limits**: Kiln and housing temperature caps
- **Thermocouple Error Handling**: Grace period for transient read failures
- **Emergency Stop**: HTTP endpoint for immediate shutdown

---

## Configuration

Preferences are stored in `furnace.conf` on the ESP32 SPIFFS filesystem:

**Categories:**
- WiFi: SSID, password, mode, retry count
- HTTP: Authentication credentials
- Time: NTP servers, timezone offsets
- PID: Control parameters (Kp, Ki, Kd, window, threshold)
- Logging: Interval, file limits
- Safety: Temperature limits, thermal runaway settings
- Debug: Serial/syslog output options

---

## Related Files

| File | Purpose |
|------|---------|
| `DEVELOPMENT.md` | Development workflow and commands |
| `API.md` | Complete API reference |
| `frontend/PLAN_SPA.md` | Frontend development plan |
| `src/PLAN_FLATBUFFERS.md` | ESP32 FlatBuffers implementation |
| `proto/furnace.fbs` | FlatBuffers schema |
| `simulator/README.md` | Simulator documentation |
| `bdd/` | Gherkin feature specifications |


# Simulator Plan

Mock server that simulates ESP32 API endpoints for frontend development.

## Status: COMPLETE

## Dependencies

- [Dev Container](../PLAN_DEVCONTAINER.md) - Must be set up first

## Related

- [SPA Frontend](../data/PLAN_SPA.md) - The web frontend that uses this simulator

## Documentation

**When modifying any API endpoint, update [API.md](../API.md) to reflect changes.**

## Overview

A Node.js/Express server that mimics the real PIDKiln ESP32 HTTP API, allowing frontend development without hardware.

---

## Step 1: HTTP API [COMPLETE]

Basic REST endpoints for all PIDKiln operations.

**Files:**
| File | Status | Purpose |
|------|--------|---------|
| `server.js` | ✅ Done | Express HTTP server |
| `mock-data.js` | ✅ Done | Mock data generators and state |
| `README.md` | ✅ Done | Documentation |

---

## Step 2: WebSocket API [COMPLETE]

Convert real-time data delivery from polling to WebSocket push.

### WebSocket Endpoint

```
ws://localhost:3000/ws
```

### Message Protocol

**Server → Client (push updates):**

```json
// Full state update (sent on connect and periodically)
{
  "type": "state",
  "data": {
    "program_status": 2,
    "kiln_temp": 125.5,
    "set_temp": 200.0,
    "env_temp": 22.3,
    "case_temp": 35.1,
    "heat_percent": 85,
    "temp_change": 45.2,
    "step": "2 of 7",
    "program_name": "program1.txt",
    "prog_start": "2024-01-15 10:30:00",
    "prog_end": "2024-01-15 14:30:00",
    "curr_time": "2024-01-15 11:15:32"
  }
}

// Log data point (sent during program run, per LOG_Window interval)
{
  "type": "log",
  "data": {
    "timestamp": "2024-01-15T11:15:32.000Z",
    "kiln_temp": 125.5,
    "set_temp": 200.0,
    "power": 85
  }
}

// Error/notification
{
  "type": "error",
  "message": "Thermocouple read failure"
}
```

**Client → Server (commands):**

```json
{ "type": "command", "action": "start" }
{ "type": "command", "action": "start", "segment": 2 }
{ "type": "command", "action": "start", "minute": 390 }
{ "type": "command", "action": "pause" }
{ "type": "command", "action": "resume" }
{ "type": "command", "action": "stop" }
{ "type": "command", "action": "abort" }
{ "type": "command", "action": "load", "program": "program1.txt" }
{ "type": "command", "action": "set_temp", "temperature": 500.0 }
```

**Start command options:**
- No params: Start from beginning
- `segment`: Start from specific segment (1-indexed)
- `minute`: Start from specific minute into the program

**Server → Client (command response):**

```json
{ "type": "ack", "action": "start", "success": true }
{ "type": "ack", "action": "load", "success": false, "error": "File not found" }
```

### HTTP Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/programs/` | List programs |
| GET | `/programs/:filename` | Get program content |
| POST | `/upload` | Upload program |
| POST | `/delete` | Delete program |
| GET | `/logs/` | List logs |
| GET | `/logs/:filename` | Get log CSV |
| GET | `/api/preferences` | Get preferences |
| POST | `/api/preferences` | Save preferences |
| GET | `/api/debug` | System debug info |
| GET | `/api/history` | Temperature history (24h) |
| GET | `/etc/pidkiln.conf` | Config file download |
| POST | `/api/reboot` | Reboot device |
| POST | `/api/temperature` | Set target temperature |

### Legacy Endpoints (deprecated)

- `GET /PIDKiln_vars.json` - Use WebSocket instead
- `POST /api/program/:action` - Use WebSocket instead

---

## Step 3: Temperature History API [COMPLETE]

Added endpoint to retrieve temperature history for chart population.

### Endpoint

```
GET /api/history?since=<timestamp>&limit=<count>
```

### Features

- Stores 24 hours of data at 10 second intervals (max 8640 points)
- Includes event markers for program lifecycle:
  - `start` - Program started (value: program name)
  - `stop` - Program stopped by user
  - `abort` - Program aborted
  - `finish` - Program completed
  - `pause` - Program paused
  - `resume` - Program resumed
  - `target` - Target temperature changed (value: new temp)
  - `step` - Program step completed (value: step number)

### Response Format

```json
{
  "interval_ms": 10000,
  "max_age_ms": 86400000,
  "count": 360,
  "data": [
    { "t": 1705312800000, "k": 25.5, "s": 0, "p": 0 },
    { "t": 1705312810000, "k": 95.0, "s": 100, "p": 85, "m": { "type": "start", "value": "program1.txt" } }
  ]
}
```

---

## Program Status Codes

| Code | Constant | Description |
|------|----------|-------------|
| 0 | NONE | No program loaded |
| 1 | READY | Program loaded, ready to start |
| 2 | RUNNING | Program executing |
| 3 | PAUSED | Program paused |
| 4 | STOPPED | Program stopped by user |
| 5 | ABORTED | Program aborted (error or user) |
| 6 | WAITING_THRESHOLD | Waiting for temperature threshold |
| 7 | FINISHED | Program completed successfully |
| 8 | FAILED | Program failed |

---

## Testing

```bash
# Start the container
cd simulator
docker-compose up --build

# Test HTTP endpoints
curl http://localhost:3000/programs/
curl http://localhost:3000/api/preferences
curl http://localhost:3000/api/history
curl "http://localhost:3000/api/history?limit=10"

# Test WebSocket
websocat ws://localhost:3000/ws
```

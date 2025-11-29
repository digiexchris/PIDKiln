# Furnace API Reference

Complete API documentation for the Furnace HTTP and WebSocket interfaces.

---

## Protocol Overview

The Furnace API uses **FlatBuffers over WebSocket** as the primary protocol for all real-time communication. A small number of HTTP endpoints are retained for specific use cases.

### FlatBuffers Schema

The FlatBuffers schema is defined in `proto/furnace.fbs`. Key message types:

**Client → Server (ClientEnvelope):**
- Commands: `StartCommand`, `PauseCommand`, `ResumeCommand`, `StopCommand`, `LoadCommand`, `UnloadCommand`, `SetTempCommand`
- Requests: `HistoryRequest`, `ListProgramsRequest`, `GetProgramRequest`, `SaveProgramRequest`, `DeleteProgramRequest`, `GetPreferencesRequest`, `SavePreferencesRequest`, `GetDebugInfoRequest`, `ListLogsRequest`, `GetLogRequest`

**Server → Client (ServerEnvelope):**
- Broadcasts: `State` (periodic state updates)
- Responses: `Ack`, `HistoryResponse`, `ProgramListResponse`, `ProgramContentResponse`, `PreferencesResponse`, `DebugInfoResponse`, `LogListResponse`, `LogContentResponse`, `Error`

Each envelope includes a `request_id` for matching requests to responses.

### Retained HTTP Endpoints

Only the following HTTP endpoints are available:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/logs/:filename` | Direct log file download |
| POST | `/api/stop` | Emergency stop (HTTP fallback for safety) |
| POST | `/api/reboot` | Reboot device |
| POST | `/update-firmware` | Firmware upload |

All other API operations use FlatBuffers over WebSocket.

---

## WebSocket API

### Endpoint

```
ws://[host]:3000/ws
```

**Note:** Set `ws.binaryType = 'arraybuffer'` for FlatBuffers mode.

### Server → Client Messages

#### State Update (FlatBuffers)
Sent on connect and periodically during operation. In FlatBuffers mode, this is a `ServerEnvelope` containing a `State` message.

#### State Update (JSON - Legacy)
Sent on connect and every ~1 second during program execution.

```json
{
  "type": "state",
  "data": {
    "program_status": 2,
    "program_name": "program1.txt",
    "kiln_temp": 125.5,
    "set_temp": 200.0,
    "env_temp": 22.3,
    "case_temp": 35.1,
    "heat_percent": 85,
    "temp_change": 45.2,
    "step": "2 of 7",
    "prog_start": "2024-01-15 10:30:00",
    "prog_end": "2024-01-15 14:30:00",
    "curr_time": "2024-01-15 11:15:32"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `program_status` | int | Program state (see [Status Codes](#program-status-codes)) |
| `program_name` | string | Loaded program filename |
| `kiln_temp` | float | Current kiln temperature (°C) |
| `set_temp` | float | Target temperature (°C) |
| `env_temp` | float | Environment/ambient temperature (°C) |
| `case_temp` | float | Controller housing temperature (°C) |
| `heat_percent` | int | Heater duty cycle (0-100%) |
| `temp_change` | float | Temperature change rate (°C/hour) |
| `step` | string | Current program step (e.g., "2 of 7") |
| `prog_start` | string | Program start time |
| `prog_end` | string | Estimated completion time |
| `curr_time` | string | Current system time |

#### Log Data Point
Sent during program run at LOG_Window interval (default 10s).

```json
{
  "type": "log",
  "data": {
    "timestamp": "2024-01-15T11:15:32.000Z",
    "kiln_temp": 125.5,
    "set_temp": 200.0,
    "power": 85
  }
}
```

#### Error/Notification
Sent when an error or notable event occurs.

```json
{
  "type": "error",
  "message": "Thermocouple read failure"
}
```

#### Command Acknowledgment
Sent in response to client commands.

```json
{
  "type": "ack",
  "action": "start",
  "success": true
}
```

```json
{
  "type": "ack",
  "action": "load",
  "success": false,
  "error": "File not found"
}
```

### Client → Server Messages

#### Program Control Commands

```json
{ "type": "command", "action": "start" }
{ "type": "command", "action": "start", "segment": 2 }
{ "type": "command", "action": "start", "minute": 390 }
{ "type": "command", "action": "pause" }
{ "type": "command", "action": "resume" }
{ "type": "command", "action": "stop" }
```

| Action | Description |
|--------|-------------|
| `start` | Start loaded program |
| `pause` | Pause running program |
| `resume` | Resume paused program |
| `stop` | Stop program gracefully |

**Start Command Options:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `segment` | int | No | Start from specific segment (1-indexed). Skips earlier segments. |
| `minute` | int | No | Start from specific minute into the program. Calculates which segment and adjusts timing. |

Only one of `segment` or `minute` should be provided. If both are provided, `segment` takes precedence.

#### Load Program

```json
{ "type": "command", "action": "load", "program": "program1.json" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `program` | string | Yes | Filename of program to load |

#### Unload Program

```json
{ "type": "command", "action": "unload" }
```

Clears the currently loaded program. Cannot be called while a program is running.

#### Set Target Temperature

```json
{ "type": "command", "action": "set_temp", "temperature": 500.0 }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `temperature` | float | Yes | Target temperature in °C |

**Behavior:**
- If no program running: Starts manual hold mode at the specified temperature
- If program running: Overrides the current segment's target temperature

---

## HTTP API

### Programs

#### List Programs
```
GET /programs/
```

**Response:**
```json
{
  "files": [
    { "name": "program1.txt", "size": 245, "description": "Test program" },
    { "name": "bisque.txt", "size": 512, "description": "Cone 06 bisque" }
  ]
}
```

#### Get Program Content
```
GET /programs/:filename
```

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `filename` | path | Program filename |

**Response:** `text/plain` program content

**Example:**
```
GET /programs/program1.txt
```

#### Upload Program
```
POST /upload
Content-Type: multipart/form-data
```

**Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `upload` | file | Yes | Program file (.txt, max 10KB, max 20 char filename) |

**Response:** `200 OK` on success

#### Delete Program
```
POST /delete
Content-Type: application/json
```

**Body:**
```json
{ "file": "program1.txt" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | string | Yes | Filename to delete |

**Response:** `200 OK` on success

**Note:** Also accepts `application/x-www-form-urlencoded` for backwards compatibility.

---

### Logs

#### List Logs
```
GET /logs/
```

**Response:**
```json
{
  "files": [
    { "name": "2024-01-15_program1.csv", "size": 4096 },
    { "name": "2024-01-14_test.csv", "size": 2048 }
  ]
}
```

#### Get Log Content
```
GET /logs/:filename
```

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `filename` | path | Log filename |

**Response:** `text/csv` log content

**Example:**
```
GET /logs/2024-01-15_program1.csv
```

---

### Preferences

#### Get Preferences
```
GET /api/preferences
```

**Response:**
```json
{
  "WiFi_SSID": "MyNetwork",
  "WiFi_Password": "secret",
  "WiFi_Mode": 1,
  "WiFi_Retry_cnt": 9,
  "Auth_Username": "admin",
  "Auth_Password": "hotashell",
  "HTTP_Local_JS": 1,
  "NTP_Server1": "0.pool.ntp.org",
  "NTP_Server2": "1.pool.ntp.org",
  "NTP_Server3": "2.pool.ntp.org",
  "GMT_Offset_sec": 3600,
  "Daylight_Offset_sec": 3600,
  "Initial_Date": "2022-05-30",
  "Initial_Time": "11:00:00",
  "PID_Window": 5000,
  "PID_Kp": 20,
  "PID_Ki": 0.2,
  "PID_Kd": 0.1,
  "PID_POE": 0,
  "PID_Temp_Threshold": -1,
  "LOG_Window": 10,
  "LOG_Files_Limit": 40,
  "MIN_Temperature": 10,
  "MAX_Temperature": 1350,
  "MAX_Housing_Temperature": 130,
  "Thermal_Runaway": 0,
  "Alarm_Timeout": 5,
  "MAX31855_Error_Grace_Count": 5,
  "DBG_Serial": 1,
  "DBG_Syslog": 0,
  "DBG_Syslog_Srv": "192.168.1.2",
  "DBG_Syslog_Port": 514
}
```

#### Save Preferences
```
POST /api/preferences
Content-Type: application/json
```

**Body:** JSON object with preference key-value pairs to update

**Response:**
```json
{ "success": true }
```

#### Get Config File
```
GET /etc/pidkiln.conf
```

**Response:** `text/plain` configuration file in INI-like format

---

### System

#### Get Temperature History
```
GET /api/history
```

Returns up to 24 hours of temperature data at 10 second intervals, including event markers.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `since` | int | No | Unix timestamp (ms) - return data after this time |
| `limit` | int | No | Max number of points to return |

**Response:**
```json
{
  "interval_ms": 10000,
  "max_age_ms": 86400000,
  "count": 360,
  "data": [
    { "t": 1705312800000, "k": 25.5, "s": 0, "p": 0 },
    { "t": 1705312810000, "k": 25.6, "s": 0, "p": 0 },
    { "t": 1705312820000, "k": 95.0, "s": 100, "p": 85, "m": { "type": "start", "value": "program1.txt" } },
    { "t": 1705313420000, "k": 100.2, "s": 100, "p": 45, "m": { "type": "step", "value": 1 } },
    { "t": 1705314020000, "k": 200.0, "s": 200, "p": 60, "m": { "type": "step", "value": 2 } },
    { "t": 1705314620000, "k": 198.5, "s": 0, "p": 0, "m": { "type": "stop" } }
  ]
}
```

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

**Marker Types:**
| Type | Value | Description |
|------|-------|-------------|
| `start` | program name | Program started |
| `stop` | - | Program stopped by user |
| `finish` | - | Program completed successfully |
| `pause` | - | Program paused |
| `resume` | - | Program resumed |
| `target` | temperature | Manual target temperature set |
| `step` | step number | Program step completed |

---

#### Get Debug Info
```
GET /api/debug
```

**Response:**
```json
{
  "CHIP_ID": "ESP32-D0WDQ6",
  "CHIP_REV": "1",
  "CHIP_MODEL": "ESP32",
  "CHIP_CORES": "2",
  "CPU_FREQ": "240",
  "SDK_VERSION": "v4.4.4",
  "MAC_ADDRESS": "AA:BB:CC:DD:EE:FF",
  "SFLASH_RAM": "4",
  "FLASH_FREQ": "80",
  "FLASH_MODE": "QIO",
  "SKETCH_SIZE": "1234",
  "SKETCH_TOTAL": "1966",
  "TOTAL_PSRAM": "4096",
  "FREE_PSRAM": "3800",
  "SMALEST_PSRAM": "3500",
  "LARGEST_PSRAM": "3700",
  "TOTAL_HEAP": "320",
  "FREE_HEAP": "180",
  "SMALEST_HEAP": "150",
  "LARGEST_HEAP": "170",
  "TOTAL_KB": "1500",
  "USED_KB": "450",
  "VERSION": "PIDKiln v1.2.3"
}
```

#### Set Target Temperature
```
POST /api/temperature
Content-Type: application/json
```

**Body:**
```json
{ "temperature": 500.0 }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `temperature` | float | Yes | Target temperature in °C (MIN_Temperature to MAX_Temperature) |

**Response:**
```json
{ "success": true, "temperature": 500.0 }
```

**Behavior:**
- If no program running: Starts manual hold mode at the specified temperature
- If program running: Overrides the current segment's target temperature

#### Stop Program (HTTP)

```
POST /api/stop
Content-Type: application/json
```

**Description:**
- Stops the current program gracefully (same as WebSocket `stop` command)  
- Useful for automation or one-click “panic stop” links

**Response:**
```json
{ "success": true, "status": 4 }
```

If no program is running, the endpoint still succeeds but the status stays at `READY`.

#### Reboot Device
```
POST /api/reboot
```

**Response:**
```json
{ "success": true, "message": "Rebooting..." }
```

Note: Connection will be lost after response is sent.

#### Upload Firmware
```
POST /update-firmware
Content-Type: multipart/form-data
```

**Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `update` | file | Yes | Firmware binary file (.bin) |

**Response:** `200 OK` on success, device restarts automatically

**Warning:** Device will restart after successful upload. Do not interrupt the upload process.

---

### Legacy Endpoints (Deprecated)

These endpoints exist for backwards compatibility but are superseded by WebSocket.

#### Get Live Data (Deprecated)
```
GET /PIDKiln_vars.json
```

Use WebSocket `state` messages instead.

#### Program Control (Deprecated)
```
POST /api/program/:action
```

| Param | Values |
|-------|--------|
| `action` | `start`, `pause`, `stop`, `load` |

**Body (for load action):**
```json
{ "filename": "program1.txt" }
```

Use WebSocket commands instead.

---

## Program Status Codes

| Code | Constant | Description |
|------|----------|-------------|
| 0 | `NONE` | No program loaded |
| 1 | `READY` | Program loaded, ready to start |
| 2 | `RUNNING` | Program executing |
| 3 | `PAUSED` | Program paused |
| 4 | `STOPPED` | Program stopped by user |
| 5 | `ERROR` | Program encountered an error |
| 6 | `WAITING_THRESHOLD` | Waiting for temperature threshold |
| 7 | `FINISHED` | Program completed successfully |

---

## Program File Format

Programs are JSON files containing an array of temperature profile segments.

**Format (JSON):**
```json
{
  "description": "Program description text",
  "segments": [
    {
      "target": 93,
      "ramp_time": { "hours": 1, "minutes": 0, "seconds": 0 },
      "dwell_time": { "hours": 1, "minutes": 0, "seconds": 0 }
    },
    {
      "target": 260,
      "ramp_time": { "hours": 2, "minutes": 0, "seconds": 0 },
      "dwell_time": { "hours": 0, "minutes": 0, "seconds": 0 }
    }
  ]
}
```

**Segment Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target` | number | Yes | Target temperature in °C (0-1350) |
| `ramp_time` | object | Yes | Time to reach target temperature |
| `dwell_time` | object | Yes | Time to hold at target temperature |

**Time Object:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hours` | number | No | Hours (default: 0) |
| `minutes` | number | No | Minutes (default: 0) |
| `seconds` | number | No | Seconds (default: 0) |

**Example:**
```json
{
  "description": "Cone 06 bisque firing",
  "segments": [
    {
      "target": 93,
      "ramp_time": { "hours": 1, "minutes": 0, "seconds": 0 },
      "dwell_time": { "hours": 1, "minutes": 0, "seconds": 0 }
    },
    {
      "target": 260,
      "ramp_time": { "hours": 2, "minutes": 0, "seconds": 0 },
      "dwell_time": { "hours": 0, "minutes": 0, "seconds": 0 }
    },
    {
      "target": 537,
      "ramp_time": { "hours": 2, "minutes": 0, "seconds": 0 },
      "dwell_time": { "hours": 0, "minutes": 30, "seconds": 0 }
    },
    {
      "target": 1000,
      "ramp_time": { "hours": 3, "minutes": 0, "seconds": 0 },
      "dwell_time": { "hours": 0, "minutes": 15, "seconds": 0 }
    }
  ]
}
```

**Constraints:**
- Max file size: 10KB
- Max filename: 20 characters
- Allowed characters: A-Z, a-z, 0-9, `.`, `_`
- Must end with `.json` (`.txt` format deprecated but supported for backwards compatibility)
- Max temperature: 1350°C
- All time values must be non-negative numbers

**Legacy Text Format (Deprecated):**
The old text format (`target_temp:ramp_minutes:dwell_minutes`) is still supported for backwards compatibility but should not be used for new programs.

---

## Error Handling

HTTP errors return appropriate status codes:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 404 | Resource not found |
| 413 | File too large |
| 500 | Server error |

WebSocket errors are sent as `error` type messages.


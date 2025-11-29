# Simulator Limitations

This document describes features and behaviors that are **not fully functional** in the simulator but would be implemented in the production ESP32 firmware. This helps identify gaps when using the simulator for frontend development.

---

## Preferences System

### Persistence

**Status:** ❌ Not Implemented

- Preferences are stored **in-memory only** (lost on simulator restart)
- No file-based persistence to `pidkiln.conf` or equivalent
- The frontend's "Download Config" link (`/etc/pidkiln.conf`) is not implemented

**Impact:** Preferences must be re-entered after each simulator restart.

---

### Preferences Not Applied

The following preferences are stored but **not used** by the simulator:

#### PID Controller Parameters

| Preference | Default | Status |
|------------|---------|--------|
| `PID_Kp` | 20 | ❌ Ignored (hardcoded: 5.0) |
| `PID_Ki` | 0.2 | ❌ Ignored (hardcoded: 0.02) |
| `PID_Kd` | 0.1 | ❌ Ignored (hardcoded: 1.0) |
| `PID_Window` | 5000 | ❌ Ignored (not applicable) |
| `PID_POE` | 0 | ❌ Ignored (not applicable) |
| `PID_Temp_Threshold` | -1 | ❌ Ignored (not applicable) |

**Impact:** PID tuning cannot be tested via preferences. The simulator uses fixed PID values optimized for simulation.

#### Network Settings

| Preference | Default | Status |
|------------|---------|--------|
| `WiFi_SSID` | 'MyNetwork' | ❌ Not applicable (simulator runs on localhost) |
| `WiFi_Password` | 'secret123' | ❌ Not applicable |
| `WiFi_Mode` | 1 | ❌ Not applicable |
| `WiFi_Retry_cnt` | 9 | ❌ Not applicable |

**Impact:** WiFi configuration is irrelevant for simulator.

#### HTTP Server Settings

| Preference | Default | Status |
|------------|---------|--------|
| `Auth_Username` | 'admin' | ❌ Not enforced (no authentication) |
| `Auth_Password` | 'hotashell' | ❌ Not enforced |
| `HTTP_Local_JS` | 1 | ❌ Not applicable |

**Impact:** Authentication is not implemented in the simulator.

#### Time/NTP Settings

| Preference | Default | Status |
|------------|---------|--------|
| `NTP_Server1` | '0.pl.pool.ntp.org' | ❌ Ignored (simulator uses simulated time) |
| `NTP_Server2` | '1.pl.pool.ntp.org' | ❌ Ignored |
| `NTP_Server3` | '2.pl.pool.ntp.org' | ❌ Ignored |
| `GMT_Offset_sec` | 3600 | ❌ Ignored |
| `Daylight_Offset_sec` | 3600 | ❌ Ignored |
| `Initial_Date` | '2022-05-30' | ❌ Ignored |
| `Initial_Time` | '11:00:00' | ❌ Ignored |

**Impact:** Time synchronization is not simulated. The simulator maintains its own accelerated clock.

#### Logging Settings

| Preference | Default | Status |
|------------|---------|--------|
| `LOG_Window` | 10 | ❌ Ignored (hardcoded: 10 seconds) |
| `LOG_Files_Limit` | 40 | ❌ Ignored (no log file rotation) |

**Impact:** Logging interval cannot be changed. Log file management is not implemented.

#### Debug Settings

| Preference | Default | Status |
|------------|---------|--------|
| `DBG_Serial` | 1 | ❌ Not applicable |
| `DBG_Syslog` | 0 | ❌ Not applicable |
| `DBG_Syslog_Srv` | '192.168.1.2' | ❌ Not applicable |
| `DBG_Syslog_Port` | 514 | ❌ Not applicable |

**Impact:** Debug output configuration is not used.

---

### Preferences Partially Used

#### Temperature Limits

| Preference | Default | Status |
|------------|---------|--------|
| `MIN_Temperature` | 10 | ✅ Used (validates `set_temp` command) |
| `MAX_Temperature` | 1350 | ✅ Used (validates `set_temp` command) |
| `MAX_Housing_Temperature` | 130 | ⚠️ Defined but not enforced (no case overtemperature detection) |

**Impact:** Temperature limits are validated, but case overtemperature protection is not implemented.

---

## Error Detection

### Missing Error Conditions

The following error conditions are **not implemented** in the simulator:

#### Thermocouple Failure

**Status:** ❌ Not Implemented

- `MAX31855_Error_Grace_Count` preference is ignored
- No thermocouple read simulation
- No error state triggered by sensor failures

**Impact:** Cannot test frontend error handling for sensor failures.

#### Thermal Runaway

**Status:** ❌ Not Implemented

- `Thermal_Runaway` preference is ignored
- No detection of kiln temperature exceeding target by threshold
- No automatic error state on runaway

**Impact:** Cannot test thermal runaway protection.

#### Case Overtemperature

**Status:** ❌ Not Implemented

- `MAX_Housing_Temperature` preference is ignored
- Case temperature is calculated but not monitored
- No error state triggered by case overtemperature

**Impact:** Cannot test case temperature protection.

#### Alarm Timeout

**Status:** ❌ Not Implemented

- `Alarm_Timeout` preference is ignored
- No alarm system implemented

**Impact:** Alarm functionality cannot be tested.

---

## Missing HTTP Endpoints

### Config File Download

**Endpoint:** `GET /etc/pidkiln.conf`

**Status:** ❌ Not Implemented

- Frontend preferences page has a "Download Config" link
- Endpoint returns 404
- No config file generation from preferences

**Impact:** Users cannot download the current configuration.

---

## Logging System

### Log File Management

**Status:** ⚠️ Partially Implemented

**Implemented:**
- Log data points are generated during program execution
- Log files can be listed and downloaded via WebSocket API
- Log content is available via `GetLogRequest`

**Not Implemented:**
- `LOG_Files_Limit` preference is ignored (no file rotation)
- Log files are not persisted to disk (lost on restart)
- No automatic cleanup of old log files

**Impact:** Log files accumulate indefinitely and are lost on restart.

---

## Time Management

### NTP Synchronization

**Status:** ❌ Not Implemented

- Simulator uses its own simulated clock
- NTP server preferences are ignored
- Time zone and daylight saving settings are ignored
- `Initial_Date` and `Initial_Time` are ignored

**Impact:** Cannot test time synchronization features.

---

## PID Controller

### Configurable Parameters

**Status:** ❌ Not Implemented

- PID gains (`PID_Kp`, `PID_Ki`, `PID_Kd`) are hardcoded
- `PID_Window` (PWM window) is not applicable
- `PID_POE` (Proportional on Error) is not applicable
- `PID_Temp_Threshold` is not applicable

**Impact:** PID tuning cannot be tested via preferences. The simulator uses fixed values optimized for thermal simulation.

**Current Hardcoded Values:**
- `KP = 5.0`
- `KI = 0.02`
- `KD = 1.0`
- `INTEGRAL_MAX = 100` (anti-windup limit)

---

## Authentication

### HTTP Authentication

**Status:** ❌ Not Implemented

- `Auth_Username` and `Auth_Password` preferences are stored but not enforced
- All HTTP endpoints are accessible without authentication
- WebSocket connections do not require authentication

**Impact:** Security features cannot be tested.

---

## Network Configuration

### WiFi Management

**Status:** ❌ Not Applicable

- WiFi preferences are stored but not used
- Simulator runs on localhost only
- No WiFi connection simulation

**Impact:** Network configuration cannot be tested.

---

## Summary

### Fully Functional Features

✅ Program loading, execution, pause, resume, stop  
✅ Temperature history (24h, 10s intervals)  
✅ Manual temperature control  
✅ Program profile visualization  
✅ WebSocket state updates  
✅ Time acceleration (simulator-specific)  
✅ PID temperature control (with fixed parameters)  
✅ Thermal simulation (heating/cooling)  
✅ Error state with messages (manual trigger only)  
✅ Log data generation  
✅ Debug info display  
✅ Preferences storage (in-memory)  
✅ Temperature limit validation  

### Partially Functional Features

⚠️ Preferences (stored but many not applied)  
⚠️ Logging (generated but not persisted)  
⚠️ Error detection (manual only, no automatic triggers)  

### Not Functional / Not Applicable

❌ Preference persistence  
❌ Config file download  
❌ PID parameter configuration  
❌ NTP time synchronization  
❌ WiFi configuration  
❌ HTTP authentication  
❌ Thermocouple error detection  
❌ Thermal runaway detection  
❌ Case overtemperature detection  
❌ Alarm system  
❌ Log file rotation  

---

## Notes for Frontend Development

When developing the frontend against the simulator:

1. **Preferences:** Changes are accepted but many don't affect behavior. Test with production firmware for full functionality.

2. **Error States:** Use the simulator's `setError()` function (or add a test command) to trigger error states for UI testing.

3. **Time:** The simulator uses accelerated time. Use the time scale slider to speed up testing.

4. **PID Tuning:** PID parameters cannot be changed via preferences. The simulator uses fixed values.

5. **Config Download:** The download link will fail. This is expected in simulator mode.

6. **Authentication:** No authentication is required. All endpoints are open.

7. **Logs:** Log files are generated but not persisted. They will be lost on restart.

---

## Future Enhancements (Not Planned)

These limitations are **intentional** to keep the simulator simple and focused on frontend development. The following are **not planned** for implementation:

- Preference file persistence
- Config file generation
- Full error detection (thermocouple, runaway, case temp)
- NTP synchronization
- WiFi simulation
- HTTP authentication
- Log file persistence

The simulator is designed to test **frontend functionality** and **program execution logic**, not hardware-specific features or security.


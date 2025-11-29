# Furnace Controller Specification

This document defines the backend logic and behavior that the ESP32 firmware must implement. It serves as the authoritative reference for both the simulator and the production firmware.

---

## 1. Program State Machine

### 1.1 States

| Code | Name | Description |
|------|------|-------------|
| 0 | `NONE` | No program loaded, idle state |
| 1 | `READY` | Program loaded, ready to start |
| 2 | `RUNNING` | Program actively executing |
| 3 | `PAUSED` | Program temporarily suspended |
| 4 | `STOPPED` | Program stopped by user |
| 5 | `ERROR` | Error condition (thermocouple failure, thermal runaway, etc.) |
| 6 | `WAITING_THRESHOLD` | Waiting for temperature to reach threshold before starting |
| 7 | `FINISHED` | Program completed all segments successfully |

### 1.2 State Transitions

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│    ┌──────┐  load    ┌───────┐  start   ┌─────────┐             │
│    │ NONE │ ───────► │ READY │ ───────► │ RUNNING │             │
│    └──────┘          └───────┘          └────┬────┘             │
│        ▲                 ▲                   │                  │
│        │                 │              ┌────┴────┐             │
│     unload            unload            │         │             │
│        │                 │         pause│    stop │ complete    │
│        │                 │              ▼         ▼         │   │
│        │            ┌────────┐     ┌────────┐ ┌────────┐    │   │
│        │            │STOPPED │     │ PAUSED │ │FINISHED│◄───┘   │
│        │            └────────┘     └───┬────┘ └────────┘        │
│        │                 ▲             │                        │
│        │                 │      resume │                        │
│        │              stop             │                        │
│        │                 │             ▼                        │
│        │                 └─────────────┘                        │
│        │                                                        │
│        └────────────────────────────────────────────────────────┘
                              unload (when not RUNNING)
```

### 1.3 Transition Rules

| From State | Action | To State | Conditions |
|------------|--------|----------|------------|
| `NONE` | `load` | `READY` | Valid program file exists |
| `READY` | `start` | `RUNNING` | - |
| `READY` | `unload` | `NONE` | - |
| `RUNNING` | `pause` | `PAUSED` | - |
| `RUNNING` | `stop` | `STOPPED` | - |
| `RUNNING` | (complete) | `FINISHED` | All segments finished |
| `RUNNING` | (error) | `ERROR` | Thermocouple failure, thermal runaway, etc. |
| `PAUSED` | `resume` | `RUNNING` | - |
| `PAUSED` | `stop` | `STOPPED` | - |
| `STOPPED` | `start` | `RUNNING` | Program still loaded |
| `STOPPED` | `unload` | `NONE` | - |
| `FINISHED` | `start` | `RUNNING` | Program still loaded |
| `FINISHED` | `unload` | `NONE` | - |
| `ERROR` | `clear_error` | `STOPPED` | Clears error message, returns to STOPPED |
| `ERROR` | `unload` | `NONE` | - |

### 1.4 Invalid Transitions

The following actions are rejected (no state change, return error):

- `unload` while `RUNNING`
- `start` while `RUNNING`
- `pause` while not `RUNNING`
- `resume` while not `PAUSED`

---

## 2. Program Execution

### 2.1 Program Structure

A program consists of an ordered list of **segments**. Each segment defines:

| Field | Type | Description |
|-------|------|-------------|
| `target` | float | Target temperature in °C |
| `ramp_time` | duration | Time to ramp from previous target to this target |
| `dwell_time` | duration | Time to hold at target after ramp completes |

### 2.2 Segment Timing Calculation

For a program with N segments, calculate timing as follows:

```
segment[0].startMinute = 0
segment[0].rampEnd = segment[0].ramp_time
segment[0].endMinute = segment[0].ramp_time + segment[0].dwell_time

For i = 1 to N-1:
    segment[i].startMinute = segment[i-1].endMinute
    segment[i].rampEnd = segment[i].startMinute + segment[i].ramp_time
    segment[i].endMinute = segment[i].startMinute + segment[i].ramp_time + segment[i].dwell_time

totalDuration = segment[N-1].endMinute
```

### 2.3 Target Temperature Calculation

Given elapsed time `t` (in minutes since program start):

```python
def calculate_target(t, segments, program_start_temp):
    # Find current segment
    current_segment = None
    for seg in segments:
        if seg.startMinute <= t < seg.endMinute:
            current_segment = seg
            break
    
    if current_segment is None:
        return 0  # Program complete
    
    minute_in_segment = t - current_segment.startMinute
    
    # Determine previous target
    if current_segment.index == 0:
        prev_target = program_start_temp  # First segment: start from kiln temp at program start
    else:
        prev_target = segments[current_segment.index - 1].target
    
    # Calculate target based on phase
    if current_segment.ramp_time == 0:
        # No ramp: immediate jump to target
        return current_segment.target
    elif minute_in_segment < current_segment.ramp_time:
        # Ramp phase: linear interpolation
        progress = minute_in_segment / current_segment.ramp_time
        return prev_target + (current_segment.target - prev_target) * progress
    else:
        # Dwell phase: hold at target
        return current_segment.target
```

### 2.4 Decision Table: Target Temperature

| Segment | Ramp Time | Time in Segment | Target Temperature |
|---------|-----------|-----------------|-------------------|
| First (index=0) | 0 | Any | `segment.target` |
| First (index=0) | > 0 | < ramp_time | Interpolate from `programStartTemp` to `segment.target` |
| First (index=0) | > 0 | >= ramp_time | `segment.target` |
| Other (index>0) | 0 | Any | `segment.target` |
| Other (index>0) | > 0 | < ramp_time | Interpolate from `prev_segment.target` to `segment.target` |
| Other (index>0) | > 0 | >= ramp_time | `segment.target` |

### 2.5 Program Start Behavior

When a program starts:

1. Record `programStartTime` = current time
2. Record `programStartTemp` = current kiln temperature
3. Set `currentStep` = 1
4. Set `programStatus` = `RUNNING`
5. Calculate `programEndTime` = `programStartTime` + total program duration
6. Record history marker: `{ type: "start", value: programName }`
7. Begin simulation/control loop

### 2.6 Program Completion Behavior

When all segments complete:

1. Set `programStatus` = `FINISHED`
2. Set `setTemp` = 0
3. Record history marker: `{ type: "finish" }`
4. Continue thermal simulation (cooling to ambient)

### 2.7 Step Tracking

The `currentStep` field indicates the 1-indexed segment number:

- `currentStep = 1` during first segment
- `currentStep = 2` during second segment
- etc.

When transitioning between segments, record a history marker:
```json
{ "type": "step", "value": { "segment": N, "target": T } }
```

---

## 3. PID Temperature Controller

### 3.1 Algorithm

The PID controller calculates heater output as:

```
error = setTemp - kilnTemp

P_term = Kp × error
I_term = Ki × ∫error dt  (with anti-windup)
D_term = Kd × d(error)/dt

output = P_term + I_term + D_term
heatPercent = clamp(output, 0, 100)
```

### 3.2 Tuning Parameters

| Parameter | Symbol | Default | Description |
|-----------|--------|---------|-------------|
| Proportional Gain | Kp | 5.0 | Response to current error |
| Integral Gain | Ki | 0.02 | Response to accumulated error |
| Derivative Gain | Kd | 1.0 | Response to rate of change |
| Integral Max | - | 100 | Anti-windup limit for integral term |

### 3.3 Anti-Windup

To prevent integral windup during large temperature differences:

```
integral = integral + error × dt
integral = clamp(integral, -INTEGRAL_MAX, +INTEGRAL_MAX)
```

### 3.4 PID Reset Conditions

Reset PID state (integral=0, lastError=0) when:

- Program stops
- Program finishes
- Error condition occurs
- Transitioning to cooling mode

---

## 4. Thermal Model (Simulator Only)

### 4.1 Heat Transfer Equation

```
netChange = (heatInput - heatLoss) × dt / thermalMass
kilnTemp = kilnTemp + netChange
```

Where:
- `heatInput = heaterPower × (heatPercent / 100)`
- `heatLoss = coolingCoefficient × (kilnTemp - ambientTemp)` (Newton's law of cooling)
- `dt` = simulated time step in seconds

### 4.2 Thermal Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `heaterPower` | 0.5 | Heater power factor |
| `coolingCoefficient` | 0.0001 | Heat loss rate |
| `thermalMass` | 100 | Thermal inertia |
| `ambientTemp` | 20.0 | Environment temperature (°C) |
| `caseHeatTransfer` | 0.03 | Heat transfer to case |
| `caseBaseTemp` | 25.0 | Base case temperature (°C) |

### 4.3 Case Temperature

```
caseTemp = caseBaseTemp + (kilnTemp - ambientTemp) × caseHeatTransfer
```

### 4.4 Cooling Behavior

When program is `STOPPED`, `FINISHED`, or `ERROR`:

1. Set `heatPercent = 0`
2. Continue thermal simulation until `kilnTemp ≈ ambientTemp`
3. Stop simulation loop when `|kilnTemp - ambientTemp| < 0.5°C`

---

## 5. Time Simulation (Simulator Only)

### 5.1 Time Scale

The simulator supports accelerated time:

```
simulatedElapsed = realElapsed × timeScale
simulatedTime = simulatedTime + simulatedElapsed
```

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `timeScale` | 1.0 - 100.0 | 1.0 | Time acceleration factor |

### 5.2 Timestamps

All timestamps in state updates use simulated time:
- `curr_time_ms`: Current simulated time (Unix ms)
- `prog_start`: Program start simulated time
- `prog_end`: Estimated program end simulated time

The frontend uses `curr_time_ms` for its "Now" marker when connected to a simulator.

---

## 6. Temperature History

### 6.1 Storage Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Interval | 10 seconds | Time between history points |
| Max Age | 24 hours | Oldest data retained |
| Max Points | 8,640 | Maximum stored points |

### 6.2 History Point Structure

```json
{
  "t": 1705312800000,  // Timestamp (Unix ms)
  "k": 125.5,          // Kiln temperature (°C)
  "s": 200.0,          // Set/target temperature (°C)
  "p": 85,             // Heater power (0-100%)
  "e": 22.3,           // Environment temperature (°C)
  "c": 35.1,           // Case temperature (°C)
  "m": { ... }         // Optional event marker
}
```

### 6.3 Event Markers

| Type | Value | When Recorded |
|------|-------|---------------|
| `start` | program name | Program starts |
| `stop` | - | User stops program |
| `finish` | - | Program completes all segments |
| `pause` | - | Program paused |
| `resume` | - | Program resumed |
| `target` | temperature | Manual target set |
| `step` | `{ segment, target }` | Segment transition |

### 6.4 History Pruning

On each history write:
```
Remove all points where (currentTime - point.timestamp) > MAX_AGE
```

---

## 7. Manual Temperature Control

### 7.1 Set Temperature Command

When `set_temp` command received:

**If no program running (`NONE` or `READY`):**
1. Set `setTemp` = requested temperature
2. Set `programStatus` = `RUNNING` (manual hold mode)
3. Record marker: `{ type: "target", value: temperature }`
4. Start control loop

**If program running:**
1. Override `setTemp` for current segment
2. Record marker: `{ type: "target", value: temperature }`

---

## 8. Error Conditions

### 8.1 Thermocouple Failure

If thermocouple read fails:
1. Increment error counter
2. If `errorCount > MAX31855_Error_Grace_Count`:
   - Set `programStatus` = `ERROR`
   - Set `heatPercent` = 0
   - Record error event

### 8.2 Thermal Runaway

If `kilnTemp > setTemp + Thermal_Runaway_Threshold`:
1. Set `programStatus` = `ERROR`
2. Set `heatPercent` = 0
3. Record error event

### 8.3 Case Overtemperature

If `caseTemp > MAX_Housing_Temperature`:
1. Set `programStatus` = `ERROR`
2. Set `heatPercent` = 0
3. Record error event

---

## 9. WebSocket Communication

### 9.1 State Broadcast

Broadcast state to all connected clients:
- On connect
- On state change
- Periodically (every tick, ~1 second)

### 9.2 State Message Fields

| Field | Type | Description |
|-------|------|-------------|
| `program_status` | int | Current state code |
| `program_name` | string | Loaded program filename |
| `kiln_temp` | float | Current kiln temperature |
| `set_temp` | float | Target temperature |
| `env_temp` | float | Environment temperature |
| `case_temp` | float | Case temperature |
| `heat_percent` | int | Heater duty cycle (0-100) |
| `temp_change` | float | Temperature change rate (°C/hour) |
| `step` | string | Current step (e.g., "2 of 7") |
| `prog_start_ms` | long | Program start time (Unix ms) |
| `prog_end_ms` | long | Estimated end time (Unix ms) |
| `curr_time_ms` | long | Current time (Unix ms) |
| `error_message` | string | Error description (null unless ERROR state) |
| `is_simulator` | bool | True if simulator |
| `time_scale` | float | Time acceleration (simulator only) |

---

## 10. Gherkin Scenarios

### 10.1 Program Loading

```gherkin
Feature: Program Loading

  Scenario: Load a valid program
    Given the system is in NONE state
    When I send a load command for "program1.json"
    Then the state should be READY
    And the program_name should be "program1.json"
    And the program content should be parsed and validated

  Scenario: Load program while running is rejected
    Given a program is RUNNING
    When I send a load command for "program2.json"
    Then the command should fail with an error
    And the state should remain RUNNING
    And the original program should still be loaded
```

### 10.2 Program Execution

```gherkin
Feature: Program Execution

  Scenario: Start a loaded program
    Given "program1.json" is loaded (READY state)
    And the kiln temperature is 25°C
    When I send a start command
    Then the state should be RUNNING
    And programStartTime should be recorded
    And programStartTemp should be 25°C
    And a "start" marker should be recorded in history

  Scenario: First segment with ramp time
    Given a program is started with first segment target=100°C, ramp=30min
    And the kiln was at 25°C when started
    When 15 minutes have elapsed
    Then the target temperature should be approximately 62.5°C
    # (25 + (100-25) × 0.5 = 62.5)

  Scenario: First segment with zero ramp time
    Given a program is started with first segment target=100°C, ramp=0min
    When the program starts
    Then the target temperature should immediately be 100°C

  Scenario: Transition between segments
    Given a program is running
    And segment 1 (target=100°C) has completed
    When segment 2 (target=200°C, ramp=30min) begins
    Then a "step" marker should be recorded
    And the target should ramp from 100°C to 200°C over 30 minutes

  Scenario: Program completion
    Given a program is running
    When the final segment's dwell time completes
    Then the state should be FINISHED
    And the target temperature should be 0
    And a "finish" marker should be recorded
    And the kiln should begin cooling to ambient
```

### 10.3 PID Controller

```gherkin
Feature: PID Temperature Control

  Scenario: Heating toward target
    Given the kiln is at 50°C
    And the target is 100°C
    When the control loop runs
    Then the heat output should be greater than 0
    And the proportional term should be positive

  Scenario: Maintaining target temperature
    Given the kiln is at 100°C
    And the target is 100°C
    When the control loop runs
    Then the heat output should be low (maintaining)
    And the integral term should compensate for heat loss

  Scenario: Cooling to lower target
    Given the kiln is at 200°C
    And the target is 100°C
    When the control loop runs
    Then the heat output should be 0
    And the kiln should cool naturally
```

### 10.4 Stop and Resume

```gherkin
Feature: Program Control

  Scenario: Stop a running program
    Given a program is RUNNING
    When I send a stop command
    Then the state should be STOPPED
    And the target temperature should be 0
    And the heater should be off
    And a "stop" marker should be recorded

  Scenario: Restart a stopped program
    Given a program was stopped
    When I send a start command
    Then the state should be RUNNING
    And programStartTime should be updated to now
    And programStartTemp should be the current kiln temperature
    And the program should restart from the beginning

  Scenario: Pause and resume
    Given a program is RUNNING at segment 2
    When I pause the program
    Then the state should be PAUSED
    And the heater should maintain current output
    When I resume the program
    Then the state should be RUNNING
    And the program should continue from where it paused
```

---

## Appendix A: Configuration Parameters

These parameters are stored in preferences and affect controller behavior:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `PID_Kp` | float | 20.0 | Proportional gain |
| `PID_Ki` | float | 0.2 | Integral gain |
| `PID_Kd` | float | 0.1 | Derivative gain |
| `PID_Window` | int | 5000 | PWM window (ms) |
| `MIN_Temperature` | int | 10 | Minimum allowed target (°C) |
| `MAX_Temperature` | int | 1350 | Maximum allowed target (°C) |
| `MAX_Housing_Temperature` | int | 130 | Case overtemp threshold (°C) |
| `Thermal_Runaway` | int | 0 | Runaway detection threshold (0=disabled) |
| `LOG_Window` | int | 10 | History logging interval (seconds) |
| `MAX31855_Error_Grace_Count` | int | 5 | Thermocouple error tolerance |

---

## Appendix B: FlatBuffers Message Reference

See `proto/furnace.fbs` for the complete schema. Key messages:

**Commands (Client → Server):**
- `StartCommand { segment: int, minute: int }`
- `PauseCommand {}`
- `ResumeCommand {}`
- `StopCommand {}`
- `LoadCommand { program: string }`
- `UnloadCommand {}`
- `SetTempCommand { temperature: float }`
- `ClearErrorCommand {}` - Clears error state, returns to STOPPED
- `SetTimeScaleCommand { time_scale: float }` (simulator only)

**State (Server → Client):**
- `State { program_status, program_name, kiln_temp, set_temp, ... }`

**Responses:**
- `Ack { success: bool, error: string }`
- `HistoryResponse { data: [HistoryPoint] }`
- `Error { message: string }`


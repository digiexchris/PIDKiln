# Simulator Known Bugs

Issues to fix in future iterations.

---

## Bug 1: Temperature target doesn't follow program segments

**Status:** Open

**Description:**
When a program is running, the simulator's `setTemp` doesn't progress through the program segments. It stays at the initial segment's target temperature instead of advancing through ramp and dwell phases.

**Expected Behavior:**
- When a program starts, `setTemp` should follow the program's segment schedule
- During ramp phase: `setTemp` should gradually increase/decrease toward segment target
- During dwell phase: `setTemp` should hold at segment target
- When segment completes: advance to next segment and repeat

**Current Behavior:**
- `setTemp` is set once at program start to the first segment's target
- No logic exists to advance through segments over time
- `currentStep` doesn't update as segments complete

**Location:**
- `src/mock-data.ts`: `startSimulation()` and simulation loop in `startSimulationLoop()`

**Fix Required:**
- Track elapsed time since program start
- Calculate which segment should be active based on elapsed time
- Update `setTemp` based on current position in ramp/dwell phase
- Update `currentStep` when segments complete
- Call `recordStepComplete()` when segments finish
- Set `programStatus` to `FINISHED` when all segments complete


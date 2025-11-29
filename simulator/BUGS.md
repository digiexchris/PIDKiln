# Simulator Known Bugs

Issues to fix in future iterations.

---

## Bug 1: Temperature target doesn't follow program segments

**Status:** Fixed

**Description:**
When a program is running, the simulator's `setTemp` doesn't progress through the program segments. It stays at the initial segment's target temperature instead of advancing through ramp and dwell phases.

**Fix Applied:**
Added `updateProgramProgress()` function in `src/mock-data.ts` that:
- Calculates elapsed time since program start using simulated time
- Determines current segment based on elapsed time vs segment timing
- During ramp phase: interpolates `setTemp` from previous target to current target
- During dwell phase: holds `setTemp` at segment target
- Updates `currentStep` when segments change
- Records step completion markers in history
- Sets `programStatus` to `FINISHED` when all segments complete
- Properly estimates and updates `programEndTime`
// Program profile handling for chart

import {
  ws, state,
  programProfile, setProgramProfile,
  programProfileLocked, setProgramProfileLocked,
} from '../state.js';
import { getErrorMessage, timeToSeconds } from '../utils.js';
import { updateChartData, getNowSeconds } from './dashboard.js';
import {
  encodeGetProgramRequest,
  sendRequest,
  DecodedProgramContentResponse,
} from '../flatbuffers.js';

export async function loadProgramProfile(programName: string | null) {
  if (!programName || programName === '(manual hold)') {
    setProgramProfile(null);
    updateChartData();
    return;
  }

  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('Not connected, cannot load program profile');
      return;
    }
    const resp = await sendRequest(ws, encodeGetProgramRequest(programName)) as DecodedProgramContentResponse;
    const content = resp.content;

    const program = JSON.parse(content);
    const segments = program.segments || [];

    if (!segments.length) {
      setProgramProfile(null);
      updateChartData();
      return;
    }

    // Start at current kiln temperature - the first segment will ramp from here
    const startTemp = state.kiln_temp ?? 0;
    const times: number[] = [0];
    const temps: number[] = [startTemp];
    let elapsed = 0;
    let currentTemp = startTemp;

    for (const segment of segments) {
      const target = segment.target ?? currentTemp;
      const rampSeconds = timeToSeconds(segment.ramp_time);

      if (rampSeconds > 0) {
        // Ramp phase: add point at end of ramp
        elapsed += rampSeconds;
        times.push(elapsed / 60);
        temps.push(target);
      } else if (target !== currentTemp) {
        // No ramp time but target changed: instant jump to new target
        times.push(elapsed / 60);
        temps.push(target);
      }

      currentTemp = target;
      const dwellSeconds = timeToSeconds(segment.dwell_time);

      if (dwellSeconds > 0) {
        // Dwell phase: add point at end of dwell (same temp)
        elapsed += dwellSeconds;
        times.push(elapsed / 60);
        temps.push(target);
      }
    }

    setProgramProfile({
      name: programName,
      startTime: null,
      durationMinutes: elapsed / 60,
      times,
      temps,
    });

    console.log('Loaded program profile:', programName, 'duration:', elapsed / 60, 'min', 'points:', times.length);
    updateChartData();
  } catch (err) {
    console.warn('Failed to load program profile:', getErrorMessage(err));
    setProgramProfile(null);
  }
}

export function buildProfileChartData(targetTimestamps: number[]): (number | null)[] {
  if (!programProfile || !programProfile.times.length) {
    return new Array(targetTimestamps.length).fill(null);
  }

  let anchorTime: number;
  if (programProfileLocked && programProfile.startTime) {
    // Program has been started - anchor to the actual start time
    anchorTime = programProfile.startTime;
  } else {
    // Program loaded but not started - anchor to current time (follows "now")
    anchorTime = getNowSeconds();
  }

  const profileTimes = programProfile.times;
  const profileTemps = programProfile.temps;

  const profileTimestamps = profileTimes.map((m: number) => anchorTime + m * 60);
  const profileStart = profileTimestamps[0];
  const profileEnd = profileTimestamps[profileTimestamps.length - 1];

  return targetTimestamps.map(t => {
    if (t < profileStart || t > profileEnd) return null;

    for (let i = 0; i < profileTimestamps.length - 1; i++) {
      if (t >= profileTimestamps[i] && t <= profileTimestamps[i + 1]) {
        const t0 = profileTimestamps[i];
        const t1 = profileTimestamps[i + 1];
        const v0 = profileTemps[i];
        const v1 = profileTemps[i + 1];
        const pct = (t - t0) / (t1 - t0);
        return v0 + (v1 - v0) * pct;
      }
    }
    return null;
  });
}

// Track the last known program status to detect transitions
let lastProgramStatus: number = 0;

export function handleProgramProfileUpdate() {
  const prevProgramName = programProfile?.name;
  const currentProgramName = state.program_name;
  const currentStatus = state.program_status;

  // Clear profile when no program is loaded
  if (!currentProgramName || currentStatus === 0) {
    setProgramProfile(null);
    setProgramProfileLocked(false);
    lastProgramStatus = currentStatus;
    return;
  }

  // When a new program is loaded (name changes), reset the lock and load new profile
  const programJustChanged = currentProgramName !== prevProgramName;
  if (programJustChanged) {
    setProgramProfileLocked(false);
    void loadProgramProfile(currentProgramName);
    lastProgramStatus = currentStatus;
    return;
  }

  // Only process if we have a matching profile
  const profileMatchesProgram = programProfile && programProfile.name === currentProgramName;
  if (!profileMatchesProgram) {
    lastProgramStatus = currentStatus;
    return;
  }

  const wasRunning = lastProgramStatus === 2;
  const isRunning = currentStatus === 2;
  const isReady = currentStatus === 1;

  // Detect transition TO running state (program just started or restarted)
  if (isRunning && !wasRunning && programProfile) {
    // Program just started - lock to the backend's start time
    const hasBackendStartTime = state.prog_start && state.prog_start !== '-';
    if (hasBackendStartTime) {
      const backendStartTime = new Date(state.prog_start!).getTime() / 1000;
      setProgramProfileLocked(true);
      setProgramProfile({
        name: programProfile.name,
        startTime: backendStartTime,
        durationMinutes: programProfile.durationMinutes,
        times: programProfile.times,
        temps: programProfile.temps,
      });
    }
  } else if (isReady && !programProfileLocked) {
    // READY state and not locked - profile should follow "now"
    // (This handles initial load, but doesn't unlock a stopped program)
    setProgramProfileLocked(false);
  }
  // For STOPPED/FINISHED/ERROR states: keep current lock state (don't change anything)
  // For continued RUNNING state: keep current lock state

  // Handle page reload: if running/stopped but not locked, sync with backend
  if ((isRunning || [4, 5, 7].includes(currentStatus)) && !programProfileLocked && programProfile) {
    const hasBackendStartTime = state.prog_start && state.prog_start !== '-';
    if (hasBackendStartTime) {
      const backendStartTime = new Date(state.prog_start!).getTime() / 1000;
      setProgramProfileLocked(true);
      setProgramProfile({
        name: programProfile.name,
        startTime: backendStartTime,
        durationMinutes: programProfile.durationMinutes,
        times: programProfile.times,
        temps: programProfile.temps,
      });
    }
  }

  lastProgramStatus = currentStatus;
}


// Program profile handling for chart

import {
  ws, state,
  programProfile, setProgramProfile,
  programProfileLocked, setProgramProfileLocked,
} from '../state.js';
import { getErrorMessage, timeToSeconds } from '../utils.js';
import { updateChartData } from './dashboard.js';
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

    const times: number[] = [0];
    const temps: number[] = [segments[0].target ?? 0];
    let elapsed = 0;
    let currentTemp = temps[0];

    for (const segment of segments) {
      const target = segment.target ?? currentTemp;
      const rampSeconds = timeToSeconds(segment.ramp_time);

      if (rampSeconds > 0) {
        elapsed += rampSeconds;
        times.push(elapsed / 60);
        temps.push(target);
      } else if (target !== currentTemp) {
        times.push(elapsed / 60);
        temps.push(target);
      }

      currentTemp = target;
      const dwellSeconds = timeToSeconds(segment.dwell_time);

      if (dwellSeconds > 0) {
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
    anchorTime = programProfile.startTime;
  } else {
    anchorTime = Date.now() / 1000;
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

export function handleProgramProfileUpdate() {
  const prevProgramName = programProfile?.name;
  const currentProgramName = state.program_name;

  if (currentProgramName && currentProgramName !== prevProgramName) {
    void loadProgramProfile(currentProgramName);
  }

  const wasLocked = programProfileLocked;
  const isRunning = state.program_status === 2;
  const isStopped = [4, 5, 7].includes(state.program_status);

  if (isRunning && !wasLocked) {
    setProgramProfileLocked(true);
    if (programProfile) {
      setProgramProfile({
        ...programProfile,
        startTime: Date.now() / 1000,
      });
    }
  } else if (isStopped) {
    setProgramProfileLocked(true);
  }

  if (!currentProgramName || state.program_status === 0) {
    setProgramProfile(null);
    setProgramProfileLocked(false);
  }
}


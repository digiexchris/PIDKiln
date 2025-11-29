// WebSocket connection management

import {
  ws, setWs, setState, manualDisconnect, setManualDisconnect,
  reconnectTimeout, setReconnectTimeout, reconnectStartTime, setReconnectStartTime,
  RECONNECT_TIMEOUT_MS, RECONNECT_INTERVAL_MS, resetChartData,
  setProgramProfile, setProgramProfileLocked, state,
} from './state.js';
import type { FurnaceState, ProgramStatusCode, IncomingMessage } from './types/state.js';
import { getErrorMessage } from './utils.js';
import { log } from './views/debug.js';
import { updateUI } from './ui/statusbar.js';
import { addChartPoint, loadChartHistory } from './chart/dashboard.js';
import { loadProgramSelect } from './views/programs.js';
import { handleProgramProfileUpdate } from './chart/profile.js';
import {
  decodeServerMessage,
  resolvePendingRequest,
  DecodedServerMessage,
  DecodedState,
} from './flatbuffers.js';

export function connect() {
  if (manualDisconnect) return;

  if (reconnectStartTime && Date.now() - reconnectStartTime > RECONNECT_TIMEOUT_MS) {
    log('error', 'Reconnect timeout - giving up after 30s');
    setReconnectStartTime(null);
    setConnected(false);
    return;
  }

  const wsUrl = `ws://${window.location.host}/ws`;
  log('sent', `Connecting to ${wsUrl}...`);

  const socket = new WebSocket(wsUrl);
  socket.binaryType = 'arraybuffer';
  setWs(socket);

  socket.onopen = () => {
    setReconnectStartTime(null);
    setConnected(true);
    log('ack', 'Connected (FlatBuffers mode)');
    void loadProgramSelect();
    resetChartData();
    void loadChartHistory();
    setProgramProfile(null);
    setProgramProfileLocked(false);
  };

  socket.onclose = () => {
    setConnected(false);
    if (!manualDisconnect) {
      if (!reconnectStartTime) {
        setReconnectStartTime(Date.now());
      }

      const startTime = reconnectStartTime ?? Date.now();
      if (Date.now() - startTime < RECONNECT_TIMEOUT_MS) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        log('error', `Disconnected - reconnecting in 3s... (${elapsed}s elapsed)`);
        setReconnectTimeout(window.setTimeout(connect, RECONNECT_INTERVAL_MS));
      } else {
        log('error', 'Reconnect timeout - giving up after 30s');
        setReconnectStartTime(null);
        setConnected(false);
      }
    }
  };

  socket.onerror = () => log('error', 'WebSocket error');

  socket.onmessage = (e: MessageEvent) => {
    try {
      if (e.data instanceof ArrayBuffer) {
        const msg = decodeServerMessage(e.data);
        if (msg) {
          handleFlatBuffersMessage(msg);
        }
      } else {
        const msg = JSON.parse(e.data as string);
        handleMessage(msg);
      }
    } catch (err) {
      log('error', `Parse error: ${getErrorMessage(err)}`);
    }
  };
}

export function disconnect() {
  setManualDisconnect(true);
  setReconnectStartTime(null);
  if (reconnectTimeout !== null) {
    window.clearTimeout(reconnectTimeout);
    setReconnectTimeout(null);
  }
  if (ws) {
    ws.close();
    setWs(null);
  }
  setConnected(false);
}

export function manualConnect() {
  setManualDisconnect(false);
  setReconnectStartTime(null);
  connect();
}

function setConnected(connected: boolean) {
  const el = document.getElementById('connection');
  if (!el) return;
  el.classList.toggle('connected', connected);

  let statusText = 'Disconnected';
  if (connected) {
    statusText = 'Connected';
  } else if (!manualDisconnect && reconnectStartTime !== null) {
    statusText = 'Reconnecting...';
  }
  const span = el.querySelector('span');
  if (span) span.textContent = statusText;

  const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement | null;
  const disconnectBtn = document.getElementById('disconnectBtn') as HTMLButtonElement | null;
  if (connectBtn) {
    connectBtn.disabled = connected || (!manualDisconnect && reconnectStartTime !== null);
  }
  if (disconnectBtn) {
    disconnectBtn.disabled = !connected && (manualDisconnect || reconnectStartTime === null);
  }

  const chartOverlay = document.getElementById('chartConnectionLost');
  if (chartOverlay) {
    (chartOverlay as HTMLElement).style.display = connected ? 'none' : 'flex';
  }

  if (!connected) {
    const statusKiln = document.getElementById('statusKiln');
    const statusTarget = document.getElementById('statusTarget');
    const statusEnv = document.getElementById('statusEnv');
    const statusHeat = document.getElementById('statusHeat');
    const statusBadge = document.getElementById('statusBadge');
    if (statusKiln) statusKiln.textContent = 'N/A';
    if (statusTarget) statusTarget.textContent = 'N/A';
    if (statusEnv) statusEnv.textContent = 'N/A';
    if (statusHeat) statusHeat.textContent = 'N/A';
    if (statusBadge) {
      statusBadge.textContent = 'OFFLINE';
      statusBadge.className = 'program-status error';
    }
  }
}

function handleMessage(msg: IncomingMessage) {
  if (msg.type !== 'state') {
    log(msg.type, JSON.stringify('data' in msg ? msg.data : msg));
  }

  if (msg.type === 'state') {
    setState(msg.data as FurnaceState);
    updateUI();
    if (state.kiln_temp !== undefined && state.set_temp !== undefined) {
      addChartPoint(state.kiln_temp, state.set_temp, state.env_temp, state.case_temp);
    }
    handleProgramProfileUpdate();
  }
}

function handleFlatBuffersMessage(msg: DecodedServerMessage) {
  if ('requestId' in msg && msg.requestId > 0) {
    if (resolvePendingRequest(msg.requestId, msg)) {
      return;
    }
  }

  switch (msg.type) {
    case 'state': {
      const s = msg as DecodedState;
      const newState: FurnaceState = {
        program_status: s.programStatus as ProgramStatusCode,
        program_name: s.programName,
        kiln_temp: s.kilnTemp,
        set_temp: s.setTemp,
        env_temp: s.envTemp,
        case_temp: s.caseTemp,
        heat_percent: s.heatPercent,
        temp_change: s.tempChange,
        step: s.step || '',
        prog_start: s.progStartMs ? new Date(Number(s.progStartMs)).toISOString() : null,
        prog_end: s.progEndMs ? new Date(Number(s.progEndMs)).toISOString() : null,
        curr_time: new Date(Number(s.currTimeMs)).toISOString(),
      };
      setState(newState);
      updateUI();
      if (newState.kiln_temp !== undefined && newState.set_temp !== undefined) {
        addChartPoint(newState.kiln_temp, newState.set_temp, newState.env_temp, newState.case_temp);
      }
      handleProgramProfileUpdate();
      break;
    }
    case 'ack':
      log('ack', `success: ${msg.success}${msg.error ? `, error: ${msg.error}` : ''}`);
      break;
    case 'error':
      log('error', `Error ${msg.code}: ${msg.message}`);
      break;
    default:
      log('received', `Unknown message type: ${msg.type}`);
  }
}


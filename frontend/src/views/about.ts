// About view

import { ws } from '../state.js';
import {
  encodeGetDebugInfoRequest,
  sendRequest,
  DecodedDebugInfoResponse,
} from '../flatbuffers.js';

export async function loadAboutInfo() {
  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const resp = await sendRequest(ws, encodeGetDebugInfoRequest()) as DecodedDebugInfoResponse;
    const data = JSON.parse(resp.json);
    const aboutVersion = document.getElementById('aboutVersion');
    if (aboutVersion) {
      aboutVersion.textContent = data.VERSION || 'Unknown';
    }
  } catch {
    const aboutVersion = document.getElementById('aboutVersion');
    if (aboutVersion) {
      aboutVersion.textContent = 'Error loading';
    }
  }
}


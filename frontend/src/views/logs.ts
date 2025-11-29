// Logs view

import { ws } from '../state.js';
import { escapeHtml, escapeJs, getErrorMessage } from '../utils.js';
import {
  encodeListLogsRequest,
  encodeGetLogRequest,
  sendRequest,
  DecodedLogListResponse,
  DecodedLogContentResponse,
} from '../flatbuffers.js';

export async function loadLogsList() {
  const tbody = document.getElementById('logsTableBody');
  if (!tbody) return;
  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text-muted)">Not connected</td></tr>';
      return;
    }
    const resp = await sendRequest(ws, encodeListLogsRequest()) as DecodedLogListResponse;
    if (!resp.logs.length) {
      tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text-muted)">No logs yet</td></tr>';
      return;
    }
    tbody.innerHTML = resp.logs.map((f) => `
          <tr>
            <td>${escapeHtml(f.name)}</td>
            <td>${f.size} B</td>
            <td class="actions">
              <button class="btn-small" onclick="viewLog('${escapeJs(f.name)}')">View</button>
              <button class="btn-small" onclick="downloadLog('${escapeJs(f.name)}')">Download</button>
            </td>
          </tr>
        `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3" style="color:var(--error)">${getErrorMessage(err)}</td></tr>`;
  }
}

export async function viewLog(name: string) {
  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      window.alert('Not connected');
      return;
    }
    const resp = await sendRequest(ws, encodeGetLogRequest(name)) as DecodedLogContentResponse;
    window.alert(resp.content.slice(0, 2000) + (resp.content.length > 2000 ? '\n...(truncated)' : ''));
  } catch (err) {
    window.alert('Error: ' + getErrorMessage(err));
  }
}

export function downloadLog(name: string) {
  window.open(`/logs/${encodeURIComponent(name)}`, '_blank');
}


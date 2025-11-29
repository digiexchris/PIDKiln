// Debug view

import { ws, wsLogEnabled, setWsLogEnabled } from '../state.js';
import { escapeHtml, getErrorMessage } from '../utils.js';
import {
  encodeGetDebugInfoRequest,
  sendRequest,
  DecodedDebugInfoResponse,
} from '../flatbuffers.js';

export async function loadDebugInfo() {
  const table = document.getElementById('debugTable');
  if (!table) return;
  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      table.innerHTML = '<tr><td colspan="2" style="color:var(--text-muted)">Not connected</td></tr>';
      return;
    }
    const resp = await sendRequest(ws, encodeGetDebugInfoRequest()) as DecodedDebugInfoResponse;
    const data = JSON.parse(resp.json);

    const sections: Record<string, string[]> = {
      'Chip Information': ['CHIP_ID', 'CHIP_REV', 'CHIP_MODEL', 'CHIP_CORES', 'CPU_FREQ', 'SDK_VERSION', 'MAC_ADDRESS'],
      Flash: ['SFLASH_RAM', 'FLASH_FREQ', 'FLASH_MODE', 'SKETCH_SIZE', 'SKETCH_TOTAL'],
      PSRAM: ['TOTAL_PSRAM', 'FREE_PSRAM', 'SMALEST_PSRAM', 'LARGEST_PSRAM'],
      Heap: ['TOTAL_HEAP', 'FREE_HEAP', 'SMALEST_HEAP', 'LARGEST_HEAP'],
      Filesystem: ['TOTAL_KB', 'USED_KB'],
    };

    let html = '';
    for (const [section, keys] of Object.entries(sections)) {
      html += `<tr><th colspan="2">${section}</th></tr>`;
      for (const key of keys) {
        if (data[key] !== undefined) {
          html += `<tr><td>${key}</td><td>${escapeHtml(String(data[key]))}</td></tr>`;
        }
      }
    }
    table.innerHTML = html;
  } catch (err) {
    table.innerHTML = `<tr><td colspan="2" style="color:var(--error)">${getErrorMessage(err)}</td></tr>`;
  }
}

// WebSocket logging functions
export function log(type: string, message: string) {
  if (!wsLogEnabled) return;

  const container = document.getElementById('logContent');
  if (!container) return;

  const time = new Date().toLocaleTimeString('en-GB', { hour12: false });

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-type ${type}">${type.toUpperCase()}</span>
        <span class="log-message">${escapeHtml(message)}</span>
      `;

  container.insertBefore(entry, container.firstChild);
  while (container.children.length > 200) container.removeChild(container.lastChild as ChildNode);
}

export function toggleWsLog() {
  const checkbox = document.getElementById('wsLogEnabled') as HTMLInputElement | null;
  const container = document.getElementById('wsLogContainer');
  if (!checkbox || !container) return;
  setWsLogEnabled(checkbox.checked);
  container.style.display = wsLogEnabled ? 'flex' : 'none';
  window.localStorage.setItem('wsLogEnabled', String(wsLogEnabled));
}

export function initWsLogState() {
  setWsLogEnabled(window.localStorage.getItem('wsLogEnabled') === 'true');
  const checkbox = document.getElementById('wsLogEnabled') as HTMLInputElement | null;
  const container = document.getElementById('wsLogContainer');
  if (checkbox && container) {
    checkbox.checked = wsLogEnabled;
    container.style.display = wsLogEnabled ? 'flex' : 'none';
  }
}

export function clearLog() {
  const logContent = document.getElementById('logContent');
  if (logContent) {
    logContent.innerHTML = '';
  }
}

// Firmware upload
export async function uploadFirmware() {
  const fileInput = document.getElementById('firmwareFile') as HTMLInputElement | null;
  const status = document.getElementById('firmwareStatus');

  if (!fileInput || !status) return;

  if (!fileInput.files || !fileInput.files.length) {
    status.innerHTML = '<span style="color: var(--error)">Please select a .bin file</span>';
    return;
  }

  const file = fileInput.files[0];
  if (!file.name.endsWith('.bin')) {
    status.innerHTML = '<span style="color: var(--error)">File must be a .bin file</span>';
    return;
  }

  if (!window.confirm(`Upload firmware "${file.name}" (${(file.size / 1024).toFixed(1)} KB)?\n\nThe device will restart after upload.`)) {
    return;
  }

  status.innerHTML = '<span style="color: var(--info)">Uploading...</span>';

  try {
    const fd = new FormData();
    fd.append('update', file);

    const res = await window.fetch('/update-firmware', { method: 'POST', body: fd });

    if (res.ok) {
      status.innerHTML = '<span style="color: var(--success)">Upload complete! Device restarting...</span>';
      window.setTimeout(() => {
        status.innerHTML += '<br><span style="color: var(--text-muted)">Refresh page in a few seconds.</span>';
      }, 2000);
    } else {
      throw new Error(`Upload failed: ${res.status}`);
    }
  } catch (err) {
    status.innerHTML = `<span style="color: var(--error)">Error: ${getErrorMessage(err)}</span>`;
  }
}


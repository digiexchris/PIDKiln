// Programs view

import { ws, editorState, setEditorState, isProgramRunning, previewCache } from '../state.js';
import { escapeHtml, escapeJs, escapeAttr, getErrorMessage } from '../utils.js';
import { applyProgramLoadButtons } from '../ui/statusbar.js';
import { togglePreview } from '../chart/preview.js';
import {
  encodeListProgramsRequest,
  encodeGetProgramRequest,
  encodeSaveProgramRequest,
  encodeDeleteProgramRequest,
  sendRequest,
  DecodedProgramListResponse,
  DecodedProgramContentResponse,
} from '../flatbuffers.js';

export async function loadProgramSelect() {
  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const resp = await sendRequest(ws, encodeListProgramsRequest()) as DecodedProgramListResponse;
    const select = document.getElementById('programSelect') as HTMLSelectElement | null;
    if (!select) return;
    select.innerHTML = '<option value="">Load program...</option>';
    resp.programs.forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f.name;
      opt.textContent = f.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.warn('Failed to load programs:', getErrorMessage(err));
  }
}

export async function loadProgramList() {
  const tbody = document.getElementById('programsTableBody');
  if (!tbody) return;
  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      tbody.innerHTML = '<tr><td colspan="4" style="color:var(--text-muted)">Not connected</td></tr>';
      return;
    }
    const resp = await sendRequest(ws, encodeListProgramsRequest()) as DecodedProgramListResponse;
    const disableAttr = isProgramRunning ? ' disabled' : '';
    tbody.innerHTML = resp.programs.map((f) => {
      const attrName = escapeAttr(f.name);
      const jsName = escapeJs(f.name);
      const description = escapeHtml(f.description || 'No description provided.');
      return `
            <tr>
              <td>${escapeHtml(f.name)}</td>
              <td>${f.size} B</td>
              <td class="actions">
                <button class="btn-small primary program-load-btn"${disableAttr} onclick="sendCommand('load', {program:'${jsName}'})">Load</button>
                <button class="btn-small" onclick="editProgram('${jsName}')">Edit</button>
                <button class="btn-small danger" onclick="deleteProgram('${jsName}')">Delete</button>
                <button class="btn-small" data-program="${attrName}" data-preview-action="toggle" onclick="togglePreview(this)">Preview</button>
              </td>
            </tr>
            <tr class="program-description-row" data-description="${attrName}">
              <td colspan="3">
                <div class="program-description">${description}</div>
              </td>
            </tr>
            <tr class="program-preview-row" data-preview="${attrName}">
              <td colspan="3">
                <div class="program-preview">
                  <div class="program-preview-header">
                    <span>Program Preview</span>
                    <button class="btn-small" data-program="${attrName}" data-preview-action="close" onclick="togglePreview(this)">Close</button>
                  </div>
                  <div class="program-preview-chart" id="preview-chart-${attrName}"></div>
                </div>
              </td>
            </tr>
          `;
    }).join('');
    applyProgramLoadButtons();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:var(--error)">${getErrorMessage(err)}</td></tr>`;
  }
}

export function createProgram() {
  const name = window.prompt('Program name (e.g., my_program.json):');
  if (!name) return;
  void editProgram(name, true);
}

export async function editProgram(name: string, isNew = false) {
  setEditorState({ filename: name, isNew });

  const textarea = document.getElementById('editorContent') as HTMLTextAreaElement | null;
  const filenameEl = document.getElementById('editorFilename');
  if (!textarea || !filenameEl) return;
  filenameEl.textContent = isNew ? `New: ${name}` : name;

  if (isNew) {
    textarea.value = '{\n  "description": "Program description",\n  "segments": [\n    {\n      "target": 500,\n      "ramp_time": { "hours": 1, "minutes": 0, "seconds": 0 },\n      "dwell_time": { "hours": 0, "minutes": 30, "seconds": 0 }\n    }\n  ]\n}';
  } else {
    try {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        window.alert('Not connected');
        return;
      }
      const resp = await sendRequest(ws, encodeGetProgramRequest(name)) as DecodedProgramContentResponse;
      textarea.value = resp.content;
    } catch (err) {
      window.alert('Error loading program: ' + getErrorMessage(err));
      return;
    }
  }

  updateEditorStatus();
  window.location.hash = '#/editor';
  textarea.focus();
}

function validateProgramJson(content: string): { valid: boolean; error?: string } {
  try {
    const program = JSON.parse(content);
    
    if (typeof program !== 'object' || program === null) {
      return { valid: false, error: 'Program must be a JSON object' };
    }
    
    if (!Array.isArray(program.segments)) {
      return { valid: false, error: 'Program must have a "segments" array' };
    }
    
    if (program.segments.length === 0) {
      return { valid: false, error: 'Program must have at least one segment' };
    }
    
    for (let i = 0; i < program.segments.length; i++) {
      const seg = program.segments[i];
      const segNum = i + 1;
      
      if (typeof seg.target !== 'number') {
        return { valid: false, error: `Segment ${segNum}: "target" must be a number` };
      }
      
      if (!seg.ramp_time || typeof seg.ramp_time !== 'object') {
        return { valid: false, error: `Segment ${segNum}: "ramp_time" must be an object` };
      }
      
      if (!seg.dwell_time || typeof seg.dwell_time !== 'object') {
        return { valid: false, error: `Segment ${segNum}: "dwell_time" must be an object` };
      }
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: `Invalid JSON: ${e instanceof Error ? e.message : 'parse error'}` };
  }
}

export async function saveProgram() {
  const textarea = document.getElementById('editorContent') as HTMLTextAreaElement | null;
  if (!textarea) return;
  const content = textarea.value;
  const name = editorState.filename;

  if (!name) {
    window.alert('No filename set');
    return;
  }

  if (content.length > 10240) {
    window.alert('File too large (max 10KB)');
    return;
  }

  // Validate JSON structure
  const validation = validateProgramJson(content);
  if (!validation.valid) {
    window.alert(`Invalid program: ${validation.error}`);
    return;
  }

  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      window.alert('Not connected');
      return;
    }
    await sendRequest(ws, encodeSaveProgramRequest(name, content));
    previewCache.delete(name);
    void loadProgramSelect();
    window.location.hash = '#/programs';
  } catch (err) {
    window.alert('Error saving: ' + getErrorMessage(err));
  }
}

export function cancelEdit() {
  const textarea = document.getElementById('editorContent') as HTMLTextAreaElement | null;
  const content = textarea ? textarea.value : '';
  if (content && !window.confirm('Discard changes?')) return;
  window.location.hash = '#/programs';
}

export function updateEditorStatus() {
  const textarea = document.getElementById('editorContent') as HTMLTextAreaElement | null;
  if (!textarea) return;
  const content = textarea.value;
  const lines = content.split('\n');

  const lineCount = document.getElementById('editorLineCount');
  const byteCount = document.getElementById('editorByteCount');
  if (lineCount) lineCount.textContent = `${lines.length} lines`;
  if (byteCount) byteCount.textContent = `${new Blob([content]).size} bytes`;

  const lineNumbers = document.getElementById('editorLines');
  if (lineNumbers) {
    lineNumbers.textContent = lines.map((_, i) => i + 1).join('\n');
  }
}

export async function deleteProgram(name: string) {
  if (!window.confirm(`Delete program "${name}"?`)) return;
  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      window.alert('Not connected');
      return;
    }
    await sendRequest(ws, encodeDeleteProgramRequest(name));
    previewCache.delete(name);
    void loadProgramList();
    void loadProgramSelect();
  } catch (err) {
    window.alert('Error: ' + getErrorMessage(err));
  }
}

export function initEditorListeners() {
  const textarea = document.getElementById('editorContent') as HTMLTextAreaElement | null;
  if (textarea) {
    textarea.addEventListener('input', updateEditorStatus);
    textarea.addEventListener('scroll', () => {
      const lines = document.getElementById('editorLines');
      if (lines) {
        lines.scrollTop = textarea.scrollTop;
      }
    });
  }
}

// Re-export togglePreview for global access
export { togglePreview };


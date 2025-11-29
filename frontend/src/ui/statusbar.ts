// Status bar and UI updates

import { state, isProgramRunning, setIsProgramRunning } from '../state.js';
import { STATUS_NAMES, STATUS_CLASSES } from '../types/state.js';
import { formatTemp } from '../utils.js';

export function updateUI() {
  const s = state;

  // Status bar
  const statusKiln = document.getElementById('statusKiln');
  const statusTarget = document.getElementById('statusTarget');
  const statusEnv = document.getElementById('statusEnv');
  const statusHeat = document.getElementById('statusHeat');
  if (statusKiln) statusKiln.textContent = formatTemp(s.kiln_temp);
  if (statusTarget) statusTarget.textContent = formatTemp(s.set_temp);
  if (statusEnv) statusEnv.textContent = formatTemp(s.env_temp);
  if (statusHeat) statusHeat.textContent = `${s.heat_percent || 0}%`;

  const badge = document.getElementById('statusBadge');
  if (badge) {
    badge.textContent = STATUS_NAMES[s.program_status] || 'UNKNOWN';
    badge.className = 'program-status ' + (STATUS_CLASSES[s.program_status] || '');
  }

  // Dashboard
  const dashKiln = document.getElementById('dashKiln');
  const dashTarget = document.getElementById('dashTarget');
  const dashEnv = document.getElementById('dashEnv');
  const dashCase = document.getElementById('dashCase');
  const dashStatus = document.getElementById('dashStatus');
  const dashProgram = document.getElementById('dashProgram');
  const dashStep = document.getElementById('dashStep');
  const dashHeat = document.getElementById('dashHeat');
  const dashStart = document.getElementById('dashStart');
  const dashEnd = document.getElementById('dashEnd');
  const dashTime = document.getElementById('dashTime');
  const dashChange = document.getElementById('dashChange');

  if (dashKiln) dashKiln.textContent = formatTemp(s.kiln_temp);
  if (dashTarget) dashTarget.textContent = formatTemp(s.set_temp);
  if (dashEnv) dashEnv.textContent = formatTemp(s.env_temp);
  if (dashCase) dashCase.textContent = formatTemp(s.case_temp);
  if (dashStatus) dashStatus.textContent = STATUS_NAMES[s.program_status] || '--';
  if (dashProgram) dashProgram.textContent = s.program_name || '--';
  if (dashStep) dashStep.textContent = s.step || '--';
  if (dashHeat) dashHeat.textContent = `${s.heat_percent || 0}%`;
  if (dashStart) dashStart.textContent = s.prog_start || '--';
  if (dashEnd) dashEnd.textContent = s.prog_end || '--';
  if (dashTime) dashTime.textContent = s.curr_time || '--';
  if (dashChange) dashChange.textContent = `${(s.temp_change || 0).toFixed(1)}°C/h`;

  updateLoadControls(s.program_status);
  updateStartButton(s.program_status);
}

export function updateLoadControls(status: number) {
  const running = status === 2;
  setIsProgramRunning(running);
  const select = document.getElementById('programSelect') as HTMLSelectElement | null;
  if (select) select.disabled = running;
  const sidebarBtn = document.getElementById('sidebarLoadBtn') as HTMLButtonElement | null;
  if (sidebarBtn) sidebarBtn.disabled = running;
  const clearBtn = document.getElementById('sidebarClearBtn') as HTMLButtonElement | null;
  if (clearBtn) clearBtn.disabled = running;
  applyProgramLoadButtons();
}

export function applyProgramLoadButtons() {
  document.querySelectorAll<HTMLButtonElement>('.program-load-btn').forEach(btn => {
    btn.disabled = isProgramRunning;
    btn.classList.toggle('primary', !isProgramRunning);
    btn.classList.toggle('running-disabled', isProgramRunning);
  });
}

export function updateStartButton(status: number) {
  const btn = document.getElementById('startBtn') as HTMLButtonElement | null;
  const running = status === 2;
  if (!btn) return;
  btn.disabled = running;
  btn.classList.toggle('primary', !running);
  btn.classList.toggle('running-disabled', running);
}


// Program preview charts

import { previewCharts, previewCache, ws } from '../state.js';
import { getErrorMessage, timeToSeconds, formatPreviewTimeLabel, cssEscape } from '../utils.js';
import {
  encodeGetProgramRequest,
  sendRequest,
  DecodedProgramContentResponse,
} from '../flatbuffers.js';

declare const uPlot: typeof import('../types/uplot');

export async function fetchProgramContent(name: string): Promise<string> {
  if (previewCache.has(name)) {
    return previewCache.get(name) as string;
  }
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error('Not connected');
  }
  const resp = await sendRequest(ws, encodeGetProgramRequest(name)) as DecodedProgramContentResponse;
  previewCache.set(name, resp.content);
  return resp.content;
}

export function buildProgramPreviewData(content: string): [number[], number[]] | null {
  try {
    const program = JSON.parse(content);
    const segments = Array.isArray(program.segments) ? program.segments : [];
    if (!segments.length) return null;
    const minutes: number[] = [0];
    const temps: number[] = [(segments[0].target ?? 0)];
    let elapsed = 0;
    let currentTemp = temps[0];
    for (const segment of segments) {
      const target = typeof segment.target === 'number' ? segment.target : currentTemp;
      const rampSeconds = timeToSeconds(segment.ramp_time);
      if (rampSeconds > 0) {
        elapsed += rampSeconds;
        minutes.push(elapsed / 60);
        temps.push(target);
      } else if (target !== currentTemp) {
        minutes.push(elapsed / 60);
        temps.push(target);
      }
      currentTemp = target;
      const dwellSeconds = timeToSeconds(segment.dwell_time);
      if (dwellSeconds > 0) {
        elapsed += dwellSeconds;
        minutes.push(elapsed / 60);
        temps.push(target);
      }
    }
    return [minutes, temps];
  } catch {
    return null;
  }
}

export async function showProgramPreview(name: string, container?: HTMLElement) {
  if (!container) return;
  container.innerHTML = '<div class="preview-loading">Loading preview…</div>';
  const width = container.clientWidth || 320;
  try {
    const content = await fetchProgramContent(name);
    const data = buildProgramPreviewData(content);
    if (!data) {
      container.innerHTML = '<div class="preview-error">Unable to render preview</div>';
      return;
    }
    container.innerHTML = '';
    const baseMs = Date.now();
    const opts = {
      width,
      height: 160,
      scales: {
        x: { time: false },
        y: { auto: true },
      },
      axes: [
        {
          stroke: '#888',
          grid: { stroke: '#2d2d3a', width: 1 },
          ticks: { stroke: '#2d2d3a' },
          values: (_: unknown, vals: number[]) => vals.map(v => formatPreviewTimeLabel(baseMs, v)),
          label: 'Time (hh:mm)',
        },
        {
          stroke: '#888',
          grid: { stroke: '#2d2d3a', width: 1 },
          ticks: { stroke: '#2d2d3a' },
          values: (_: unknown, vals: number[]) => vals.map(v => `${Math.round(v)}°C`),
          label: 'Temperature (°C)',
        },
      ],
      series: [
        {},
        {
          label: 'Target',
          stroke: '#4ade80',
          width: 2,
          points: { show: false },
        },
      ],
      cursor: { show: false },
    };
    const existingChart = previewCharts.get(name);
    if (existingChart) {
      existingChart.destroy();
    }
    const chartInstance = new uPlot(opts, data, container);
    previewCharts.set(name, chartInstance);
  } catch (err) {
    container.innerHTML = `<div class="preview-error">${getErrorMessage(err)}</div>`;
  }
}

export async function togglePreview(button: HTMLButtonElement | null) {
  if (!button) return;
  const name = button.dataset.program;
  if (!name) return;
  const selector = `tr[data-preview="${cssEscape(name)}"]`;
  const row = document.querySelector<HTMLTableRowElement>(selector);
  if (!row) return;
  const descRow = document.querySelector<HTMLTableRowElement>(`tr[data-description="${cssEscape(name)}"]`);
  const isOpen = row.dataset.open === 'true';
  if (isOpen) {
    row.dataset.open = 'false';
    row.style.display = 'none';
    if (descRow) {
      descRow.style.display = 'none';
    }
    updatePreviewButtonLabels(name, false);
    return;
  }
  row.dataset.open = 'true';
  row.style.display = 'table-row';
  if (descRow) {
    descRow.style.display = 'table-row';
  }
  updatePreviewButtonLabels(name, true);
  const container = row.querySelector<HTMLElement>('.program-preview-chart');
  await showProgramPreview(name, container || undefined);
}

function updatePreviewButtonLabels(name: string, open: boolean) {
  document.querySelectorAll<HTMLButtonElement>(`button[data-program="${cssEscape(name)}"]`).forEach(btn => {
    const action = btn.dataset.previewAction;
    if (action === 'toggle') {
      btn.textContent = open ? 'Hide Preview' : 'Preview';
    } else if (action === 'close') {
      btn.textContent = 'Close';
    }
  });
}


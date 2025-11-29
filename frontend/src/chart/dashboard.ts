// Dashboard temperature chart

import {
  chart, setChart, chartInitializing, setChartInitializing,
  chartData, CHART_MAX_POINTS, CHART_MIN_WINDOW,
  autoScrollEnabled, setAutoScrollEnabled,
  programProfile, programProfileLocked, ws,
  simulatedNow, isSimulator,
} from '../state.js';
import { formatTimeLabel, getErrorMessage } from '../utils.js';
import { buildProfileChartData } from './profile.js';
import {
  encodeHistoryRequest,
  sendRequest,
  DecodedHistoryResponse,
} from '../flatbuffers.js';

declare const uPlot: typeof import('../types/uplot');

/**
 * Get current time in seconds - uses simulated time when connected to simulator
 */
export function getNowSeconds(): number {
  if (isSimulator && simulatedNow !== null) {
    return simulatedNow / 1000;
  }
  return Date.now() / 1000;
}

function nowLinePlugin() {
  return {
    hooks: {
      draw: [
        (u: any) => {
          const ctx = u.ctx;
          const now = getNowSeconds();
          const xMin = u.scales.x.min;
          const xMax = u.scales.x.max;

          if (now < xMin || now > xMax) return;

          const x = u.valToPos(now, 'x', true);
          const top = u.bbox.top;
          const bottom = u.bbox.top + u.bbox.height;

          ctx.save();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x, top);
          ctx.lineTo(x, bottom);
          ctx.stroke();

          ctx.fillStyle = '#fbbf24';
          ctx.font = '10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Now', x, top - 4);

          ctx.restore();
        },
      ],
    },
  };
}

export function initChart() {
  if (chart || chartInitializing) return;

  if (typeof uPlot === 'undefined') {
    console.warn('uPlot not loaded');
    return;
  }

  const container = document.getElementById('chartContainer');
  if (!container) {
    console.warn('Chart container not found');
    return;
  }

  const dashboardView = document.getElementById('view-dashboard');
  if (!dashboardView || !dashboardView.classList.contains('active')) {
    return;
  }

  if (!container.offsetParent && window.getComputedStyle(container).display === 'none') {
    return;
  }

  const width = container.clientWidth || 400;
  if (width < 100) return;

  setChartInitializing(true);

  const now = getNowSeconds();
  const data = [
    [now - 60, now],
    [25, 25],
    [0, 0],
    [22, 22],
    [28, 28],
    [null, null],
  ];

  const opts = {
    width,
    height: 300,
    plugins: [nowLinePlugin()],
    scales: {
      x: { time: true },
      y: { auto: true },
    },
    series: [
      {},
      { label: 'Kiln', stroke: '#ff6b4a', width: 2, points: { show: false } },
      { label: 'Target', stroke: '#4ade80', width: 2, points: { show: false } },
      { label: 'Env', stroke: '#888888', width: 1, points: { show: false } },
      { label: 'Case', stroke: '#666666', width: 1, points: { show: false } },
      { label: 'Program', stroke: '#22d3ee', width: 2, dash: [5, 5], points: { show: false } },
    ],
    axes: [
      {
        stroke: '#888',
        grid: { stroke: '#2d2d3a', width: 1 },
        ticks: { stroke: '#2d2d3a' },
        values: (_: unknown, vals: number[]) => vals.map(v => formatTimeLabel(v)),
        font: '11px Inter, sans-serif',
      },
      {
        stroke: '#888',
        grid: { stroke: '#2d2d3a', width: 1 },
        ticks: { stroke: '#2d2d3a' },
        values: (_: unknown, vals: number[]) => vals.map(v => `${Math.round(v)}°C`),
        font: '11px Inter, sans-serif',
        size: 50,
      },
    ],
    legend: { show: false },
    cursor: { show: true, drag: { x: true, y: false } },
    hooks: {
      setScale: [
        (_u: any, key: string) => {
          if (key === 'x') updateOverviewBar();
        },
      ],
      ready: [
        (u: any) => {
          u.root.addEventListener('mousedown', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'CANVAS') {
              setAutoScrollEnabled(false);
              updateAutoScrollButton();
            }
          });
        },
      ],
    },
  };

  window.setTimeout(() => {
    try {
      const el = document.getElementById('chartContainer');
      if (!el) {
        console.warn('Chart container not found');
        setChartInitializing(false);
        return;
      }

      el.innerHTML = '';
      setChart(new uPlot(opts, data, el));
      setChartInitializing(false);
      console.log('Chart initialized successfully');

      createChartLegend();
      setDefaultView();

      const resizeObserver = new ResizeObserver(() => {
        if (chart && el.clientWidth > 0) {
          chart.setSize({ width: el.clientWidth, height: 300 });
        }
      });
      resizeObserver.observe(el);

      el.addEventListener('wheel', (e: WheelEvent) => {
        if (!chart) return;
        e.preventDefault();

        const rect = el.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorPct = cursorX / el.clientWidth;

        const xMin = chart.scales.x.min;
        const xMax = chart.scales.x.max;
        const xRange = xMax - xMin;

        const factor = e.deltaY > 0 ? 1.2 : 0.8;
        let newRange = xRange * factor;

        newRange = Math.max(CHART_MIN_WINDOW, newRange);
        const maxRange = getChartMaxRange();
        newRange = Math.min(maxRange, newRange);

        const cursorTime = xMin + xRange * cursorPct;
        const newMin = cursorTime - newRange * cursorPct;
        const newMax = cursorTime + newRange * (1 - cursorPct);

        chart.setScale('x', { min: newMin, max: newMax });
      }, { passive: false });

      setupTouchHandlers(el);
      setupOverviewBar();
      updateOverviewBar();
    } catch (e) {
      console.error('Failed to initialize chart:', e);
      setChart(null);
      setChartInitializing(false);
    }
  }, 100);
}

function setupTouchHandlers(el: HTMLElement) {
  let touchStartX: number | null = null;
  let touchStartScale: { min: number; max: number } | null = null;
  let initialPinchDistance: number | null = null;

  el.addEventListener('touchstart', (e: TouchEvent) => {
    if (!chart) return;
    if (e.touches.length === 1) {
      setAutoScrollEnabled(false);
      updateAutoScrollButton();
      touchStartX = e.touches[0].clientX;
      touchStartScale = { min: chart.scales.x.min, max: chart.scales.x.max };
    } else if (e.touches.length === 2) {
      initialPinchDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      touchStartScale = { min: chart.scales.x.min, max: chart.scales.x.max };
    }
  }, { passive: true });

  el.addEventListener('touchmove', (e: TouchEvent) => {
    if (!chart || !touchStartScale) return;

    if (e.touches.length === 1 && touchStartX !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - touchStartX;
      const pxPerSec = el.clientWidth / (touchStartScale.max - touchStartScale.min);
      const dt = dx / pxPerSec;
      chart.setScale('x', { min: touchStartScale.min - dt, max: touchStartScale.max - dt });
    } else if (e.touches.length === 2 && initialPinchDistance !== null) {
      e.preventDefault();
      const currentDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const scale = initialPinchDistance / currentDistance;
      const range = (touchStartScale.max - touchStartScale.min) * scale;
      const center = (touchStartScale.min + touchStartScale.max) / 2;
      const clampedRange = Math.max(CHART_MIN_WINDOW, Math.min(getChartMaxRange(), range));
      chart.setScale('x', { min: center - clampedRange / 2, max: center + clampedRange / 2 });
    }
  }, { passive: false });

  el.addEventListener('touchend', () => {
    touchStartX = null;
    touchStartScale = null;
    initialPinchDistance = null;
  }, { passive: true });
}

export async function loadChartHistory() {
  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('Not connected, cannot load history');
      return;
    }

    const resp = await sendRequest(ws, encodeHistoryRequest()) as DecodedHistoryResponse;

    if (!resp.data || !resp.data.length) {
      console.log('No history data available');
      return;
    }

    chartData.timestamps = [];
    chartData.kilnTemps = [];
    chartData.setTemps = [];
    chartData.envTemps = [];
    chartData.caseTemps = [];
    chartData.markers = [];

    for (const point of resp.data) {
      if (point.t && point.k !== undefined && point.s !== undefined) {
        chartData.timestamps.push(point.t / 1000);
        chartData.kilnTemps.push(point.k);
        chartData.setTemps.push(point.s);
        chartData.envTemps.push(point.e !== undefined ? point.e : 22);
        chartData.caseTemps.push(point.c !== undefined ? point.c : 28);

        if (point.m) {
          chartData.markers.push({
            x: point.t / 1000,
            type: String(point.m.type),
            value: point.m.value ?? undefined,
          });
        }
      }
    }

    console.log('Loaded', chartData.timestamps.length, 'history points');

    if (chart) {
      updateChartData();
      if (autoScrollEnabled) {
        setDefaultView();
      }
    }
  } catch (err) {
    console.warn('Failed to load chart history:', getErrorMessage(err));
  }
}

export function addChartPoint(kilnTemp: number, setTemp: number, envTemp: number, caseTemp: number) {
  if (kilnTemp === undefined || setTemp === undefined || Number.isNaN(kilnTemp) || Number.isNaN(setTemp)) {
    return;
  }

  const now = getNowSeconds();

  chartData.timestamps.push(now);
  chartData.kilnTemps.push(Number(kilnTemp));
  chartData.setTemps.push(Number(setTemp));
  chartData.envTemps.push(Number(envTemp ?? 22));
  chartData.caseTemps.push(Number(caseTemp ?? 28));

  while (chartData.timestamps.length > CHART_MAX_POINTS) {
    chartData.timestamps.shift();
    chartData.kilnTemps.shift();
    chartData.setTemps.shift();
    chartData.envTemps.shift();
    chartData.caseTemps.shift();
  }

  updateChartData();
}

export function updateChartData() {
  if (!chart) return;

  const len = chartData.timestamps.length;
  if (len === 0) return;

  while (chartData.envTemps.length < len) chartData.envTemps.push(22);
  while (chartData.caseTemps.length < len) chartData.caseTemps.push(28);

  const now = getNowSeconds();
  let timestamps = [...chartData.timestamps];
  let kilnTemps = [...chartData.kilnTemps];
  let setTemps = [...chartData.setTemps];
  let envTemps = [...chartData.envTemps];
  let caseTemps = [...chartData.caseTemps];

  if (programProfile && programProfile.durationMinutes > 0) {
    const anchorTime = (programProfileLocked && programProfile.startTime)
      ? programProfile.startTime
      : now;
    const profileEnd = anchorTime + programProfile.durationMinutes * 60;
    const lastTimestamp = timestamps[timestamps.length - 1] || now;

    if (profileEnd > lastTimestamp) {
      for (let t = lastTimestamp + 60; t <= profileEnd; t += 60) {
        timestamps.push(t);
        kilnTemps.push(null as any);
        setTemps.push(null as any);
        envTemps.push(null as any);
        caseTemps.push(null as any);
      }
    }
  }

  const profileTemps = buildProfileChartData(timestamps);

  const currentMin = chart.scales.x.min;
  const currentMax = chart.scales.x.max;
  const currentRange = currentMax - currentMin;

  chart.setData([
    timestamps,
    kilnTemps,
    setTemps,
    envTemps,
    caseTemps,
    profileTemps,
  ], false);

  if (autoScrollEnabled) {
    const nowSec = getNowSeconds();
    const newMin = nowSec - currentRange * 0.67;
    const newMax = nowSec + currentRange * 0.33;
    chart.setScale('x', { min: newMin, max: newMax });
  } else {
    chart.setScale('x', { min: currentMin, max: currentMax });
  }

  updateOverviewBar();
}

export function getChartMaxRange(): number {
  const now = getNowSeconds();
  const oldest = chartData.timestamps.length > 0 ? chartData.timestamps[0] : now - 3600;
  const programEnd = getProgramEndTime();
  const rightEdge = Math.max(now + 6 * 3600, programEnd);
  return rightEdge - oldest;
}

export function getProgramEndTime(): number {
  if (!programProfile) return getNowSeconds();
  const startTime = programProfile.startTime || getNowSeconds();
  return startTime + programProfile.durationMinutes * 60;
}

export function resetZoom() {
  if (!chart) return;
  const currentCenter = (chart.scales.x.min + chart.scales.x.max) / 2;
  const windowSize = 60 * 60;
  const min = currentCenter - windowSize / 2;
  const max = currentCenter + windowSize / 2;
  chart.setScale('x', { min, max });
}

export function setDefaultView() {
  if (!chart) return;
  const now = getNowSeconds();
  const windowSize = 60 * 60;
  const min = now - windowSize * 0.67;
  const max = now + windowSize * 0.33;
  chart.setScale('x', { min, max });
}

export function toggleAutoScroll() {
  if (!chart) return;
  setAutoScrollEnabled(!autoScrollEnabled);
  updateAutoScrollButton();

  if (autoScrollEnabled) {
    const currentRange = chart.scales.x.max - chart.scales.x.min;
    const now = getNowSeconds();
    const min = now - currentRange * 0.67;
    const max = now + currentRange * 0.33;
    chart.setScale('x', { min, max });
  }
}

export function updateAutoScrollButton() {
  const btn = document.getElementById('autoScrollBtn') as HTMLButtonElement | null;
  if (!btn) return;
  btn.textContent = autoScrollEnabled ? '⏸ Auto Scroll' : '▶ Auto Scroll';
}

export function centerOnProgram() {
  setDefaultView();
}

function createChartLegend() {
  const legendEl = document.getElementById('chartLegend');
  if (!legendEl || !chart) return;

  const series = [
    { label: 'Kiln', color: '#ff6b4a' },
    { label: 'Target', color: '#4ade80' },
    { label: 'Env', color: '#888888' },
    { label: 'Case', color: '#666666' },
    { label: 'Program', color: '#22d3ee', dashed: true },
  ];

  legendEl.innerHTML = series.map((s, i) => {
    const idx = i + 1;
    const dashStyle = s.dashed ? `border-top: 2px dashed ${s.color}` : `background: ${s.color}`;
    return `<div class="chart-legend-item" data-series="${idx}" style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
          <span style="width: 16px; height: 3px; ${dashStyle};"></span>
          <span style="color: var(--text);">${s.label}</span>
        </div>`;
  }).join('');

  legendEl.querySelectorAll<HTMLElement>('.chart-legend-item').forEach(item => {
    item.addEventListener('click', () => {
      if (!chart) return;
      const idx = parseInt(item.dataset.series || '0', 10);
      const isVisible = chart.series[idx]?.show;
      chart.setSeries(idx, { show: !isVisible });
      item.style.opacity = isVisible ? '0.4' : '1';
    });
  });
}

function setupOverviewBar() {
  const overview = document.getElementById('chartOverview');
  if (!overview) return;

  const viewport = document.createElement('div');
  viewport.className = 'overview-viewport';
  overview.appendChild(viewport);

  let dragging = false;
  let startX = 0;
  let startLeft = 0;

  viewport.addEventListener('mousedown', (e: MouseEvent) => {
    dragging = true;
    setAutoScrollEnabled(false);
    updateAutoScrollButton();
    startX = e.clientX;
    startLeft = parseFloat(viewport.style.left || '0');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!dragging || !chart) return;

    const dx = e.clientX - startX;
    const overviewWidth = overview.clientWidth;
    const dPct = (dx / overviewWidth) * 100;

    const now = getNowSeconds();
    const oldest = chartData.timestamps[0] || now - 3600;
    const programEnd = getProgramEndTime();
    const rightEdge = Math.max(now + 6 * 3600, programEnd);
    const fullRange = rightEdge - oldest;

    const viewRange = chart.scales.x.max - chart.scales.x.min;
    const newLeftPct = Math.max(0, Math.min(100 - (viewRange / fullRange * 100), startLeft + dPct));
    const newMin = oldest + (newLeftPct / 100) * fullRange;
    const newMax = newMin + viewRange;

    chart.setScale('x', { min: newMin, max: newMax });
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
  });

  overview.addEventListener('click', (e: MouseEvent) => {
    if (!chart) return;
    const target = e.target as HTMLElement;
    if (target.classList.contains('overview-viewport')) return;
    setAutoScrollEnabled(false);
    updateAutoScrollButton();

    const rect = overview.getBoundingClientRect();
    const clickPct = (e.clientX - rect.left) / rect.width;

    const now = getNowSeconds();
    const oldest = chartData.timestamps[0] || now - 3600;
    const programEnd = getProgramEndTime();
    const rightEdge = Math.max(now + 6 * 3600, programEnd);
    const fullRange = rightEdge - oldest;

    const viewRange = chart.scales.x.max - chart.scales.x.min;
    const centerTime = oldest + clickPct * fullRange;
    const newMin = centerTime - viewRange / 2;
    const newMax = centerTime + viewRange / 2;

    chart.setScale('x', { min: newMin, max: newMax });
  });
}

function updateOverviewBar() {
  const overview = document.getElementById('chartOverview');
  if (!overview || !chart) return;

  const viewport = overview.querySelector<HTMLElement>('.overview-viewport');
  if (!viewport) return;

  const now = getNowSeconds();
  const oldest = chartData.timestamps.length > 0 ? chartData.timestamps[0] : now - 3600;
  const programEnd = getProgramEndTime();
  const rightEdge = Math.max(now + 6 * 3600, programEnd);
  const fullRange = rightEdge - oldest;

  const viewMin = chart.scales.x.min;
  const viewMax = chart.scales.x.max;

  const leftPct = ((viewMin - oldest) / fullRange) * 100;
  const widthPct = ((viewMax - viewMin) / fullRange) * 100;

  viewport.style.left = `${Math.max(0, leftPct)}%`;
  viewport.style.width = `${Math.min(100 - Math.max(0, leftPct), widthPct)}%`;
}


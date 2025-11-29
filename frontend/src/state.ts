// Global application state

import type { FurnaceState, EditorState, ChartData, ProgramProfile, PreferencesMap } from './types/state.js';

// WebSocket connection
export let ws: WebSocket | null = null;
export function setWs(socket: WebSocket | null) { ws = socket; }

// Furnace state from backend
export let state = {} as FurnaceState;
export function setState(newState: FurnaceState) { state = newState; }

// Preferences
export let preferences: PreferencesMap = {};
export function setPreferences(prefs: PreferencesMap) { preferences = prefs; }

// Editor state
export let editorState: EditorState = { filename: '', isNew: false };
export function setEditorState(newState: EditorState) { editorState = newState; }

// Chart instance
declare const uPlot: typeof import('./types/uplot');
export let chart: InstanceType<typeof uPlot> | null = null;
export function setChart(c: InstanceType<typeof uPlot> | null) { chart = c; }

export let chartInitializing = false;
export function setChartInitializing(v: boolean) { chartInitializing = v; }

export const chartData: ChartData = {
  timestamps: [],
  kilnTemps: [],
  setTemps: [],
  envTemps: [],
  caseTemps: [],
  markers: [],
};

export const CHART_MAX_POINTS = 8640; // 24h at 10s intervals
export const CHART_MIN_WINDOW = 30 * 60; // 30 minutes minimum zoom

// Chart zoom/pan state
export let autoScrollEnabled = true;
export function setAutoScrollEnabled(v: boolean) { autoScrollEnabled = v; }

// Program profile state
export let programProfile: ProgramProfile | null = null;
export function setProgramProfile(p: ProgramProfile | null) { programProfile = p; }

export let programProfileLocked = false;
export function setProgramProfileLocked(v: boolean) { programProfileLocked = v; }

// Program running state (for disabling controls)
export let isProgramRunning = false;
export function setIsProgramRunning(v: boolean) { isProgramRunning = v; }

// Preview chart caches
export const previewCharts = new Map<string, InstanceType<typeof uPlot>>();
export const previewCache = new Map<string, string>();

// Connection state
export let manualDisconnect = false;
export function setManualDisconnect(v: boolean) { manualDisconnect = v; }

export let reconnectTimeout: number | null = null;
export function setReconnectTimeout(v: number | null) { reconnectTimeout = v; }

export let reconnectStartTime: number | null = null;
export function setReconnectStartTime(v: number | null) { reconnectStartTime = v; }

export const RECONNECT_TIMEOUT_MS = 30000;
export const RECONNECT_INTERVAL_MS = 3000;

// WebSocket log state
export let wsLogEnabled = false;
export function setWsLogEnabled(v: boolean) { wsLogEnabled = v; }

// Simulator state
export let isSimulator = false;
export function setIsSimulator(v: boolean) { isSimulator = v; }

export let timeScale = 1.0;
export function setTimeScale(v: number) { timeScale = v; }

export let simulatedNow: number | null = null;
export function setSimulatedNow(v: number | null) { simulatedNow = v; }

// Reset chart data for fresh start
export function resetChartData() {
  chartData.timestamps = [];
  chartData.kilnTemps = [];
  chartData.setTemps = [];
  chartData.envTemps = [];
  chartData.caseTemps = [];
  chartData.markers = [];
}


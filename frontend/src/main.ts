// Furnace frontend entry point

// Initialize router
import { navigate, initRouter } from './router.js';

// WebSocket connection
import { connect, disconnect, manualConnect, sendTimeScale, clearError } from './websocket.js';

// Commands
import { sendCommand, loadProgram, clearProgram, setTemperature, reboot } from './commands.js';

// Chart functions
import { loadChartHistory, resetZoom, toggleAutoScroll, centerOnProgram } from './chart/dashboard.js';
import { togglePreview } from './chart/preview.js';

// View functions
import {
  loadProgramList, createProgram, editProgram,
  saveProgram, cancelEdit, deleteProgram, initEditorListeners,
} from './views/programs.js';
import { loadLogsList, viewLog, downloadLog } from './views/logs.js';
import { loadPreferences, savePreferences } from './views/preferences.js';
import { loadDebugInfo, toggleWsLog, clearLog, initWsLogState, uploadFirmware } from './views/debug.js';
import { loadAboutInfo } from './views/about.js';

// Initialize on load
window.addEventListener('load', () => {
  initWsLogState();
  initEditorListeners();
  initRouter();
  navigate();
  connect();
  window.setTimeout(() => { void loadChartHistory(); }, 500);
  
  // Time scale slider event listener
  const slider = document.getElementById('timeScaleSlider') as HTMLInputElement | null;
  if (slider) {
    slider.addEventListener('input', () => {
      const scale = parseFloat(slider.value);
      const label = document.getElementById('timeScaleLabel');
      if (label) label.textContent = `${scale.toFixed(1)}x`;
    });
    slider.addEventListener('change', () => {
      const scale = parseFloat(slider.value);
      sendTimeScale(scale);
    });
  }
});

// Expose handlers used by HTML onclick attributes to the global scope
declare global {
  interface Window {
    sendCommand: typeof sendCommand;
    manualConnect: typeof manualConnect;
    disconnect: typeof disconnect;
    loadProgram: typeof loadProgram;
    clearProgram: typeof clearProgram;
    setTemperature: typeof setTemperature;
    reboot: typeof reboot;
    createProgram: typeof createProgram;
    editProgram: typeof editProgram;
    saveProgram: typeof saveProgram;
    cancelEdit: typeof cancelEdit;
    deleteProgram: typeof deleteProgram;
    loadProgramList: typeof loadProgramList;
    togglePreview: typeof togglePreview;
    loadLogsList: typeof loadLogsList;
    viewLog: typeof viewLog;
    downloadLog: typeof downloadLog;
    loadPreferences: typeof loadPreferences;
    savePreferences: typeof savePreferences;
    loadDebugInfo: typeof loadDebugInfo;
    loadAboutInfo: typeof loadAboutInfo;
    resetZoom: typeof resetZoom;
    toggleAutoScroll: typeof toggleAutoScroll;
    centerOnProgram: typeof centerOnProgram;
    uploadFirmware: typeof uploadFirmware;
    toggleWsLog: typeof toggleWsLog;
    clearLog: typeof clearLog;
    clearError: typeof clearError;
  }
}

Object.assign(window, {
  sendCommand,
  manualConnect,
  disconnect,
  loadProgram,
  clearProgram,
  setTemperature,
  reboot,
  createProgram,
  editProgram,
  saveProgram,
  cancelEdit,
  deleteProgram,
  loadProgramList,
  togglePreview,
  loadLogsList,
  viewLog,
  downloadLog,
  loadPreferences,
  savePreferences,
  loadDebugInfo,
  loadAboutInfo,
  resetZoom,
  toggleAutoScroll,
  centerOnProgram,
  uploadFirmware,
  toggleWsLog,
  clearLog,
  clearError,
});

export {};

// Preferences view

import { ws, preferences, setPreferences } from '../state.js';
import { escapeHtml, getErrorMessage } from '../utils.js';
import {
  encodeGetPreferencesRequest,
  encodeSavePreferencesRequest,
  sendRequest,
  DecodedPreferencesResponse,
} from '../flatbuffers.js';

export async function loadPreferences() {
  const container = document.getElementById('prefsContent');
  if (!container) return;
  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      container.innerHTML = '<p style="color:var(--text-muted)">Not connected</p>';
      return;
    }
    const resp = await sendRequest(ws, encodeGetPreferencesRequest()) as DecodedPreferencesResponse;
    setPreferences(JSON.parse(resp.json));

    const sections: Record<string, string[]> = {
      WiFi: ['WiFi_SSID', 'WiFi_Password', 'WiFi_Mode', 'WiFi_Retry_cnt'],
      'HTTP Server': ['Auth_Username', 'Auth_Password', 'HTTP_Local_JS'],
      Time: ['NTP_Server1', 'NTP_Server2', 'NTP_Server3', 'GMT_Offset_sec', 'Daylight_Offset_sec'],
      PID: ['PID_Window', 'PID_Kp', 'PID_Ki', 'PID_Kd', 'PID_POE', 'PID_Temp_Threshold'],
      Logging: ['LOG_Window', 'LOG_Files_Limit'],
      Safety: ['MIN_Temperature', 'MAX_Temperature', 'MAX_Housing_Temperature', 'Thermal_Runaway', 'Alarm_Timeout', 'MAX31855_Error_Grace_Count'],
      Debug: ['DBG_Serial', 'DBG_Syslog', 'DBG_Syslog_Srv', 'DBG_Syslog_Port'],
    };

    let html = '';
    for (const [section, keys] of Object.entries(sections)) {
      html += `<div class="prefs-section"><div class="prefs-section-header">${section}</div><div class="prefs-section-content">`;
      for (const key of keys) {
        if (preferences[key] !== undefined) {
          const type = key.includes('Password') ? 'password' : 'text';
          html += `<div class="pref-row">
                <label class="pref-label">${key}</label>
                <div class="pref-input"><input type="${type}" id="pref_${key}" value="${escapeHtml(String(preferences[key]))}"></div>
              </div>`;
        }
      }
      html += '</div></div>';
    }
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p style="color:var(--error)">${getErrorMessage(err)}</p>`;
  }
}

export async function savePreferences() {
  const data: Record<string, string> = {};
  document.querySelectorAll<HTMLInputElement>('[id^="pref_"]').forEach(el => {
    const key = el.id.replace('pref_', '');
    data[key] = el.value;
  });

  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      window.alert('Not connected');
      return;
    }
    await sendRequest(ws, encodeSavePreferencesRequest(JSON.stringify(data)));
    window.alert('Preferences saved!');
  } catch (err) {
    window.alert('Error: ' + getErrorMessage(err));
  }
}


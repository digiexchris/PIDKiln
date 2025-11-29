"use strict";
(() => {
  // src/main.ts
  var ws = null;
  var state = {};
  var preferences = {};
  var editorState = { filename: "", isNew: false };
  var chart = null;
  var chartInitializing = false;
  var chartData = {
    timestamps: [],
    kilnTemps: [],
    setTemps: [],
    envTemps: [],
    caseTemps: [],
    markers: []
  };
  var CHART_MAX_POINTS = 8640;
  var CHART_MIN_WINDOW = 30 * 60;
  var autoScrollEnabled = true;
  var programProfile = null;
  var programProfileLocked = false;
  var STATUS_NAMES = {
    0: "NONE",
    1: "READY",
    2: "RUNNING",
    3: "PAUSED",
    4: "STOPPED",
    5: "ABORTED",
    6: "WAITING",
    7: "FINISHED",
    8: "FAILED"
  };
  var STATUS_CLASSES = {
    2: "running",
    3: "paused",
    5: "error",
    8: "error"
  };
  var previewCharts = /* @__PURE__ */ new Map();
  var previewCache = /* @__PURE__ */ new Map();
  function formatTimeLabel(value) {
    const date = new Date(value * 1e3);
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  function formatPreviewTimeLabel(baseMs, offsetMinutes) {
    const ms = baseMs + Math.round(offsetMinutes * 60 * 1e3);
    const date = new Date(ms);
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  function getErrorMessage(err) {
    if (err instanceof Error)
      return err.message;
    return String(err);
  }
  function navigate() {
    const hash = window.location.hash.slice(2) || "";
    const viewId = hash.split("/")[0] || "dashboard";
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    const view = document.getElementById(`view-${viewId}`);
    if (view)
      view.classList.add("active");
    document.querySelectorAll(".nav-item").forEach((n) => {
      const href = n.getAttribute("href");
      n.classList.toggle(
        "active",
        href === `#/${hash}` || hash === "" && href === "#/" || viewId === "editor" && href === "#/programs"
      );
    });
    if (viewId === "programs")
      loadProgramList();
    if (viewId === "logs")
      loadLogsList();
    if (viewId === "preferences")
      loadPreferences();
    if (viewId === "debug")
      loadDebugInfo();
    if (viewId === "about")
      loadAboutInfo();
    if (viewId === "dashboard" || viewId === "") {
      if (!chart) {
        window.setTimeout(initChart, 100);
      }
    }
  }
  window.addEventListener("hashchange", navigate);
  var manualDisconnect = false;
  var reconnectTimeout = null;
  var reconnectStartTime = null;
  var RECONNECT_TIMEOUT_MS = 3e4;
  var RECONNECT_INTERVAL_MS = 3e3;
  function connect() {
    if (manualDisconnect)
      return;
    if (reconnectStartTime && Date.now() - reconnectStartTime > RECONNECT_TIMEOUT_MS) {
      log("error", "Reconnect timeout - giving up after 30s");
      reconnectStartTime = null;
      setConnected(false);
      return;
    }
    const wsUrl = `ws://${window.location.host}/ws`;
    log("sent", `Connecting to ${wsUrl}...`);
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      reconnectStartTime = null;
      setConnected(true);
      log("ack", "Connected");
      void loadProgramSelect();
      resetChartData();
      void loadChartHistory();
      programProfile = null;
      programProfileLocked = false;
    };
    ws.onclose = () => {
      setConnected(false);
      if (!manualDisconnect) {
        if (!reconnectStartTime) {
          reconnectStartTime = Date.now();
        }
        if (Date.now() - reconnectStartTime < RECONNECT_TIMEOUT_MS) {
          const elapsed = Math.round((Date.now() - reconnectStartTime) / 1e3);
          log("error", `Disconnected - reconnecting in 3s... (${elapsed}s elapsed)`);
          reconnectTimeout = window.setTimeout(connect, RECONNECT_INTERVAL_MS);
        } else {
          log("error", "Reconnect timeout - giving up after 30s");
          reconnectStartTime = null;
          setConnected(false);
        }
      }
    };
    ws.onerror = () => log("error", "WebSocket error");
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        handleMessage(msg);
      } catch (err) {
        log("error", `Parse error: ${e.data}`);
      }
    };
  }
  function disconnect() {
    manualDisconnect = true;
    reconnectStartTime = null;
    if (reconnectTimeout !== null) {
      window.clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    setConnected(false);
  }
  function manualConnect() {
    manualDisconnect = false;
    reconnectStartTime = null;
    connect();
  }
  function resetChartData() {
    chartData.timestamps = [];
    chartData.kilnTemps = [];
    chartData.setTemps = [];
    chartData.envTemps = [];
    chartData.caseTemps = [];
    chartData.markers = [];
  }
  function setConnected(connected) {
    const el = document.getElementById("connection");
    if (!el)
      return;
    el.classList.toggle("connected", connected);
    let statusText = "Disconnected";
    if (connected) {
      statusText = "Connected";
    } else if (!manualDisconnect && reconnectStartTime !== null) {
      statusText = "Reconnecting...";
    }
    const span = el.querySelector("span");
    if (span)
      span.textContent = statusText;
    const connectBtn = document.getElementById("connectBtn");
    const disconnectBtn = document.getElementById("disconnectBtn");
    if (connectBtn) {
      connectBtn.disabled = connected || !manualDisconnect && reconnectStartTime !== null;
    }
    if (disconnectBtn) {
      disconnectBtn.disabled = !connected && (manualDisconnect || reconnectStartTime === null);
    }
    const chartOverlay = document.getElementById("chartConnectionLost");
    if (chartOverlay) {
      chartOverlay.style.display = connected ? "none" : "flex";
    }
    if (!connected) {
      const statusKiln = document.getElementById("statusKiln");
      const statusTarget = document.getElementById("statusTarget");
      const statusEnv = document.getElementById("statusEnv");
      const statusHeat = document.getElementById("statusHeat");
      const statusBadge = document.getElementById("statusBadge");
      if (statusKiln)
        statusKiln.textContent = "N/A";
      if (statusTarget)
        statusTarget.textContent = "N/A";
      if (statusEnv)
        statusEnv.textContent = "N/A";
      if (statusHeat)
        statusHeat.textContent = "N/A";
      if (statusBadge) {
        statusBadge.textContent = "OFFLINE";
        statusBadge.className = "program-status error";
      }
    }
  }
  function handleMessage(msg) {
    if (msg.type !== "state") {
      log(msg.type, JSON.stringify("data" in msg ? msg.data : msg));
    }
    if (msg.type === "state") {
      state = msg.data;
      updateUI();
      if (state.kiln_temp !== void 0 && state.set_temp !== void 0) {
        addChartPoint(state.kiln_temp, state.set_temp, state.env_temp, state.case_temp);
      }
      handleProgramProfileUpdate();
    }
  }
  function sendCommand(action, params = {}) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      log("error", "Not connected");
      return;
    }
    const msg = { type: "command", action, ...params };
    log("sent", JSON.stringify(msg));
    ws.send(JSON.stringify(msg));
  }
  var isProgramRunning = false;
  function updateLoadControls(status) {
    const running = status === 2;
    isProgramRunning = running;
    const select = document.getElementById("programSelect");
    if (select)
      select.disabled = running;
    const sidebarBtn = document.getElementById("sidebarLoadBtn");
    if (sidebarBtn)
      sidebarBtn.disabled = running;
    const clearBtn = document.getElementById("sidebarClearBtn");
    if (clearBtn)
      clearBtn.disabled = running;
    applyProgramLoadButtons();
  }
  function applyProgramLoadButtons() {
    document.querySelectorAll(".program-load-btn").forEach((btn) => {
      btn.disabled = isProgramRunning;
      btn.classList.toggle("primary", !isProgramRunning);
      btn.classList.toggle("running-disabled", isProgramRunning);
    });
  }
  function updateStartButton(status) {
    const btn = document.getElementById("startBtn");
    const running = status === 2;
    if (!btn)
      return;
    btn.disabled = running;
    btn.classList.toggle("primary", !running);
    btn.classList.toggle("running-disabled", running);
  }
  function updateUI() {
    const s = state;
    const statusKiln = document.getElementById("statusKiln");
    const statusTarget = document.getElementById("statusTarget");
    const statusEnv = document.getElementById("statusEnv");
    const statusHeat = document.getElementById("statusHeat");
    if (statusKiln)
      statusKiln.textContent = formatTemp(s.kiln_temp);
    if (statusTarget)
      statusTarget.textContent = formatTemp(s.set_temp);
    if (statusEnv)
      statusEnv.textContent = formatTemp(s.env_temp);
    if (statusHeat)
      statusHeat.textContent = `${s.heat_percent || 0}%`;
    const badge = document.getElementById("statusBadge");
    if (badge) {
      badge.textContent = STATUS_NAMES[s.program_status] || "UNKNOWN";
      badge.className = "program-status " + (STATUS_CLASSES[s.program_status] || "");
    }
    const dashKiln = document.getElementById("dashKiln");
    const dashTarget = document.getElementById("dashTarget");
    const dashEnv = document.getElementById("dashEnv");
    const dashCase = document.getElementById("dashCase");
    const dashStatus = document.getElementById("dashStatus");
    const dashProgram = document.getElementById("dashProgram");
    const dashStep = document.getElementById("dashStep");
    const dashHeat = document.getElementById("dashHeat");
    const dashStart = document.getElementById("dashStart");
    const dashEnd = document.getElementById("dashEnd");
    const dashTime = document.getElementById("dashTime");
    const dashChange = document.getElementById("dashChange");
    if (dashKiln)
      dashKiln.textContent = formatTemp(s.kiln_temp);
    if (dashTarget)
      dashTarget.textContent = formatTemp(s.set_temp);
    if (dashEnv)
      dashEnv.textContent = formatTemp(s.env_temp);
    if (dashCase)
      dashCase.textContent = formatTemp(s.case_temp);
    if (dashStatus)
      dashStatus.textContent = STATUS_NAMES[s.program_status] || "--";
    if (dashProgram)
      dashProgram.textContent = s.program_name || "--";
    if (dashStep)
      dashStep.textContent = s.step || "--";
    if (dashHeat)
      dashHeat.textContent = `${s.heat_percent || 0}%`;
    if (dashStart)
      dashStart.textContent = s.prog_start || "--";
    if (dashEnd)
      dashEnd.textContent = s.prog_end || "--";
    if (dashTime)
      dashTime.textContent = s.curr_time || "--";
    if (dashChange)
      dashChange.textContent = `${s.temp_change || 0}\xB0C/h`;
    updateLoadControls(s.program_status);
    updateStartButton(s.program_status);
  }
  function formatTemp(val) {
    return val !== void 0 ? `${val.toFixed(1)}\xB0C` : "--";
  }
  function loadProgram() {
    const select = document.getElementById("programSelect");
    if (!select) {
      log("error", "Program select not found");
      return;
    }
    const program = select.value;
    if (!program) {
      log("error", "Select a program first");
      return;
    }
    sendCommand("load", { program });
  }
  function clearProgram() {
    if (state.program_status === 2) {
      window.alert("Cannot unload while program is running. Stop the program first.");
      return;
    }
    sendCommand("unload");
    programProfile = null;
    programProfileLocked = false;
    const select = document.getElementById("programSelect");
    if (select)
      select.value = "";
    updateChartData();
    setDefaultView();
  }
  function setTemperature() {
    const input = document.getElementById("tempInput");
    const temp = input ? parseFloat(input.value) : NaN;
    if (Number.isNaN(temp)) {
      log("error", "Invalid temperature");
      return;
    }
    sendCommand("set_temp", { temperature: temp });
  }
  async function reboot() {
    if (!window.confirm("Reboot the device?"))
      return;
    log("sent", "POST /api/reboot");
    try {
      const res = await window.fetch("/api/reboot", { method: "POST" });
      const data = await res.json();
      log("ack", JSON.stringify(data));
    } catch (err) {
      log("error", getErrorMessage(err));
    }
  }
  async function loadProgramSelect() {
    try {
      const res = await window.fetch("/programs/");
      const data = await res.json();
      const select = document.getElementById("programSelect");
      if (!select)
        return;
      select.innerHTML = '<option value="">Load program...</option>';
      data.files.forEach((f) => {
        const opt = document.createElement("option");
        opt.value = f.name;
        opt.textContent = f.name;
        select.appendChild(opt);
      });
    } catch (err) {
      log("error", `Failed to load programs: ${getErrorMessage(err)}`);
    }
  }
  async function loadProgramList() {
    const tbody = document.getElementById("programsTableBody");
    if (!tbody)
      return;
    try {
      const res = await window.fetch("/programs/");
      const data = await res.json();
      const disableAttr = isProgramRunning ? " disabled" : "";
      tbody.innerHTML = data.files.map((f) => {
        const attrName = escapeAttr(f.name);
        const jsName = escapeJs(f.name);
        const description = escapeHtml(f.description || "No description provided.");
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
      }).join("");
      applyProgramLoadButtons();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4" style="color:var(--error)">${getErrorMessage(err)}</td></tr>`;
    }
  }
  async function togglePreview(button) {
    if (!button)
      return;
    const name = button.dataset.program;
    if (!name)
      return;
    const selector = `tr[data-preview="${cssEscape(name)}"]`;
    const row = document.querySelector(selector);
    if (!row)
      return;
    const descRow = document.querySelector(`tr[data-description="${cssEscape(name)}"]`);
    const isOpen = row.dataset.open === "true";
    if (isOpen) {
      row.dataset.open = "false";
      row.style.display = "none";
      if (descRow) {
        descRow.style.display = "none";
      }
      updatePreviewButtonLabels(name, false);
      return;
    }
    row.dataset.open = "true";
    row.style.display = "table-row";
    if (descRow) {
      descRow.style.display = "table-row";
    }
    updatePreviewButtonLabels(name, true);
    const container = row.querySelector(".program-preview-chart");
    await showProgramPreview(name, container || void 0);
  }
  function updatePreviewButtonLabels(name, open) {
    document.querySelectorAll(`button[data-program="${cssEscape(name)}"]`).forEach((btn) => {
      const action = btn.dataset.previewAction;
      if (action === "toggle") {
        btn.textContent = open ? "Hide Preview" : "Preview";
      } else if (action === "close") {
        btn.textContent = "Close";
      }
    });
  }
  async function showProgramPreview(name, container) {
    if (!container)
      return;
    container.innerHTML = '<div class="preview-loading">Loading preview\u2026</div>';
    const width = container.clientWidth || 320;
    try {
      const content = await fetchProgramContent(name);
      const data = buildProgramPreviewData(content);
      if (!data) {
        container.innerHTML = '<div class="preview-error">Unable to render preview</div>';
        return;
      }
      container.innerHTML = "";
      const baseMs = Date.now();
      const opts = {
        width,
        height: 160,
        scales: {
          x: { time: false },
          y: { auto: true }
        },
        axes: [
          {
            stroke: "#888",
            grid: { stroke: "#2d2d3a", width: 1 },
            ticks: { stroke: "#2d2d3a" },
            values: (_, vals) => vals.map((v) => formatPreviewTimeLabel(baseMs, v)),
            label: "Time (hh:mm)"
          },
          {
            stroke: "#888",
            grid: { stroke: "#2d2d3a", width: 1 },
            ticks: { stroke: "#2d2d3a" },
            values: (_, vals) => vals.map((v) => `${Math.round(v)}\xB0C`),
            label: "Temperature (\xB0C)"
          }
        ],
        series: [
          {},
          {
            label: "Target",
            stroke: "#4ade80",
            width: 2,
            points: { show: false }
          }
        ],
        cursor: { show: false }
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
  async function fetchProgramContent(name) {
    if (previewCache.has(name)) {
      return previewCache.get(name);
    }
    const res = await window.fetch(`/programs/${encodeURIComponent(name)}`);
    if (!res.ok) {
      throw new Error("Failed to load program");
    }
    const text = await res.text();
    previewCache.set(name, text);
    return text;
  }
  function buildProgramPreviewData(content) {
    try {
      const program = JSON.parse(content);
      const segments = Array.isArray(program.segments) ? program.segments : [];
      if (!segments.length)
        return null;
      const minutes = [0];
      const temps = [segments[0].target ?? 0];
      let elapsed = 0;
      let currentTemp = temps[0];
      for (const segment of segments) {
        const target = typeof segment.target === "number" ? segment.target : currentTemp;
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
  function timeToSeconds(field) {
    if (!field)
      return 0;
    const hours = Number(field.hours) || 0;
    const minutes = Number(field.minutes) || 0;
    const seconds = Number(field.seconds) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  function createProgram() {
    const name = window.prompt("Program name (e.g., my_program.txt):");
    if (!name)
      return;
    void editProgram(name, true);
  }
  async function editProgram(name, isNew = false) {
    editorState.filename = name;
    editorState.isNew = isNew;
    const textarea = document.getElementById("editorContent");
    const filenameEl = document.getElementById("editorFilename");
    if (!textarea || !filenameEl)
      return;
    filenameEl.textContent = isNew ? `New: ${name}` : name;
    if (isNew) {
      textarea.value = "# Program description\n# Format: target_temp:ramp_minutes:dwell_minutes\n\n";
    } else {
      try {
        const res = await window.fetch(`/programs/${encodeURIComponent(name)}`);
        if (!res.ok)
          throw new Error("Failed to load");
        textarea.value = await res.text();
      } catch (err) {
        window.alert("Error loading program: " + getErrorMessage(err));
        return;
      }
    }
    updateEditorStatus();
    window.location.hash = "#/editor";
    textarea.focus();
  }
  async function saveProgram() {
    const textarea = document.getElementById("editorContent");
    if (!textarea)
      return;
    const content = textarea.value;
    const name = editorState.filename;
    if (!name) {
      window.alert("No filename set");
      return;
    }
    if (content.length > 10240) {
      window.alert("File too large (max 10KB)");
      return;
    }
    try {
      const blob = new Blob([content], { type: "text/plain" });
      const fd = new FormData();
      fd.append("upload", blob, name);
      const res = await window.fetch("/upload", { method: "POST", body: fd });
      if (!res.ok)
        throw new Error("Upload failed");
      void loadProgramSelect();
      window.location.hash = "#/programs";
    } catch (err) {
      window.alert("Error saving: " + getErrorMessage(err));
    }
  }
  function cancelEdit() {
    const textarea = document.getElementById("editorContent");
    const content = textarea ? textarea.value : "";
    if (content && !window.confirm("Discard changes?"))
      return;
    window.location.hash = "#/programs";
  }
  function updateEditorStatus() {
    const textarea = document.getElementById("editorContent");
    if (!textarea)
      return;
    const content = textarea.value;
    const lines = content.split("\n");
    const lineCount = document.getElementById("editorLineCount");
    const byteCount = document.getElementById("editorByteCount");
    if (lineCount)
      lineCount.textContent = `${lines.length} lines`;
    if (byteCount)
      byteCount.textContent = `${new Blob([content]).size} bytes`;
    const lineNumbers = document.getElementById("editorLines");
    if (lineNumbers) {
      lineNumbers.textContent = lines.map((_, i) => i + 1).join("\n");
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    const textarea = document.getElementById("editorContent");
    if (textarea) {
      textarea.addEventListener("input", updateEditorStatus);
      textarea.addEventListener("scroll", () => {
        const lines = document.getElementById("editorLines");
        if (lines) {
          lines.scrollTop = textarea.scrollTop;
        }
      });
    }
  });
  async function deleteProgram(name) {
    if (!window.confirm(`Delete program "${name}"?`))
      return;
    try {
      const res = await window.fetch("/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: name })
      });
      if (!res.ok)
        throw new Error("Delete failed");
      void loadProgramList();
      void loadProgramSelect();
    } catch (err) {
      window.alert("Error: " + getErrorMessage(err));
    }
  }
  async function loadLogsList() {
    const tbody = document.getElementById("logsTableBody");
    if (!tbody)
      return;
    try {
      const res = await window.fetch("/logs/");
      const data = await res.json();
      if (!data.files.length) {
        tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text-muted)">No logs yet</td></tr>';
        return;
      }
      tbody.innerHTML = data.files.map((f) => `
          <tr>
            <td>${escapeHtml(f.name)}</td>
            <td>${f.size} B</td>
            <td class="actions">
              <button class="btn-small" onclick="viewLog('${f.name}')">View</button>
              <button class="btn-small" onclick="downloadLog('${f.name}')">Download</button>
            </td>
          </tr>
        `).join("");
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="3" style="color:var(--error)">${getErrorMessage(err)}</td></tr>`;
    }
  }
  async function viewLog(name) {
    try {
      const res = await window.fetch(`/logs/${encodeURIComponent(name)}`);
      const content = await res.text();
      window.alert(content.slice(0, 2e3) + (content.length > 2e3 ? "\n...(truncated)" : ""));
    } catch (err) {
      window.alert("Error: " + getErrorMessage(err));
    }
  }
  function downloadLog(name) {
    window.open(`/logs/${encodeURIComponent(name)}`, "_blank");
  }
  async function loadPreferences() {
    const container = document.getElementById("prefsContent");
    if (!container)
      return;
    try {
      const res = await window.fetch("/api/preferences");
      preferences = await res.json();
      const sections = {
        WiFi: ["WiFi_SSID", "WiFi_Password", "WiFi_Mode", "WiFi_Retry_cnt"],
        "HTTP Server": ["Auth_Username", "Auth_Password", "HTTP_Local_JS"],
        Time: ["NTP_Server1", "NTP_Server2", "NTP_Server3", "GMT_Offset_sec", "Daylight_Offset_sec"],
        PID: ["PID_Window", "PID_Kp", "PID_Ki", "PID_Kd", "PID_POE", "PID_Temp_Threshold"],
        Logging: ["LOG_Window", "LOG_Files_Limit"],
        Safety: ["MIN_Temperature", "MAX_Temperature", "MAX_Housing_Temperature", "Thermal_Runaway", "Alarm_Timeout", "MAX31855_Error_Grace_Count"],
        Debug: ["DBG_Serial", "DBG_Syslog", "DBG_Syslog_Srv", "DBG_Syslog_Port"]
      };
      let html = "";
      for (const [section, keys] of Object.entries(sections)) {
        html += `<div class="prefs-section"><div class="prefs-section-header">${section}</div><div class="prefs-section-content">`;
        for (const key of keys) {
          if (preferences[key] !== void 0) {
            const type = key.includes("Password") ? "password" : "text";
            html += `<div class="pref-row">
                <label class="pref-label">${key}</label>
                <div class="pref-input"><input type="${type}" id="pref_${key}" value="${escapeHtml(String(preferences[key]))}"></div>
              </div>`;
          }
        }
        html += "</div></div>";
      }
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<p style="color:var(--error)">${getErrorMessage(err)}</p>`;
    }
  }
  async function savePreferences() {
    const data = {};
    document.querySelectorAll('[id^="pref_"]').forEach((el) => {
      const key = el.id.replace("pref_", "");
      data[key] = el.value;
    });
    try {
      const res = await window.fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok)
        throw new Error("Save failed");
      window.alert("Preferences saved!");
    } catch (err) {
      window.alert("Error: " + getErrorMessage(err));
    }
  }
  async function loadDebugInfo() {
    const table = document.getElementById("debugTable");
    if (!table)
      return;
    try {
      const res = await window.fetch("/api/debug");
      const data = await res.json();
      const sections = {
        "Chip Information": ["CHIP_ID", "CHIP_REV", "CHIP_MODEL", "CHIP_CORES", "CPU_FREQ", "SDK_VERSION", "MAC_ADDRESS"],
        Flash: ["SFLASH_RAM", "FLASH_FREQ", "FLASH_MODE", "SKETCH_SIZE", "SKETCH_TOTAL"],
        PSRAM: ["TOTAL_PSRAM", "FREE_PSRAM", "SMALEST_PSRAM", "LARGEST_PSRAM"],
        Heap: ["TOTAL_HEAP", "FREE_HEAP", "SMALEST_HEAP", "LARGEST_HEAP"],
        Filesystem: ["TOTAL_KB", "USED_KB"]
      };
      let html = "";
      for (const [section, keys] of Object.entries(sections)) {
        html += `<tr><th colspan="2">${section}</th></tr>`;
        for (const key of keys) {
          if (data[key] !== void 0) {
            html += `<tr><td>${key}</td><td>${escapeHtml(String(data[key]))}</td></tr>`;
          }
        }
      }
      table.innerHTML = html;
    } catch (err) {
      table.innerHTML = `<tr><td colspan="2" style="color:var(--error)">${getErrorMessage(err)}</td></tr>`;
    }
  }
  async function loadAboutInfo() {
    try {
      const res = await window.fetch("/api/debug");
      const data = await res.json();
      const aboutVersion = document.getElementById("aboutVersion");
      if (aboutVersion) {
        aboutVersion.textContent = data.VERSION || "Unknown";
      }
    } catch {
      const aboutVersion = document.getElementById("aboutVersion");
      if (aboutVersion) {
        aboutVersion.textContent = "Error loading";
      }
    }
  }
  function nowLinePlugin() {
    return {
      hooks: {
        draw: [
          (u) => {
            const ctx = u.ctx;
            const now = Date.now() / 1e3;
            const xMin = u.scales.x.min;
            const xMax = u.scales.x.max;
            if (now < xMin || now > xMax)
              return;
            const x = u.valToPos(now, "x", true);
            const top = u.bbox.top;
            const bottom = u.bbox.top + u.bbox.height;
            ctx.save();
            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(x, top);
            ctx.lineTo(x, bottom);
            ctx.stroke();
            ctx.fillStyle = "#fbbf24";
            ctx.font = "10px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Now", x, top - 4);
            ctx.restore();
          }
        ]
      }
    };
  }
  function initChart() {
    if (chart || chartInitializing)
      return;
    if (typeof uPlot === "undefined") {
      console.warn("uPlot not loaded");
      return;
    }
    const container = document.getElementById("chartContainer");
    if (!container) {
      console.warn("Chart container not found");
      return;
    }
    const dashboardView = document.getElementById("view-dashboard");
    if (!dashboardView || !dashboardView.classList.contains("active")) {
      return;
    }
    if (!container.offsetParent && window.getComputedStyle(container).display === "none") {
      return;
    }
    const width = container.clientWidth || 400;
    if (width < 100) {
      return;
    }
    chartInitializing = true;
    const now = Date.now() / 1e3;
    const data = [
      [now - 60, now],
      // timestamps
      [25, 25],
      // Kiln temps
      [0, 0],
      // Set temps
      [22, 22],
      // Env temps
      [28, 28],
      // Case temps
      [null, null]
      // Program profile
    ];
    const opts = {
      width,
      height: 300,
      plugins: [
        nowLinePlugin()
      ],
      scales: {
        x: { time: true },
        y: { auto: true }
      },
      series: [
        {},
        {
          label: "Kiln",
          stroke: "#ff6b4a",
          width: 2,
          points: { show: false }
        },
        {
          label: "Target",
          stroke: "#4ade80",
          width: 2,
          points: { show: false }
        },
        {
          label: "Env",
          stroke: "#888888",
          width: 1,
          points: { show: false }
        },
        {
          label: "Case",
          stroke: "#666666",
          width: 1,
          points: { show: false }
        },
        {
          label: "Program",
          stroke: "#22d3ee",
          width: 2,
          dash: [5, 5],
          points: { show: false }
        }
      ],
      axes: [
        {
          stroke: "#888",
          grid: { stroke: "#2d2d3a", width: 1 },
          ticks: { stroke: "#2d2d3a" },
          values: (_, vals) => vals.map((v) => formatTimeLabel(v)),
          font: "11px Inter, sans-serif"
        },
        {
          stroke: "#888",
          grid: { stroke: "#2d2d3a", width: 1 },
          ticks: { stroke: "#2d2d3a" },
          values: (_, vals) => vals.map((v) => `${Math.round(v)}\xB0C`),
          font: "11px Inter, sans-serif",
          size: 50
        }
      ],
      legend: { show: false },
      cursor: {
        show: true,
        drag: { x: true, y: false }
      },
      hooks: {
        setScale: [
          (_u, key) => {
            if (key === "x") {
              updateOverviewBar();
            }
          }
        ],
        ready: [
          (u) => {
            u.root.addEventListener("mousedown", (e) => {
              const target = e.target;
              if (target.tagName === "CANVAS") {
                autoScrollEnabled = false;
                updateAutoScrollButton();
              }
            });
          }
        ]
      }
    };
    window.setTimeout(() => {
      try {
        const el = document.getElementById("chartContainer");
        if (!el) {
          console.warn("Chart container not found");
          chartInitializing = false;
          return;
        }
        el.innerHTML = "";
        chart = new uPlot(opts, data, el);
        chartInitializing = false;
        console.log("Chart initialized successfully");
        createChartLegend();
        setDefaultView();
        const resizeObserver = new ResizeObserver(() => {
          if (chart && el.clientWidth > 0) {
            chart.setSize({ width: el.clientWidth, height: 300 });
          }
        });
        resizeObserver.observe(el);
        el.addEventListener("wheel", (e) => {
          if (!chart)
            return;
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
          chart.setScale("x", { min: newMin, max: newMax });
        }, { passive: false });
        let touchStartX = null;
        let touchStartScale = null;
        let initialPinchDistance = null;
        el.addEventListener("touchstart", (e) => {
          if (!chart)
            return;
          if (e.touches.length === 1) {
            autoScrollEnabled = false;
            updateAutoScrollButton();
            touchStartX = e.touches[0].clientX;
            touchStartScale = { min: chart.scales.x.min, max: chart.scales.x.max };
          } else if (e.touches.length === 2) {
            initialPinchDistance = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
            touchStartScale = { min: chart.scales.x.min, max: chart.scales.x.max };
          }
        }, { passive: true });
        el.addEventListener("touchmove", (e) => {
          if (!chart || !touchStartScale)
            return;
          if (e.touches.length === 1 && touchStartX !== null) {
            e.preventDefault();
            const dx = e.touches[0].clientX - touchStartX;
            const pxPerSec = el.clientWidth / (touchStartScale.max - touchStartScale.min);
            const dt = dx / pxPerSec;
            chart.setScale("x", { min: touchStartScale.min - dt, max: touchStartScale.max - dt });
          } else if (e.touches.length === 2 && initialPinchDistance !== null) {
            e.preventDefault();
            const currentDistance = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
            const scale = initialPinchDistance / currentDistance;
            const range = (touchStartScale.max - touchStartScale.min) * scale;
            const center = (touchStartScale.min + touchStartScale.max) / 2;
            const clampedRange = Math.max(CHART_MIN_WINDOW, Math.min(getChartMaxRange(), range));
            chart.setScale("x", { min: center - clampedRange / 2, max: center + clampedRange / 2 });
          }
        }, { passive: false });
        el.addEventListener("touchend", () => {
          touchStartX = null;
          touchStartScale = null;
          initialPinchDistance = null;
        }, { passive: true });
        setupOverviewBar();
        updateOverviewBar();
      } catch (e) {
        console.error("Failed to initialize chart:", e);
        chart = null;
        chartInitializing = false;
      }
    }, 100);
  }
  async function loadChartHistory() {
    try {
      const res = await window.fetch("/api/history");
      if (!res.ok) {
        console.warn("History API not available (status:", res.status, ")");
        return;
      }
      const data = await res.json();
      if (!data.data || !data.data.length) {
        console.log("No history data available");
        return;
      }
      chartData.timestamps = [];
      chartData.kilnTemps = [];
      chartData.setTemps = [];
      chartData.envTemps = [];
      chartData.caseTemps = [];
      chartData.markers = [];
      for (const point of data.data) {
        if (point.t && point.k !== void 0 && point.s !== void 0) {
          chartData.timestamps.push(point.t / 1e3);
          chartData.kilnTemps.push(point.k);
          chartData.setTemps.push(point.s);
          chartData.envTemps.push(point.e !== void 0 ? point.e : 22);
          chartData.caseTemps.push(point.c !== void 0 ? point.c : 28);
          if (point.m) {
            chartData.markers.push({
              x: point.t / 1e3,
              type: point.m.type,
              value: point.m.value
            });
          }
        }
      }
      console.log("Loaded", chartData.timestamps.length, "history points");
      if (chart) {
        updateChartData();
        if (autoScrollEnabled) {
          setDefaultView();
        }
      }
    } catch (err) {
      console.warn("Failed to load chart history:", getErrorMessage(err));
    }
  }
  function addChartPoint(kilnTemp, setTemp, envTemp, caseTemp) {
    if (kilnTemp === void 0 || setTemp === void 0 || Number.isNaN(kilnTemp) || Number.isNaN(setTemp)) {
      return;
    }
    const now = Date.now() / 1e3;
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
  function updateChartData() {
    if (!chart)
      return;
    const len = chartData.timestamps.length;
    if (len === 0)
      return;
    while (chartData.envTemps.length < len)
      chartData.envTemps.push(22);
    while (chartData.caseTemps.length < len)
      chartData.caseTemps.push(28);
    const now = Date.now() / 1e3;
    let timestamps = [...chartData.timestamps];
    let kilnTemps = [...chartData.kilnTemps];
    let setTemps = [...chartData.setTemps];
    let envTemps = [...chartData.envTemps];
    let caseTemps = [...chartData.caseTemps];
    if (programProfile && programProfile.durationMinutes > 0) {
      const anchorTime = programProfileLocked && programProfile.startTime ? programProfile.startTime : now;
      const profileEnd = anchorTime + programProfile.durationMinutes * 60;
      const lastTimestamp = timestamps[timestamps.length - 1] || now;
      if (profileEnd > lastTimestamp) {
        for (let t = lastTimestamp + 60; t <= profileEnd; t += 60) {
          timestamps.push(t);
          kilnTemps.push(null);
          setTemps.push(null);
          envTemps.push(null);
          caseTemps.push(null);
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
      profileTemps
    ], false);
    if (autoScrollEnabled) {
      const nowSec = Date.now() / 1e3;
      const newMin = nowSec - currentRange * 0.67;
      const newMax = nowSec + currentRange * 0.33;
      chart.setScale("x", { min: newMin, max: newMax });
    } else {
      chart.setScale("x", { min: currentMin, max: currentMax });
    }
    updateOverviewBar();
  }
  function getChartMaxRange() {
    const now = Date.now() / 1e3;
    const oldest = chartData.timestamps.length > 0 ? chartData.timestamps[0] : now - 3600;
    const programEnd = getProgramEndTime();
    const rightEdge = Math.max(now + 6 * 3600, programEnd);
    return rightEdge - oldest;
  }
  function getProgramEndTime() {
    if (!programProfile)
      return Date.now() / 1e3;
    const startTime = programProfile.startTime || Date.now() / 1e3;
    return startTime + programProfile.durationMinutes * 60;
  }
  function resetZoom() {
    if (!chart)
      return;
    const currentCenter = (chart.scales.x.min + chart.scales.x.max) / 2;
    const windowSize = 60 * 60;
    const min = currentCenter - windowSize / 2;
    const max = currentCenter + windowSize / 2;
    chart.setScale("x", { min, max });
  }
  function setDefaultView() {
    if (!chart)
      return;
    const now = Date.now() / 1e3;
    const windowSize = 60 * 60;
    const min = now - windowSize * 0.67;
    const max = now + windowSize * 0.33;
    chart.setScale("x", { min, max });
  }
  function toggleAutoScroll() {
    if (!chart)
      return;
    autoScrollEnabled = !autoScrollEnabled;
    updateAutoScrollButton();
    if (autoScrollEnabled) {
      const currentRange = chart.scales.x.max - chart.scales.x.min;
      const now = Date.now() / 1e3;
      const min = now - currentRange * 0.67;
      const max = now + currentRange * 0.33;
      chart.setScale("x", { min, max });
    }
  }
  function updateAutoScrollButton() {
    const btn = document.getElementById("autoScrollBtn");
    if (!btn)
      return;
    btn.textContent = autoScrollEnabled ? "\u23F8 Auto Scroll" : "\u25B6 Auto Scroll";
  }
  function centerOnProgram() {
    setDefaultView();
  }
  function createChartLegend() {
    const legendEl = document.getElementById("chartLegend");
    if (!legendEl || !chart)
      return;
    const series = [
      { label: "Kiln", color: "#ff6b4a" },
      { label: "Target", color: "#4ade80" },
      { label: "Env", color: "#888888" },
      { label: "Case", color: "#666666" },
      { label: "Program", color: "#22d3ee", dashed: true }
    ];
    legendEl.innerHTML = series.map((s, i) => {
      const idx = i + 1;
      const dashStyle = s.dashed ? `border-top: 2px dashed ${s.color}` : `background: ${s.color}`;
      return `<div class="chart-legend-item" data-series="${idx}" style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
          <span style="width: 16px; height: 3px; ${dashStyle};"></span>
          <span style="color: var(--text);">${s.label}</span>
        </div>`;
    }).join("");
    legendEl.querySelectorAll(".chart-legend-item").forEach((item) => {
      item.addEventListener("click", () => {
        if (!chart)
          return;
        const idx = parseInt(item.dataset.series || "0", 10);
        const isVisible = chart.series[idx]?.show;
        chart.setSeries(idx, { show: !isVisible });
        item.style.opacity = isVisible ? "0.4" : "1";
      });
    });
  }
  async function loadProgramProfile(programName) {
    if (!programName || programName === "(manual hold)") {
      programProfile = null;
      updateChartData();
      return;
    }
    try {
      const res = await window.fetch(`/programs/${encodeURIComponent(programName)}`);
      if (!res.ok)
        throw new Error("Failed to load program");
      const content = await res.text();
      const program = JSON.parse(content);
      const segments = program.segments || [];
      if (!segments.length) {
        programProfile = null;
        updateChartData();
        return;
      }
      const times = [0];
      const temps = [segments[0].target ?? 0];
      let elapsed = 0;
      let currentTemp = temps[0];
      for (const segment of segments) {
        const target = segment.target ?? currentTemp;
        const rampSeconds = timeToSeconds(segment.ramp_time);
        if (rampSeconds > 0) {
          elapsed += rampSeconds;
          times.push(elapsed / 60);
          temps.push(target);
        } else if (target !== currentTemp) {
          times.push(elapsed / 60);
          temps.push(target);
        }
        currentTemp = target;
        const dwellSeconds = timeToSeconds(segment.dwell_time);
        if (dwellSeconds > 0) {
          elapsed += dwellSeconds;
          times.push(elapsed / 60);
          temps.push(target);
        }
      }
      programProfile = {
        name: programName,
        startTime: null,
        durationMinutes: elapsed / 60,
        times,
        temps
      };
      console.log("Loaded program profile:", programName, "duration:", elapsed / 60, "min", "points:", times.length);
      updateChartData();
    } catch (err) {
      console.warn("Failed to load program profile:", getErrorMessage(err));
      programProfile = null;
    }
  }
  function buildProfileChartData(targetTimestamps) {
    if (!programProfile || !programProfile.times.length) {
      return new Array(targetTimestamps.length).fill(null);
    }
    let anchorTime;
    if (programProfileLocked && programProfile.startTime) {
      anchorTime = programProfile.startTime;
    } else {
      anchorTime = Date.now() / 1e3;
    }
    const profileTimes = programProfile.times;
    const profileTemps = programProfile.temps;
    const profileTimestamps = profileTimes.map((m) => anchorTime + m * 60);
    const profileStart = profileTimestamps[0];
    const profileEnd = profileTimestamps[profileTimestamps.length - 1];
    return targetTimestamps.map((t) => {
      if (t < profileStart || t > profileEnd)
        return null;
      for (let i = 0; i < profileTimestamps.length - 1; i++) {
        if (t >= profileTimestamps[i] && t <= profileTimestamps[i + 1]) {
          const t0 = profileTimestamps[i];
          const t1 = profileTimestamps[i + 1];
          const v0 = profileTemps[i];
          const v1 = profileTemps[i + 1];
          const pct = (t - t0) / (t1 - t0);
          return v0 + (v1 - v0) * pct;
        }
      }
      return null;
    });
  }
  function handleProgramProfileUpdate() {
    const prevProgramName = programProfile?.name;
    const currentProgramName = state.program_name;
    if (currentProgramName && currentProgramName !== prevProgramName) {
      void loadProgramProfile(currentProgramName);
    }
    const wasLocked = programProfileLocked;
    const isRunning = state.program_status === 2;
    const isStopped = [4, 5, 7, 8].includes(state.program_status);
    if (isRunning && !wasLocked) {
      programProfileLocked = true;
      if (programProfile) {
        programProfile.startTime = Date.now() / 1e3;
      }
    } else if (isStopped) {
      programProfileLocked = true;
    }
    if (!currentProgramName || state.program_status === 0) {
      programProfile = null;
      programProfileLocked = false;
    }
  }
  function setupOverviewBar() {
    const overview = document.getElementById("chartOverview");
    if (!overview)
      return;
    const viewport = document.createElement("div");
    viewport.className = "overview-viewport";
    overview.appendChild(viewport);
    let dragging = false;
    let startX = 0;
    let startLeft = 0;
    viewport.addEventListener("mousedown", (e) => {
      dragging = true;
      autoScrollEnabled = false;
      updateAutoScrollButton();
      startX = e.clientX;
      startLeft = parseFloat(viewport.style.left || "0");
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (!dragging || !chart)
        return;
      const dx = e.clientX - startX;
      const overviewWidth = overview.clientWidth;
      const dPct = dx / overviewWidth * 100;
      const now = Date.now() / 1e3;
      const oldest = chartData.timestamps[0] || now - 3600;
      const programEnd = getProgramEndTime();
      const rightEdge = Math.max(now + 6 * 3600, programEnd);
      const fullRange = rightEdge - oldest;
      const viewRange = chart.scales.x.max - chart.scales.x.min;
      const newLeftPct = Math.max(0, Math.min(100 - viewRange / fullRange * 100, startLeft + dPct));
      const newMin = oldest + newLeftPct / 100 * fullRange;
      const newMax = newMin + viewRange;
      chart.setScale("x", { min: newMin, max: newMax });
    });
    document.addEventListener("mouseup", () => {
      dragging = false;
    });
    overview.addEventListener("click", (e) => {
      if (!chart)
        return;
      const target = e.target;
      if (target.classList.contains("overview-viewport"))
        return;
      autoScrollEnabled = false;
      updateAutoScrollButton();
      const rect = overview.getBoundingClientRect();
      const clickPct = (e.clientX - rect.left) / rect.width;
      const now = Date.now() / 1e3;
      const oldest = chartData.timestamps[0] || now - 3600;
      const programEnd = getProgramEndTime();
      const rightEdge = Math.max(now + 6 * 3600, programEnd);
      const fullRange = rightEdge - oldest;
      const viewRange = chart.scales.x.max - chart.scales.x.min;
      const centerTime = oldest + clickPct * fullRange;
      const newMin = centerTime - viewRange / 2;
      const newMax = centerTime + viewRange / 2;
      chart.setScale("x", { min: newMin, max: newMax });
    });
  }
  function updateOverviewBar() {
    const overview = document.getElementById("chartOverview");
    if (!overview || !chart)
      return;
    const viewport = overview.querySelector(".overview-viewport");
    if (!viewport)
      return;
    const now = Date.now() / 1e3;
    const oldest = chartData.timestamps.length > 0 ? chartData.timestamps[0] : now - 3600;
    const programEnd = getProgramEndTime();
    const rightEdge = Math.max(now + 6 * 3600, programEnd);
    const fullRange = rightEdge - oldest;
    const viewMin = chart.scales.x.min;
    const viewMax = chart.scales.x.max;
    const leftPct = (viewMin - oldest) / fullRange * 100;
    const widthPct = (viewMax - viewMin) / fullRange * 100;
    viewport.style.left = `${Math.max(0, leftPct)}%`;
    viewport.style.width = `${Math.min(100 - Math.max(0, leftPct), widthPct)}%`;
  }
  async function uploadFirmware() {
    const fileInput = document.getElementById("firmwareFile");
    const status = document.getElementById("firmwareStatus");
    if (!fileInput || !status)
      return;
    if (!fileInput.files || !fileInput.files.length) {
      status.innerHTML = '<span style="color: var(--error)">Please select a .bin file</span>';
      return;
    }
    const file = fileInput.files[0];
    if (!file.name.endsWith(".bin")) {
      status.innerHTML = '<span style="color: var(--error)">File must be a .bin file</span>';
      return;
    }
    if (!window.confirm(`Upload firmware "${file.name}" (${(file.size / 1024).toFixed(1)} KB)?

The device will restart after upload.`)) {
      return;
    }
    status.innerHTML = '<span style="color: var(--info)">Uploading...</span>';
    try {
      const fd = new FormData();
      fd.append("update", file);
      const res = await window.fetch("/update-firmware", { method: "POST", body: fd });
      if (res.ok) {
        status.innerHTML = '<span style="color: var(--success)">Upload complete! Device restarting...</span>';
        window.setTimeout(() => {
          status.innerHTML += '<br><span style="color: var(--text-muted)">Refresh page in a few seconds.</span>';
        }, 2e3);
      } else {
        throw new Error(`Upload failed: ${res.status}`);
      }
    } catch (err) {
      status.innerHTML = `<span style="color: var(--error)">Error: ${getErrorMessage(err)}</span>`;
    }
  }
  var wsLogEnabled = false;
  function toggleWsLog() {
    const checkbox = document.getElementById("wsLogEnabled");
    const container = document.getElementById("wsLogContainer");
    if (!checkbox || !container)
      return;
    wsLogEnabled = checkbox.checked;
    container.style.display = wsLogEnabled ? "flex" : "none";
    window.localStorage.setItem("wsLogEnabled", String(wsLogEnabled));
  }
  function initWsLogState() {
    wsLogEnabled = window.localStorage.getItem("wsLogEnabled") === "true";
    const checkbox = document.getElementById("wsLogEnabled");
    const container = document.getElementById("wsLogContainer");
    if (checkbox && container) {
      checkbox.checked = wsLogEnabled;
      container.style.display = wsLogEnabled ? "flex" : "none";
    }
  }
  function log(type, message) {
    if (!wsLogEnabled)
      return;
    const container = document.getElementById("logContent");
    if (!container)
      return;
    const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-GB", { hour12: false });
    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-type ${type}">${type.toUpperCase()}</span>
        <span class="log-message">${escapeHtml(message)}</span>
      `;
    container.insertBefore(entry, container.firstChild);
    while (container.children.length > 200)
      container.removeChild(container.lastChild);
  }
  function clearLog() {
    const logContent = document.getElementById("logContent");
    if (logContent) {
      logContent.innerHTML = "";
    }
  }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function escapeAttr(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function escapeJs(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, "\\n");
  }
  function cssEscape(value) {
    if (window.CSS && window.CSS.escape) {
      return window.CSS.escape(value);
    }
    return String(value).replace(/[^a-zA-Z0-9_-]/g, (match) => `\\${match}`);
  }
  window.addEventListener("load", () => {
    initWsLogState();
    navigate();
    connect();
    window.setTimeout(() => {
      void loadChartHistory();
    }, 500);
  });
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
    clearLog
  });
})();
//# sourceMappingURL=app.js.map

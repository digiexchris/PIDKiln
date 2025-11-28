/**
 * PIDKiln Development Simulator
 * 
 * A mock server that simulates ESP32 API endpoints for frontend development.
 * Run with: npm start (or node server.js)
 * 
 * HTTP Endpoints:
 *   GET  /programs/             - List program files
 *   GET  /programs/:filename    - Get program content
 *   POST /upload                - Upload program file
 *   POST /delete                - Delete program file
 *   GET  /logs/                 - List log files
 *   GET  /logs/:filename        - Get log content
 *   GET  /etc/pidkiln.conf      - Get config file
 *   GET  /api/preferences       - Get preferences (JSON)
 *   POST /api/preferences       - Save preferences (JSON)
 *   GET  /api/debug             - Debug info (JSON)
 *   POST /api/reboot            - Reboot device
 *   GET  /PIDKiln_vars.json     - Live data (deprecated, use WebSocket)
 *   POST /api/program/:action   - Control program (deprecated, use WebSocket)
 * 
 * WebSocket:
 *   ws://localhost:3000/ws      - Real-time state updates and commands
 */

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { WebSocketServer } = require('ws');
const {
  PROGRAM_STATUS,
  state,
  stateEmitter,
  getState,
  getVarsJson,
  executeCommand,
  programs,
  logs,
  preferences,
  debugInfo,
  getHistory
} = require('./mock-data');

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server (shared with WebSocket)
const server = http.createServer(app);

// =============================================================================
// WebSocket Server
// =============================================================================

const wss = new WebSocketServer({ server, path: '/ws' });

// Track connected clients
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  clients.add(ws);
  
  // Send current state immediately on connect
  ws.send(JSON.stringify({ type: 'state', data: getState() }));
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString());
      console.log('WebSocket received:', msg);
      
      if (msg.type === 'command') {
        // For load command, read program from filesystem if needed
        if (msg.action === 'load' && msg.program) {
          const filename = msg.program;
          const filePath = path.join(PROGRAMS_DIR, filename);
          
          if (fs.existsSync(filePath)) {
            try {
              msg.content = fs.readFileSync(filePath, 'utf8');
            } catch (e) {
              console.error(`Error reading program ${filename}:`, e);
            }
          }
        }
        
        const result = executeCommand(msg.action, msg);
        ws.send(JSON.stringify({
          type: 'ack',
          action: msg.action,
          success: result.success,
          ...(result.error && { error: result.error })
        }));
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clients.delete(ws);
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(type, data) {
  const message = JSON.stringify({ type, data });
  for (const client of clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  }
}

// Subscribe to state changes from mock-data
stateEmitter.on('state', (data) => {
  broadcast('state', data);
});

stateEmitter.on('log', (data) => {
  broadcast('log', data);
});

// =============================================================================
// Express Middleware
// =============================================================================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Request logging
app.use((req, res, next) => {
  if (!req.url.includes('PIDKiln_vars.json')) { // Don't log polling
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  }
  next();
});

// File upload handling
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 } // 10KB limit like ESP32
});

// =============================================================================
// HTTP API Endpoints
// =============================================================================

/**
 * Live data endpoint (deprecated - use WebSocket)
 */
app.get('/PIDKiln_vars.json', (req, res) => {
  res.json(getVarsJson());
});

/**
 * Programs directory listing
 */
app.get('/programs/', (req, res) => {
  try {
    const files = [];
    
    // Read from filesystem
    if (fs.existsSync(PROGRAMS_DIR)) {
      const filenames = fs.readdirSync(PROGRAMS_DIR)
        .filter(f => f.endsWith('.json') || f.endsWith('.txt'));
      
      for (const filename of filenames) {
        try {
          const filePath = path.join(PROGRAMS_DIR, filename);
          const content = fs.readFileSync(filePath, 'utf8');
          files.push({
            name: filename,
            size: content.length,
            description: extractDescription(content)
          });
        } catch (e) {
          console.error(`Error reading ${filename}:`, e);
        }
      }
    }
    
    // Also include in-memory programs (for backwards compatibility)
    for (const [name, content] of Object.entries(programs)) {
      if (!files.find(f => f.name === name)) {
        files.push({
          name,
          size: content.length,
          description: extractDescription(content)
        });
      }
    }
    
    res.json({ files });
  } catch (e) {
    console.error('Error listing programs:', e);
    res.status(500).json({ error: 'Failed to list programs' });
  }
});

/**
 * Get program content
 */
app.get('/programs/:filename', (req, res) => {
  const filename = req.params.filename;
  if (filename === 'index.html') {
    return res.redirect('/programs/');
  }
  
  // Try filesystem first
  const filePath = path.join(PROGRAMS_DIR, filename);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const contentType = filename.endsWith('.json') ? 'application/json' : 'text/plain';
    res.type(contentType).send(content);
    return;
  }
  
  // Fallback to in-memory
  if (programs[filename]) {
    res.type('text/plain').send(programs[filename]);
  } else {
    res.status(404).send('File not found');
  }
});

/**
 * Upload program file
 */
app.post('/upload', upload.single('upload'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }
  const filename = req.file.originalname;
  const content = req.file.buffer.toString('utf8');
  
  // Validate filename
  if (filename.length > 20) {
    return res.status(400).send('Filename too long (max 20 chars)');
  }
  if (!/^[A-Za-z0-9._]+\.(json|txt)$/i.test(filename)) {
    return res.status(400).send('Invalid filename (must end with .json or .txt)');
  }
  
  // Validate JSON if .json file
  if (filename.endsWith('.json')) {
    try {
      JSON.parse(content);
    } catch (e) {
      return res.status(400).send('Invalid JSON format');
    }
  }
  
  // Save to filesystem
  try {
    if (!fs.existsSync(PROGRAMS_DIR)) {
      fs.mkdirSync(PROGRAMS_DIR, { recursive: true });
    }
    const filePath = path.join(PROGRAMS_DIR, filename);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Uploaded program: ${filename} (${content.length} bytes)`);
    res.send('OK');
  } catch (e) {
    console.error('Error saving program:', e);
    res.status(500).send('Failed to save program');
  }
});

/**
 * Delete program file
 */
app.post('/delete', (req, res) => {
  const filename = req.body.file || req.body.filename;
  if (!filename) {
    return res.status(400).send('No filename provided');
  }
  
  // Try filesystem first
  const filePath = path.join(PROGRAMS_DIR, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`Deleted program: ${filename}`);
      res.send('OK');
      return;
    } catch (e) {
      console.error('Error deleting program:', e);
      res.status(500).send('Failed to delete program');
      return;
    }
  }
  
  // Fallback to in-memory
  if (programs[filename]) {
    delete programs[filename];
    console.log(`Deleted program: ${filename}`);
    res.send('OK');
  } else {
    res.status(404).send('File not found');
  }
});

/**
 * Logs directory listing
 */
app.get('/logs/', (req, res) => {
  res.json({
    files: Object.keys(logs).map(name => ({
      name,
      size: logs[name].length
    }))
  });
});

/**
 * Get log content
 */
app.get('/logs/:filename', (req, res) => {
  const filename = req.params.filename;
  if (filename === 'index.html') {
    return res.redirect('/logs/');
  }
  if (logs[filename]) {
    res.type('text/csv').send(logs[filename]);
  } else {
    res.status(404).send('File not found');
  }
});

/**
 * Get config file
 */
app.get('/etc/pidkiln.conf', (req, res) => {
  const conf = Object.entries(preferences)
    .map(([key, value]) => `${key} = ${value}`)
    .join('\n');
  res.type('text/plain').send(`# PIDKiln Configuration (Simulator)\n\n${conf}`);
});

/**
 * Preferences API (JSON format)
 */
app.get('/api/preferences', (req, res) => {
  res.json(preferences);
});

/**
 * Save preferences (JSON format)
 */
app.post('/api/preferences', (req, res) => {
  Object.entries(req.body).forEach(([key, value]) => {
    if (key in preferences) {
      preferences[key] = value;
    }
  });
  console.log('Preferences updated via API');
  res.json({ success: true });
});

/**
 * Save preferences (form POST - legacy format)
 */
app.post('/preferences.html', (req, res) => {
  Object.entries(req.body).forEach(([key, value]) => {
    if (key in preferences && key !== 'update' && key !== 'save') {
      preferences[key] = value;
    }
  });
  console.log('Preferences updated:', Object.keys(req.body).filter(k => k !== 'update' && k !== 'save'));
  
  if (req.body.save) {
    console.log('Preferences saved to disk (simulated)');
  }
  
  res.redirect('/preferences.html');
});

/**
 * Debug info API
 */
app.get('/api/debug', (req, res) => {
  res.json(debugInfo);
});

/**
 * Temperature history API
 * Returns up to 24h of temperature data at 10s intervals
 * 
 * Query params:
 *   since - Unix timestamp (ms) to get history from (optional)
 *   limit - Max number of points to return (optional, default all)
 */
app.get('/api/history', (req, res) => {
  let history = getHistory();
  
  // Filter by 'since' timestamp if provided
  if (req.query.since) {
    const since = parseInt(req.query.since, 10);
    if (!isNaN(since)) {
      history = history.filter(p => p.t > since);
    }
  }
  
  // Limit number of points if requested
  if (req.query.limit) {
    const limit = parseInt(req.query.limit, 10);
    if (!isNaN(limit) && limit > 0) {
      history = history.slice(-limit);
    }
  }
  
  res.json({
    interval_ms: 10000,
    max_age_ms: 24 * 60 * 60 * 1000,
    count: history.length,
    data: history
  });
});

/**
 * Set target temperature
 * If no program running: starts manual hold mode
 * If program running: overrides current segment target
 */
app.post('/api/temperature', (req, res) => {
  const temp = parseFloat(req.body.temperature ?? req.body.temp);
  const result = executeCommand('set_temp', { temperature: temp });
  
  if (result.success) {
    res.json({ success: true, temperature: result.temperature });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

/**
 * Reboot device
 */
app.post('/api/reboot', (req, res) => {
  console.log('Reboot requested - simulating...');
  res.json({ success: true, message: 'Rebooting...' });
  
  // Simulate reboot by resetting state after a short delay
  setTimeout(() => {
    state.programStatus = PROGRAM_STATUS.READY;
    state.kilnTemp = 25.5;
    state.setTemp = 0;
    state.heatPercent = 0;
    state.tempChange = 0;
    state.currentStep = 0;
    state.programStartTime = null;
    state.programEndTime = null;
    console.log('Simulated reboot complete - state reset');
    
    // Notify connected clients
    broadcast('state', getState());
  }, 1000);
});

/**
 * Program control (deprecated - use WebSocket)
 */
app.post('/api/program/:action', (req, res) => {
  const action = req.params.action;
  const result = executeCommand(action, req.body);
  
  if (result.success) {
    res.json({ success: true, status: state.programStatus });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

/**
 * Program control (form POST - legacy format)
 */
app.post('/index.html', (req, res) => {
  if (req.body.prog_start) {
    executeCommand('start');
  } else if (req.body.prog_pause) {
    executeCommand('pause');
  } else if (req.body.prog_end) {
    executeCommand('stop');
  } else if (req.body.prog_abort) {
    executeCommand('abort');
  }
  res.redirect('/index.html');
});

/**
 * Load program (form POST)
 */
app.post('/programs/:filename', (req, res) => {
  const result = executeCommand('load', { program: req.params.filename });
  if (result.success) {
    res.redirect('/');
  } else {
    res.status(404).send(result.error);
  }
});

// =============================================================================
// Static file serving (must be last)
// =============================================================================

// Data directory: use DATA_DIR env var (for Docker) or default to ../data/
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const PROGRAMS_DIR = path.join(DATA_DIR, 'programs');

// Serve files from data directory
app.use(express.static(DATA_DIR));

// Fallback to index.html for SPA routing
app.get('*', (req, res, next) => {
  // Don't intercept API or file requests
  if (req.path.startsWith('/api/') || req.path.includes('.')) {
    return next();
  }
  res.sendFile(path.join(DATA_DIR, 'index.html'));
});

// =============================================================================
// Helper functions
// =============================================================================

function extractDescription(content) {
  // Try JSON format first
  try {
    const program = JSON.parse(content);
    if (program.description) {
      return program.description.substring(0, 50);
    }
  } catch (e) {
    // Not JSON, try text format
  }
  
  // Text format: look for comment lines
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('#') && line.length > 2) {
      return line.substring(1).trim().substring(0, 50);
    }
  }
  return '';
}

// =============================================================================
// Start server
// =============================================================================

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                      PIDKiln Simulator                             ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Test Client:    http://localhost:${PORT}/test-client.html            ║
║  WebSocket:      ws://localhost:${PORT}/ws                            ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  HTTP Endpoints                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  Programs:                                                         ║
║    GET  /programs/            - List programs                      ║
║    GET  /programs/:file       - Get program content                ║
║    POST /upload               - Upload program file                ║
║    POST /delete               - Delete program file                ║
║                                                                    ║
║  Logs:                                                             ║
║    GET  /logs/                - List log files                     ║
║    GET  /logs/:file           - Get log content (CSV)              ║
║                                                                    ║
║  Configuration:                                                    ║
║    GET  /api/preferences      - Get preferences (JSON)             ║
║    POST /api/preferences      - Save preferences (JSON)            ║
║    GET  /etc/pidkiln.conf     - Get config file                    ║
║                                                                    ║
║  System:                                                           ║
║    GET  /api/debug            - Debug info (JSON)                  ║
║    GET  /api/history          - Temperature history (24h)          ║
║    POST /api/reboot           - Reboot device                      ║
║    POST /api/temperature      - Set target temperature             ║
║                                                                    ║
║  Legacy (deprecated):                                              ║
║    GET  /PIDKiln_vars.json    - Live data (use WebSocket)          ║
║    POST /api/program/:action  - Control (use WebSocket)            ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  WebSocket Commands (ws://localhost:${PORT}/ws)                       ║
╠════════════════════════════════════════════════════════════════════╣
║    { "type": "command", "action": "start" }                        ║
║    { "type": "command", "action": "pause" }                        ║
║    { "type": "command", "action": "resume" }                       ║
║    { "type": "command", "action": "stop" }                         ║
║    { "type": "command", "action": "abort" }                        ║
║    { "type": "command", "action": "load", "program": "file.txt" }  ║
║    { "type": "command", "action": "set_temp", "temperature": 500 } ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  Static files: ${DATA_DIR.padEnd(50)}║
╚════════════════════════════════════════════════════════════════════╝
`);
});

/**
 * Furnace Development Simulator
 * 
 * A mock server that simulates ESP32 API endpoints for frontend development.
 * Run with: npm start (or node dist/server.js)
 * 
 * WebSocket (FlatBuffers):
 *   ws://localhost:3000/ws      - Primary API (state, commands, data requests)
 * 
 * HTTP Endpoints (retained for specific use cases):
 *   GET  /logs/:filename        - Direct log file download
 *   POST /api/stop              - Emergency stop (HTTP fallback)
 *   POST /api/reboot            - Reboot device
 *   POST /update-firmware       - Firmware upload
 */

import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { WebSocketServer, WebSocket } from 'ws';
import {
  PROGRAM_STATUS,
  state,
  stateEmitter,
  getState,
  executeCommand,
  logs,
  preferences,
  debugInfo,
  getHistory
} from './mock-data.js';

import {
  isBinaryMessage,
  decodeClientMessage,
  encodeState,
  encodeAck,
  encodeHistoryResponse,
  encodeProgramListResponse,
  encodeProgramContentResponse,
  encodePreferencesResponse,
  encodeDebugInfoResponse,
  encodeLogListResponse,
  encodeLogContentResponse,
  encodeError,
  StateData,
  HistoryPointData,
  LogInfoData,
} from './flatbuffers.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server (shared with WebSocket)
const server = http.createServer(app);

// =============================================================================
// Path Configuration
// =============================================================================

// Data directory: use DATA_DIR env var (for Docker) or default to ../frontend/dist/
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'frontend', 'dist');
const FRONTEND_DIR = process.env.FRONTEND_DIR || path.join(__dirname, '..', '..', 'frontend');
const PROGRAMS_DIR = path.join(FRONTEND_DIR, 'programs');

// =============================================================================
// WebSocket Server
// =============================================================================

const wss = new WebSocketServer({ server, path: '/ws' });

// Track connected clients and their protocol (binary = FlatBuffers, text = JSON)
interface ClientInfo {
  ws: WebSocket;
  binary: boolean;
}
const clients = new Map<WebSocket, ClientInfo>();

interface WsMessage {
  type: string;
  action?: string;
  program?: string;
  content?: string;
  temperature?: number;
  segment?: number;
  minute?: number;
}

// Convert marker type string to number
function markerTypeToNumber(type: string): number {
  const types: Record<string, number> = {
    'start': 0,
    'stop': 1,
    'target_change': 2,
    'step_complete': 3,
  };
  return types[type] ?? 0;
}

// State type from getState()
interface StateFromMockData {
  program_status: number;
  program_name: string;
  kiln_temp: number;
  set_temp: number;
  env_temp: number;
  case_temp: number;
  heat_percent: number;
  temp_change: number;
  step: string;
  prog_start: string | null;
  prog_end: string | null;
  curr_time: string;
}

// Convert getState() to StateData for FlatBuffers
function stateToFlatBuffers(): StateData {
  const s = getState() as unknown as StateFromMockData;
  
  // Safely parse dates, defaulting to 0 for null/undefined
  const parseTimeMs = (val: string | null | undefined): number => {
    if (!val) return 0;
    const ms = new Date(val).getTime();
    return isNaN(ms) ? 0 : ms;
  };
  
  return {
    programStatus: s.program_status,
    programName: s.program_name || null,
    kilnTemp: s.kiln_temp,
    setTemp: s.set_temp,
    envTemp: s.env_temp,
    caseTemp: s.case_temp,
    heatPercent: s.heat_percent,
    tempChange: s.temp_change,
    step: s.step,
    progStartMs: parseTimeMs(s.prog_start),
    progEndMs: parseTimeMs(s.prog_end),
    currTimeMs: parseTimeMs(s.curr_time) || Date.now(),
  };
}

wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected');
  // Default to JSON, will switch to binary on first binary message
  clients.set(ws, { ws, binary: false });
  
  // Send current state immediately on connect (JSON for initial connection)
  ws.send(JSON.stringify({ type: 'state', data: getState() }));
  
  // Handle incoming messages
  ws.on('message', (message: Buffer) => {
    const clientInfo = clients.get(ws);
    if (!clientInfo) return;
    
    // Check if this is a binary (FlatBuffers) message
    if (isBinaryMessage(message)) {
      // Switch client to binary mode
      if (!clientInfo.binary) {
        console.log('Client switched to FlatBuffers protocol');
        clientInfo.binary = true;
      }
      
      handleFlatBuffersMessage(ws, message);
    } else {
      // Handle JSON message
      handleJsonMessage(ws, message);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clients.delete(ws);
  });
  
  ws.on('error', (err: Error) => {
    console.error('WebSocket error:', err);
    clients.delete(ws);
  });
});

function handleJsonMessage(ws: WebSocket, message: Buffer) {
  try {
    const msg = JSON.parse(message.toString()) as WsMessage;
    console.log('WebSocket received (JSON):', msg);
    
    if (msg.type === 'command' && msg.action) {
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
    console.error('WebSocket JSON message error:', err);
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
  }
}

function handleFlatBuffersMessage(ws: WebSocket, message: Buffer) {
  try {
    const msg = decodeClientMessage(message);
    if (!msg) {
      console.error('Failed to decode FlatBuffers message');
      ws.send(encodeError(0, 1, 'Failed to decode message'));
      return;
    }
    
    console.log('WebSocket received (FlatBuffers):', msg.type, msg);
    
    switch (msg.type) {
      case 'start': {
        const result = executeCommand('start', { segment: msg.segment, minute: msg.minute });
        ws.send(encodeAck(msg.requestId, result.success, result.error));
        break;
      }
      case 'pause': {
        const result = executeCommand('pause', {});
        ws.send(encodeAck(msg.requestId, result.success, result.error));
        break;
      }
      case 'resume': {
        const result = executeCommand('resume', {});
        ws.send(encodeAck(msg.requestId, result.success, result.error));
        break;
      }
      case 'stop': {
        const result = executeCommand('stop', {});
        ws.send(encodeAck(msg.requestId, result.success, result.error));
        break;
      }
      case 'load': {
        const filename = msg.program;
        const filePath = path.join(PROGRAMS_DIR, filename);
        let content = '';
        
        if (fs.existsSync(filePath)) {
          try {
            content = fs.readFileSync(filePath, 'utf8');
          } catch (e) {
            console.error(`Error reading program ${filename}:`, e);
          }
        }
        
        const result = executeCommand('load', { program: filename, content });
        ws.send(encodeAck(msg.requestId, result.success, result.error));
        break;
      }
      case 'unload': {
        const result = executeCommand('unload', {});
        ws.send(encodeAck(msg.requestId, result.success, result.error));
        break;
      }
      case 'set_temp': {
        const result = executeCommand('set_temp', { temperature: msg.temperature });
        ws.send(encodeAck(msg.requestId, result.success, result.error));
        break;
      }
      case 'history': {
        const historyData = getHistory();
        const intervalMs = 10000;
        const maxAgeMs = 24 * 60 * 60 * 1000;
        const points: HistoryPointData[] = historyData.map((p) => ({
          timestampMs: p.t,
          kilnTemp: p.k,
          setTemp: p.s,
          heatPercent: p.p,
          envTemp: p.e,
          caseTemp: p.c,
          ...(p.m && { markerType: markerTypeToNumber(p.m.type), markerValue: String(p.m.value ?? '') }),
        }));
        ws.send(encodeHistoryResponse(msg.requestId, intervalMs, maxAgeMs, points));
        break;
      }
      case 'list_programs': {
        const files = fs.readdirSync(PROGRAMS_DIR)
          .filter(f => f.endsWith('.json'))
          .map(name => {
            const filePath = path.join(PROGRAMS_DIR, name);
            const stat = fs.statSync(filePath);
            let description = '';
            try {
              const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
              description = content.description || '';
            } catch {}
            return { name, size: stat.size, description };
          });
        ws.send(encodeProgramListResponse(msg.requestId, files));
        break;
      }
      case 'get_program': {
        const filePath = path.join(PROGRAMS_DIR, msg.name);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          ws.send(encodeProgramContentResponse(msg.requestId, msg.name, content));
        } else {
          ws.send(encodeError(msg.requestId, 404, 'Program not found'));
        }
        break;
      }
      case 'save_program': {
        const filePath = path.join(PROGRAMS_DIR, msg.name);
        fs.writeFileSync(filePath, msg.content);
        ws.send(encodeAck(msg.requestId, true));
        break;
      }
      case 'delete_program': {
        const filePath = path.join(PROGRAMS_DIR, msg.name);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          ws.send(encodeAck(msg.requestId, true));
        } else {
          ws.send(encodeError(msg.requestId, 404, 'Program not found'));
        }
        break;
      }
      case 'get_preferences': {
        ws.send(encodePreferencesResponse(msg.requestId, JSON.stringify(preferences)));
        break;
      }
      case 'save_preferences': {
        try {
          const newPrefs = JSON.parse(msg.json);
          Object.assign(preferences, newPrefs);
          ws.send(encodeAck(msg.requestId, true));
        } catch {
          ws.send(encodeError(msg.requestId, 400, 'Invalid JSON'));
        }
        break;
      }
      case 'get_debug_info': {
        ws.send(encodeDebugInfoResponse(msg.requestId, JSON.stringify(debugInfo)));
        break;
      }
      case 'list_logs': {
        const logList: LogInfoData[] = Object.entries(logs).map(([name, content]) => ({
          name,
          size: content.length,
        }));
        ws.send(encodeLogListResponse(msg.requestId, logList));
        break;
      }
      case 'get_log': {
        const logContent = logs[msg.name];
        if (logContent !== undefined) {
          ws.send(encodeLogContentResponse(msg.requestId, msg.name, logContent));
        } else {
          ws.send(encodeError(msg.requestId, 404, 'Log not found'));
        }
        break;
      }
      default: {
        // Exhaustive check - this should never happen
        const exhaustiveCheck: never = msg;
        void exhaustiveCheck;
        ws.send(encodeError(0, 400, 'Unknown message type'));
        break;
      }
    }
  } catch (err) {
    console.error('WebSocket FlatBuffers message error:', err);
    ws.send(encodeError(0, 500, 'Internal server error'));
  }
}

// Broadcast to all connected clients (format depends on client protocol)
function broadcastState(): void {
  const jsonMessage = JSON.stringify({ type: 'state', data: getState() });
  const binaryMessage = encodeState(stateToFlatBuffers());
  
  for (const [ws, info] of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      if (info.binary) {
        ws.send(binaryMessage);
      } else {
        ws.send(jsonMessage);
      }
    }
  }
}

// Subscribe to state changes from mock-data
stateEmitter.on('state', () => {
  broadcastState();
});

stateEmitter.on('log', (data: unknown) => {
  // Log events only sent to JSON clients for now
  const message = JSON.stringify({ type: 'log', data });
  for (const [ws, info] of clients) {
    if (ws.readyState === WebSocket.OPEN && !info.binary) {
      ws.send(message);
    }
  }
});

// =============================================================================
// Express Middleware
// =============================================================================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CORS for development
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
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
// HTTP API Endpoints (Only endpoints that cannot be done via WebSocket)
// =============================================================================

/**
 * Get log content (for direct file download)
 * Log listing is done via WebSocket FlatBuffers
 */
app.get('/logs/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  if (logs[filename]) {
    res.type('text/csv').send(logs[filename]);
  } else {
    res.status(404).send('File not found');
  }
});

/**
 * Stop running program (HTTP shortcut for safety)
 * Can also be done via WebSocket, but HTTP provides a simple fallback
 */
app.post('/api/stop', (_req: Request, res: Response) => {
  const result = executeCommand('stop');

  if (result.success) {
    res.json({ success: true, status: state.programStatus });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

/**
 * Reboot device
 */
app.post('/api/reboot', (_req: Request, res: Response) => {
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
    broadcastState();
  }, 1000);
});

/**
 * Firmware update (multipart form upload)
 */
app.post('/update-firmware', upload.single('update'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).send('No file uploaded');
    return;
  }
  console.log(`Firmware update received: ${req.file.originalname} (${req.file.size} bytes)`);
  // Simulate firmware update
  res.send('OK');
});

// =============================================================================
// Static file serving (must be last)
// =============================================================================

// Serve files from data directory
app.use(express.static(DATA_DIR));

// Fallback to index.html for SPA routing
app.get('*', (req: Request, res: Response, next: NextFunction) => {
  // Don't intercept API or file requests
  if (req.path.startsWith('/api/') || req.path.includes('.')) {
    next();
    return;
  }
  res.sendFile(path.join(DATA_DIR, 'index.html'));
});

// =============================================================================
// Start server
// =============================================================================

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                      Furnace Simulator                             ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Frontend:       http://localhost:${PORT}/                               ║
║  WebSocket:      ws://localhost:${PORT}/ws (FlatBuffers)              ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  WebSocket API (FlatBuffers protocol)                              ║
╠════════════════════════════════════════════════════════════════════╣
║  Commands: start, pause, resume, stop, load, unload, set_temp      ║
║  Requests: history, programs, preferences, debug, logs             ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  HTTP Endpoints (retained for specific use cases)                  ║
╠════════════════════════════════════════════════════════════════════╣
║    GET  /logs/:file           - Direct log file download           ║
║    POST /api/stop             - Emergency stop (HTTP fallback)     ║
║    POST /api/reboot           - Reboot device                      ║
║    POST /update-firmware      - Firmware upload                    ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  Static files: ${DATA_DIR.padEnd(50)}║
╚════════════════════════════════════════════════════════════════════╝
`);
});


/**
 * FlatBuffers encode/decode helpers for Furnace WebSocket protocol
 */

import * as flatbuffers from 'flatbuffers';

// Import generated types
import { ClientEnvelope } from './generated/furnace/client-envelope.js';
import { ServerEnvelope } from './generated/furnace/server-envelope.js';
import { ClientMessage } from './generated/furnace/client-message.js';
import { ServerMessage } from './generated/furnace/server-message.js';

// Commands
import { StartCommand } from './generated/furnace/start-command.js';
import { PauseCommand } from './generated/furnace/pause-command.js';
import { ResumeCommand } from './generated/furnace/resume-command.js';
import { StopCommand } from './generated/furnace/stop-command.js';
import { LoadCommand } from './generated/furnace/load-command.js';
import { UnloadCommand } from './generated/furnace/unload-command.js';
import { SetTempCommand } from './generated/furnace/set-temp-command.js';
import { SetTimeScaleCommand } from './generated/furnace/set-time-scale-command.js';
import { ClearErrorCommand } from './generated/furnace/clear-error-command.js';

// Requests
import { HistoryRequest } from './generated/furnace/history-request.js';
import { ListProgramsRequest } from './generated/furnace/list-programs-request.js';
import { GetProgramRequest } from './generated/furnace/get-program-request.js';
import { SaveProgramRequest } from './generated/furnace/save-program-request.js';
import { DeleteProgramRequest } from './generated/furnace/delete-program-request.js';
import { GetPreferencesRequest } from './generated/furnace/get-preferences-request.js';
import { SavePreferencesRequest } from './generated/furnace/save-preferences-request.js';
import { GetDebugInfoRequest } from './generated/furnace/get-debug-info-request.js';
import { ListLogsRequest } from './generated/furnace/list-logs-request.js';
import { GetLogRequest } from './generated/furnace/get-log-request.js';

// Responses
import { State } from './generated/furnace/state.js';
import { Ack } from './generated/furnace/ack.js';
import { HistoryResponse } from './generated/furnace/history-response.js';
import { ProgramListResponse } from './generated/furnace/program-list-response.js';
import { ProgramContentResponse } from './generated/furnace/program-content-response.js';
import { PreferencesResponse } from './generated/furnace/preferences-response.js';
import { DebugInfoResponse } from './generated/furnace/debug-info-response.js';
import { LogListResponse } from './generated/furnace/log-list-response.js';
import { LogContentResponse } from './generated/furnace/log-content-response.js';
import { Error as FbError } from './generated/furnace/error.js';

import { ProgramStatus } from './generated/furnace/program-status.js';
import { MarkerType } from './generated/furnace/marker-type.js';

// Re-export enums for external use
export { ClientMessage, ServerMessage, ProgramStatus, MarkerType };

// =============================================================================
// Request ID Management
// =============================================================================

let nextRequestId = 1;

export function getNextRequestId(): number {
  return nextRequestId++;
}

// Pending request callbacks
type ResponseCallback = (response: DecodedServerMessage) => void;
const pendingRequests = new Map<number, ResponseCallback>();

export function registerPendingRequest(requestId: number, callback: ResponseCallback): void {
  pendingRequests.set(requestId, callback);
}

export function resolvePendingRequest(requestId: number, response: DecodedServerMessage): boolean {
  const callback = pendingRequests.get(requestId);
  if (callback) {
    pendingRequests.delete(requestId);
    callback(response);
    return true;
  }
  return false;
}

// =============================================================================
// Decoded Message Types (for application use)
// =============================================================================

export interface DecodedState {
  type: 'state';
  programStatus: number;
  programName: string | null;
  kilnTemp: number;
  setTemp: number;
  envTemp: number;
  caseTemp: number;
  heatPercent: number;
  tempChange: number;
  step: string | null;
  progStartMs: bigint;
  progEndMs: bigint;
  currTimeMs: bigint;
  errorMessage: string | null;
  // Simulator-specific fields
  isSimulator: boolean;
  timeScale: number;
}

export interface DecodedAck {
  type: 'ack';
  requestId: number;
  success: boolean;
  error: string | null;
}

export interface DecodedHistoryPoint {
  t: number;
  k: number;
  s: number;
  p: number;
  e: number;
  c: number;
  m?: { type: number; value: string | null };
}

export interface DecodedHistoryResponse {
  type: 'history';
  requestId: number;
  intervalMs: number;
  maxAgeMs: number;
  data: DecodedHistoryPoint[];
}

export interface DecodedProgramInfo {
  name: string;
  size: number;
  description: string;
}

export interface DecodedProgramListResponse {
  type: 'programList';
  requestId: number;
  programs: DecodedProgramInfo[];
}

export interface DecodedProgramContentResponse {
  type: 'programContent';
  requestId: number;
  name: string;
  content: string;
}

export interface DecodedPreferencesResponse {
  type: 'preferences';
  requestId: number;
  json: string;
}

export interface DecodedDebugInfoResponse {
  type: 'debugInfo';
  requestId: number;
  json: string;
}

export interface DecodedLogInfo {
  name: string;
  size: number;
}

export interface DecodedLogListResponse {
  type: 'logList';
  requestId: number;
  logs: DecodedLogInfo[];
}

export interface DecodedLogContentResponse {
  type: 'logContent';
  requestId: number;
  name: string;
  content: string;
}

export interface DecodedError {
  type: 'error';
  requestId: number;
  code: number;
  message: string;
}

export type DecodedServerMessage =
  | DecodedState
  | DecodedAck
  | DecodedHistoryResponse
  | DecodedProgramListResponse
  | DecodedProgramContentResponse
  | DecodedPreferencesResponse
  | DecodedDebugInfoResponse
  | DecodedLogListResponse
  | DecodedLogContentResponse
  | DecodedError;

// =============================================================================
// Encoding Functions (Client → Server)
// =============================================================================

function createEnvelope(
  builder: flatbuffers.Builder,
  requestId: number,
  messageType: ClientMessage,
  messageOffset: flatbuffers.Offset
): Uint8Array {
  const envelope = ClientEnvelope.createClientEnvelope(
    builder,
    requestId,
    messageType,
    messageOffset
  );
  builder.finish(envelope);
  return builder.asUint8Array();
}

// Commands

export function encodeStartCommand(segment?: number, minute?: number): Uint8Array {
  const builder = new flatbuffers.Builder(64);
  
  StartCommand.startStartCommand(builder);
  if (segment !== undefined) StartCommand.addSegment(builder, segment);
  if (minute !== undefined) StartCommand.addMinute(builder, minute);
  const cmd = StartCommand.endStartCommand(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.StartCommand, cmd);
}

export function encodePauseCommand(): Uint8Array {
  const builder = new flatbuffers.Builder(32);
  
  PauseCommand.startPauseCommand(builder);
  const cmd = PauseCommand.endPauseCommand(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.PauseCommand, cmd);
}

export function encodeResumeCommand(): Uint8Array {
  const builder = new flatbuffers.Builder(32);
  
  ResumeCommand.startResumeCommand(builder);
  const cmd = ResumeCommand.endResumeCommand(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.ResumeCommand, cmd);
}

export function encodeStopCommand(): Uint8Array {
  const builder = new flatbuffers.Builder(32);
  
  StopCommand.startStopCommand(builder);
  const cmd = StopCommand.endStopCommand(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.StopCommand, cmd);
}

export function encodeLoadCommand(program: string): Uint8Array {
  const builder = new flatbuffers.Builder(128);
  
  const programOffset = builder.createString(program);
  
  LoadCommand.startLoadCommand(builder);
  LoadCommand.addProgram(builder, programOffset);
  const cmd = LoadCommand.endLoadCommand(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.LoadCommand, cmd);
}

export function encodeUnloadCommand(): Uint8Array {
  const builder = new flatbuffers.Builder(32);
  
  UnloadCommand.startUnloadCommand(builder);
  const cmd = UnloadCommand.endUnloadCommand(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.UnloadCommand, cmd);
}

export function encodeSetTempCommand(temperature: number): Uint8Array {
  const builder = new flatbuffers.Builder(48);
  
  SetTempCommand.startSetTempCommand(builder);
  SetTempCommand.addTemperature(builder, temperature);
  const cmd = SetTempCommand.endSetTempCommand(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.SetTempCommand, cmd);
}

export function encodeSetTimeScaleCommand(timeScale: number): Uint8Array {
  const builder = new flatbuffers.Builder(48);
  
  SetTimeScaleCommand.startSetTimeScaleCommand(builder);
  SetTimeScaleCommand.addTimeScale(builder, timeScale);
  const cmd = SetTimeScaleCommand.endSetTimeScaleCommand(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.SetTimeScaleCommand, cmd);
}

export function encodeClearErrorCommand(): Uint8Array {
  const builder = new flatbuffers.Builder(32);
  
  ClearErrorCommand.startClearErrorCommand(builder);
  const cmd = ClearErrorCommand.endClearErrorCommand(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.ClearErrorCommand, cmd);
}

// Requests

export function encodeHistoryRequest(sinceMs?: number, limit?: number): Uint8Array {
  const builder = new flatbuffers.Builder(64);
  
  HistoryRequest.startHistoryRequest(builder);
  if (sinceMs !== undefined) HistoryRequest.addSinceMs(builder, BigInt(sinceMs));
  if (limit !== undefined) HistoryRequest.addLimit(builder, limit);
  const req = HistoryRequest.endHistoryRequest(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.HistoryRequest, req);
}

export function encodeListProgramsRequest(): Uint8Array {
  const builder = new flatbuffers.Builder(32);
  
  ListProgramsRequest.startListProgramsRequest(builder);
  const req = ListProgramsRequest.endListProgramsRequest(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.ListProgramsRequest, req);
}

export function encodeGetProgramRequest(name: string): Uint8Array {
  const builder = new flatbuffers.Builder(128);
  
  const nameOffset = builder.createString(name);
  
  GetProgramRequest.startGetProgramRequest(builder);
  GetProgramRequest.addName(builder, nameOffset);
  const req = GetProgramRequest.endGetProgramRequest(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.GetProgramRequest, req);
}

export function encodeSaveProgramRequest(name: string, content: string): Uint8Array {
  const builder = new flatbuffers.Builder(content.length + 256);
  
  const nameOffset = builder.createString(name);
  const contentOffset = builder.createString(content);
  
  SaveProgramRequest.startSaveProgramRequest(builder);
  SaveProgramRequest.addName(builder, nameOffset);
  SaveProgramRequest.addContent(builder, contentOffset);
  const req = SaveProgramRequest.endSaveProgramRequest(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.SaveProgramRequest, req);
}

export function encodeDeleteProgramRequest(name: string): Uint8Array {
  const builder = new flatbuffers.Builder(128);
  
  const nameOffset = builder.createString(name);
  
  DeleteProgramRequest.startDeleteProgramRequest(builder);
  DeleteProgramRequest.addName(builder, nameOffset);
  const req = DeleteProgramRequest.endDeleteProgramRequest(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.DeleteProgramRequest, req);
}

export function encodeGetPreferencesRequest(): Uint8Array {
  const builder = new flatbuffers.Builder(32);
  
  GetPreferencesRequest.startGetPreferencesRequest(builder);
  const req = GetPreferencesRequest.endGetPreferencesRequest(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.GetPreferencesRequest, req);
}

export function encodeSavePreferencesRequest(json: string): Uint8Array {
  const builder = new flatbuffers.Builder(json.length + 128);
  
  const jsonOffset = builder.createString(json);
  
  SavePreferencesRequest.startSavePreferencesRequest(builder);
  SavePreferencesRequest.addJson(builder, jsonOffset);
  const req = SavePreferencesRequest.endSavePreferencesRequest(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.SavePreferencesRequest, req);
}

export function encodeGetDebugInfoRequest(): Uint8Array {
  const builder = new flatbuffers.Builder(32);
  
  GetDebugInfoRequest.startGetDebugInfoRequest(builder);
  const req = GetDebugInfoRequest.endGetDebugInfoRequest(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.GetDebugInfoRequest, req);
}

export function encodeListLogsRequest(): Uint8Array {
  const builder = new flatbuffers.Builder(32);
  
  ListLogsRequest.startListLogsRequest(builder);
  const req = ListLogsRequest.endListLogsRequest(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.ListLogsRequest, req);
}

export function encodeGetLogRequest(name: string): Uint8Array {
  const builder = new flatbuffers.Builder(128);
  
  const nameOffset = builder.createString(name);
  
  GetLogRequest.startGetLogRequest(builder);
  GetLogRequest.addName(builder, nameOffset);
  const req = GetLogRequest.endGetLogRequest(builder);
  
  return createEnvelope(builder, getNextRequestId(), ClientMessage.GetLogRequest, req);
}

// =============================================================================
// Decoding Functions (Server → Client)
// =============================================================================

function decodeState(state: State): DecodedState {
  return {
    type: 'state',
    programStatus: state.programStatus(),
    programName: state.programName(),
    kilnTemp: state.kilnTemp(),
    setTemp: state.setTemp(),
    envTemp: state.envTemp(),
    caseTemp: state.caseTemp(),
    heatPercent: state.heatPercent(),
    tempChange: state.tempChange(),
    step: state.step(),
    progStartMs: state.progStartMs(),
    progEndMs: state.progEndMs(),
    currTimeMs: state.currTimeMs(),
    errorMessage: state.errorMessage(),
    isSimulator: state.isSimulator(),
    timeScale: state.timeScale(),
  };
}

function decodeAck(ack: Ack, requestId: number): DecodedAck {
  return {
    type: 'ack',
    requestId,
    success: ack.success(),
    error: ack.error(),
  };
}

function decodeHistoryResponse(resp: HistoryResponse, requestId: number): DecodedHistoryResponse {
  const data: DecodedHistoryPoint[] = [];
  const len = resp.dataLength();
  
  for (let i = 0; i < len; i++) {
    const point = resp.data(i);
    if (point) {
      const decoded: DecodedHistoryPoint = {
        t: Number(point.timestampMs()),
        k: point.kilnTemp(),
        s: point.setTemp(),
        p: point.heatPercent(),
        e: point.envTemp(),
        c: point.caseTemp(),
      };
      
      const markerValue = point.markerValue();
      if (markerValue !== null) { // Check if marker exists
        decoded.m = {
          type: point.markerType() as number,
          value: markerValue,
        };
      }
      
      data.push(decoded);
    }
  }
  
  return {
    type: 'history',
    requestId,
    intervalMs: resp.intervalMs(),
    maxAgeMs: resp.maxAgeMs(),
    data,
  };
}

function decodeProgramListResponse(resp: ProgramListResponse, requestId: number): DecodedProgramListResponse {
  const programs: DecodedProgramInfo[] = [];
  const len = resp.programsLength();
  
  for (let i = 0; i < len; i++) {
    const prog = resp.programs(i);
    if (prog) {
      programs.push({
        name: prog.name() || '',
        size: prog.size(),
        description: prog.description() || '',
      });
    }
  }
  
  return {
    type: 'programList',
    requestId,
    programs,
  };
}

function decodeProgramContentResponse(resp: ProgramContentResponse, requestId: number): DecodedProgramContentResponse {
  return {
    type: 'programContent',
    requestId,
    name: resp.name() || '',
    content: resp.content() || '',
  };
}

function decodePreferencesResponse(resp: PreferencesResponse, requestId: number): DecodedPreferencesResponse {
  return {
    type: 'preferences',
    requestId,
    json: resp.json() || '{}',
  };
}

function decodeDebugInfoResponse(resp: DebugInfoResponse, requestId: number): DecodedDebugInfoResponse {
  return {
    type: 'debugInfo',
    requestId,
    json: resp.json() || '{}',
  };
}

function decodeLogListResponse(resp: LogListResponse, requestId: number): DecodedLogListResponse {
  const logs: DecodedLogInfo[] = [];
  const len = resp.logsLength();
  
  for (let i = 0; i < len; i++) {
    const log = resp.logs(i);
    if (log) {
      logs.push({
        name: log.name() || '',
        size: log.size(),
      });
    }
  }
  
  return {
    type: 'logList',
    requestId,
    logs,
  };
}

function decodeLogContentResponse(resp: LogContentResponse, requestId: number): DecodedLogContentResponse {
  return {
    type: 'logContent',
    requestId,
    name: resp.name() || '',
    content: resp.content() || '',
  };
}

function decodeError(err: FbError, requestId: number): DecodedError {
  return {
    type: 'error',
    requestId,
    code: err.code(),
    message: err.message() || 'Unknown error',
  };
}

/**
 * Decode a binary WebSocket message from the server
 */
export function decodeServerMessage(data: ArrayBuffer): DecodedServerMessage | null {
  const buf = new flatbuffers.ByteBuffer(new Uint8Array(data));
  const envelope = ServerEnvelope.getRootAsServerEnvelope(buf);
  
  const requestId = envelope.requestId();
  const messageType = envelope.messageType();
  
  switch (messageType) {
    case ServerMessage.State: {
      const state = envelope.message(new State());
      if (state) return decodeState(state);
      break;
    }
    case ServerMessage.Ack: {
      const ack = envelope.message(new Ack());
      if (ack) return decodeAck(ack, requestId);
      break;
    }
    case ServerMessage.HistoryResponse: {
      const resp = envelope.message(new HistoryResponse());
      if (resp) return decodeHistoryResponse(resp, requestId);
      break;
    }
    case ServerMessage.ProgramListResponse: {
      const resp = envelope.message(new ProgramListResponse());
      if (resp) return decodeProgramListResponse(resp, requestId);
      break;
    }
    case ServerMessage.ProgramContentResponse: {
      const resp = envelope.message(new ProgramContentResponse());
      if (resp) return decodeProgramContentResponse(resp, requestId);
      break;
    }
    case ServerMessage.PreferencesResponse: {
      const resp = envelope.message(new PreferencesResponse());
      if (resp) return decodePreferencesResponse(resp, requestId);
      break;
    }
    case ServerMessage.DebugInfoResponse: {
      const resp = envelope.message(new DebugInfoResponse());
      if (resp) return decodeDebugInfoResponse(resp, requestId);
      break;
    }
    case ServerMessage.LogListResponse: {
      const resp = envelope.message(new LogListResponse());
      if (resp) return decodeLogListResponse(resp, requestId);
      break;
    }
    case ServerMessage.LogContentResponse: {
      const resp = envelope.message(new LogContentResponse());
      if (resp) return decodeLogContentResponse(resp, requestId);
      break;
    }
    case ServerMessage.Error: {
      const err = envelope.message(new FbError());
      if (err) return decodeError(err, requestId);
      break;
    }
  }
  
  return null;
}

/**
 * Send a request and wait for response with matching request_id
 */
export function sendRequest(
  ws: WebSocket,
  encodedMessage: Uint8Array,
  timeoutMs = 10000
): Promise<DecodedServerMessage> {
  return new Promise((resolve, reject) => {
    // Extract request_id from the encoded message
    const buf = new flatbuffers.ByteBuffer(encodedMessage);
    const envelope = ClientEnvelope.getRootAsClientEnvelope(buf);
    const requestId = envelope.requestId();
    
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error(`Request ${requestId} timed out`));
    }, timeoutMs);
    
    registerPendingRequest(requestId, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
    
    ws.send(encodedMessage);
  });
}


/**
 * FlatBuffers encode/decode helpers for Furnace WebSocket protocol (Simulator)
 */

import * as flatbuffers from 'flatbuffers';

// Import generated types
import { ClientEnvelope } from './generated/furnace/client-envelope.js';
import { ServerEnvelope } from './generated/furnace/server-envelope.js';
import { ClientMessage } from './generated/furnace/client-message.js';
import { ServerMessage } from './generated/furnace/server-message.js';

// Commands (for decoding client messages)
import { StartCommand } from './generated/furnace/start-command.js';
import { LoadCommand } from './generated/furnace/load-command.js';
import { SetTempCommand } from './generated/furnace/set-temp-command.js';
import { SetTimeScaleCommand } from './generated/furnace/set-time-scale-command.js';
// ClearErrorCommand is an empty command - no class import needed, just the enum value

// Requests (for decoding client messages)
import { HistoryRequest } from './generated/furnace/history-request.js';
import { GetProgramRequest } from './generated/furnace/get-program-request.js';
import { SaveProgramRequest } from './generated/furnace/save-program-request.js';
import { DeleteProgramRequest } from './generated/furnace/delete-program-request.js';
import { SavePreferencesRequest } from './generated/furnace/save-preferences-request.js';
import { GetLogRequest } from './generated/furnace/get-log-request.js';

// Responses (for encoding server messages)
import { State } from './generated/furnace/state.js';
import { Ack } from './generated/furnace/ack.js';
import { HistoryResponse } from './generated/furnace/history-response.js';
import { HistoryPoint } from './generated/furnace/history-point.js';
import { ProgramListResponse } from './generated/furnace/program-list-response.js';
import { ProgramInfo } from './generated/furnace/program-info.js';
import { ProgramContentResponse } from './generated/furnace/program-content-response.js';
import { PreferencesResponse } from './generated/furnace/preferences-response.js';
import { DebugInfoResponse } from './generated/furnace/debug-info-response.js';
import { LogListResponse } from './generated/furnace/log-list-response.js';
import { LogInfo } from './generated/furnace/log-info.js';
import { LogContentResponse } from './generated/furnace/log-content-response.js';
import { Error as FbError } from './generated/furnace/error.js';

import { ProgramStatus } from './generated/furnace/program-status.js';
import { MarkerType } from './generated/furnace/marker-type.js';

// Re-export enums
export { ClientMessage, ServerMessage, ProgramStatus, MarkerType };

// =============================================================================
// Decoded Client Message Types (for application use)
// =============================================================================

export interface DecodedStartCommand {
  type: 'start';
  requestId: number;
  segment?: number;
  minute?: number;
}

export interface DecodedPauseCommand {
  type: 'pause';
  requestId: number;
}

export interface DecodedResumeCommand {
  type: 'resume';
  requestId: number;
}

export interface DecodedStopCommand {
  type: 'stop';
  requestId: number;
}

export interface DecodedLoadCommand {
  type: 'load';
  requestId: number;
  program: string;
}

export interface DecodedUnloadCommand {
  type: 'unload';
  requestId: number;
}

export interface DecodedSetTempCommand {
  type: 'set_temp';
  requestId: number;
  temperature: number;
}

export interface DecodedSetTimeScaleCommand {
  type: 'set_time_scale';
  requestId: number;
  timeScale: number;
}

export interface DecodedClearErrorCommand {
  type: 'clear_error';
  requestId: number;
}

export interface DecodedHistoryRequest {
  type: 'history';
  requestId: number;
  sinceMs?: number;
  limit?: number;
}

export interface DecodedListProgramsRequest {
  type: 'list_programs';
  requestId: number;
}

export interface DecodedGetProgramRequest {
  type: 'get_program';
  requestId: number;
  name: string;
}

export interface DecodedSaveProgramRequest {
  type: 'save_program';
  requestId: number;
  name: string;
  content: string;
}

export interface DecodedDeleteProgramRequest {
  type: 'delete_program';
  requestId: number;
  name: string;
}

export interface DecodedGetPreferencesRequest {
  type: 'get_preferences';
  requestId: number;
}

export interface DecodedSavePreferencesRequest {
  type: 'save_preferences';
  requestId: number;
  json: string;
}

export interface DecodedGetDebugInfoRequest {
  type: 'get_debug_info';
  requestId: number;
}

export interface DecodedListLogsRequest {
  type: 'list_logs';
  requestId: number;
}

export interface DecodedGetLogRequest {
  type: 'get_log';
  requestId: number;
  name: string;
}

export type DecodedClientMessage =
  | DecodedStartCommand
  | DecodedPauseCommand
  | DecodedResumeCommand
  | DecodedStopCommand
  | DecodedLoadCommand
  | DecodedUnloadCommand
  | DecodedSetTempCommand
  | DecodedClearErrorCommand
  | DecodedSetTimeScaleCommand
  | DecodedHistoryRequest
  | DecodedListProgramsRequest
  | DecodedGetProgramRequest
  | DecodedSaveProgramRequest
  | DecodedDeleteProgramRequest
  | DecodedGetPreferencesRequest
  | DecodedSavePreferencesRequest
  | DecodedGetDebugInfoRequest
  | DecodedListLogsRequest
  | DecodedGetLogRequest;

// =============================================================================
// Decoding Functions (Client → Server)
// =============================================================================

export function decodeClientMessage(data: Buffer): DecodedClientMessage | null {
  const buf = new flatbuffers.ByteBuffer(new Uint8Array(data));
  const envelope = ClientEnvelope.getRootAsClientEnvelope(buf);
  
  const requestId = envelope.requestId();
  const messageType = envelope.messageType();
  
  switch (messageType) {
    case ClientMessage.StartCommand: {
      const cmd = envelope.message(new StartCommand());
      if (cmd) {
        const segment = cmd.segment();
        const minute = cmd.minute();
        return {
          type: 'start',
          requestId,
          ...(segment !== 0 && { segment }),
          ...(minute !== 0 && { minute }),
        };
      }
      break;
    }
    case ClientMessage.PauseCommand: {
      return { type: 'pause', requestId };
    }
    case ClientMessage.ResumeCommand: {
      return { type: 'resume', requestId };
    }
    case ClientMessage.StopCommand: {
      return { type: 'stop', requestId };
    }
    case ClientMessage.LoadCommand: {
      const cmd = envelope.message(new LoadCommand());
      if (cmd) {
        return {
          type: 'load',
          requestId,
          program: cmd.program() || '',
        };
      }
      break;
    }
    case ClientMessage.UnloadCommand: {
      return { type: 'unload', requestId };
    }
    case ClientMessage.SetTempCommand: {
      const cmd = envelope.message(new SetTempCommand());
      if (cmd) {
        return {
          type: 'set_temp',
          requestId,
          temperature: cmd.temperature(),
        };
      }
      break;
    }
    case ClientMessage.SetTimeScaleCommand: {
      const cmd = envelope.message(new SetTimeScaleCommand());
      if (cmd) {
        return {
          type: 'set_time_scale',
          requestId,
          timeScale: cmd.timeScale(),
        };
      }
      break;
    }
    case ClientMessage.ClearErrorCommand: {
      return { type: 'clear_error', requestId };
    }
    case ClientMessage.HistoryRequest: {
      const req = envelope.message(new HistoryRequest());
      if (req) {
        const sinceMs = Number(req.sinceMs());
        const limit = req.limit();
        return {
          type: 'history',
          requestId,
          ...(sinceMs !== 0 && { sinceMs }),
          ...(limit !== 0 && { limit }),
        };
      }
      break;
    }
    case ClientMessage.ListProgramsRequest: {
      return { type: 'list_programs', requestId };
    }
    case ClientMessage.GetProgramRequest: {
      const req = envelope.message(new GetProgramRequest());
      if (req) {
        return {
          type: 'get_program',
          requestId,
          name: req.name() || '',
        };
      }
      break;
    }
    case ClientMessage.SaveProgramRequest: {
      const req = envelope.message(new SaveProgramRequest());
      if (req) {
        return {
          type: 'save_program',
          requestId,
          name: req.name() || '',
          content: req.content() || '',
        };
      }
      break;
    }
    case ClientMessage.DeleteProgramRequest: {
      const req = envelope.message(new DeleteProgramRequest());
      if (req) {
        return {
          type: 'delete_program',
          requestId,
          name: req.name() || '',
        };
      }
      break;
    }
    case ClientMessage.GetPreferencesRequest: {
      return { type: 'get_preferences', requestId };
    }
    case ClientMessage.SavePreferencesRequest: {
      const req = envelope.message(new SavePreferencesRequest());
      if (req) {
        return {
          type: 'save_preferences',
          requestId,
          json: req.json() || '{}',
        };
      }
      break;
    }
    case ClientMessage.GetDebugInfoRequest: {
      return { type: 'get_debug_info', requestId };
    }
    case ClientMessage.ListLogsRequest: {
      return { type: 'list_logs', requestId };
    }
    case ClientMessage.GetLogRequest: {
      const req = envelope.message(new GetLogRequest());
      if (req) {
        return {
          type: 'get_log',
          requestId,
          name: req.name() || '',
        };
      }
      break;
    }
  }
  
  return null;
}

// =============================================================================
// Encoding Functions (Server → Client)
// =============================================================================

function createEnvelope(
  builder: flatbuffers.Builder,
  requestId: number,
  messageType: ServerMessage,
  messageOffset: flatbuffers.Offset
): Uint8Array {
  const envelope = ServerEnvelope.createServerEnvelope(
    builder,
    requestId,
    messageType,
    messageOffset
  );
  builder.finish(envelope);
  return builder.asUint8Array();
}

export interface StateData {
  programStatus: number;
  programName: string | null;
  kilnTemp: number;
  setTemp: number;
  envTemp: number;
  caseTemp: number;
  heatPercent: number;
  tempChange: number;
  step: string | null;
  progStartMs: number;
  progEndMs: number;
  currTimeMs: number;
  errorMessage?: string | null;
  // Simulator-specific fields
  isSimulator?: boolean;
  timeScale?: number;
}

export function encodeState(data: StateData): Uint8Array {
  const builder = new flatbuffers.Builder(256);
  
  const programNameOffset = data.programName ? builder.createString(data.programName) : 0;
  const stepOffset = data.step ? builder.createString(data.step) : 0;
  const errorMessageOffset = data.errorMessage ? builder.createString(data.errorMessage) : 0;
  
  State.startState(builder);
  State.addProgramStatus(builder, data.programStatus);
  if (programNameOffset) State.addProgramName(builder, programNameOffset);
  State.addKilnTemp(builder, data.kilnTemp);
  State.addSetTemp(builder, data.setTemp);
  State.addEnvTemp(builder, data.envTemp);
  State.addCaseTemp(builder, data.caseTemp);
  State.addHeatPercent(builder, data.heatPercent);
  State.addTempChange(builder, data.tempChange);
  if (stepOffset) State.addStep(builder, stepOffset);
  State.addProgStartMs(builder, BigInt(data.progStartMs));
  State.addProgEndMs(builder, BigInt(data.progEndMs));
  State.addCurrTimeMs(builder, BigInt(data.currTimeMs));
  if (errorMessageOffset) State.addErrorMessage(builder, errorMessageOffset);
  // Simulator-specific fields
  if (data.isSimulator !== undefined) State.addIsSimulator(builder, data.isSimulator);
  if (data.timeScale !== undefined) State.addTimeScale(builder, data.timeScale);
  const stateOffset = State.endState(builder);
  
  return createEnvelope(builder, 0, ServerMessage.State, stateOffset);
}

export function encodeAck(requestId: number, success: boolean, error?: string): Uint8Array {
  const builder = new flatbuffers.Builder(128);
  
  const errorOffset = error ? builder.createString(error) : 0;
  
  Ack.startAck(builder);
  Ack.addSuccess(builder, success);
  if (errorOffset) Ack.addError(builder, errorOffset);
  const ackOffset = Ack.endAck(builder);
  
  return createEnvelope(builder, requestId, ServerMessage.Ack, ackOffset);
}

export interface HistoryPointData {
  timestampMs: number;
  kilnTemp: number;
  setTemp: number;
  heatPercent: number;
  envTemp: number;
  caseTemp: number;
  markerType?: number;
  markerValue?: string;
}

export function encodeHistoryResponse(
  requestId: number,
  intervalMs: number,
  maxAgeMs: number,
  points: HistoryPointData[]
): Uint8Array {
  const builder = new flatbuffers.Builder(points.length * 32 + 128);
  
  // Build history points in reverse order (FlatBuffers requirement)
  const pointOffsets: flatbuffers.Offset[] = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    const markerValueOffset = p.markerValue ? builder.createString(p.markerValue) : 0;
    
    HistoryPoint.startHistoryPoint(builder);
    HistoryPoint.addTimestampMs(builder, BigInt(p.timestampMs));
    HistoryPoint.addKilnTemp(builder, p.kilnTemp);
    HistoryPoint.addSetTemp(builder, p.setTemp);
    HistoryPoint.addHeatPercent(builder, p.heatPercent);
    HistoryPoint.addEnvTemp(builder, p.envTemp);
    HistoryPoint.addCaseTemp(builder, p.caseTemp);
    if (p.markerType !== undefined) HistoryPoint.addMarkerType(builder, p.markerType);
    if (markerValueOffset) HistoryPoint.addMarkerValue(builder, markerValueOffset);
    pointOffsets.push(HistoryPoint.endHistoryPoint(builder));
  }
  
  // Reverse to get correct order
  pointOffsets.reverse();
  
  const dataVector = HistoryResponse.createDataVector(builder, pointOffsets);
  
  HistoryResponse.startHistoryResponse(builder);
  HistoryResponse.addIntervalMs(builder, intervalMs);
  HistoryResponse.addMaxAgeMs(builder, maxAgeMs);
  HistoryResponse.addData(builder, dataVector);
  const respOffset = HistoryResponse.endHistoryResponse(builder);
  
  return createEnvelope(builder, requestId, ServerMessage.HistoryResponse, respOffset);
}

export interface ProgramInfoData {
  name: string;
  size: number;
  description: string;
}

export function encodeProgramListResponse(requestId: number, programs: ProgramInfoData[]): Uint8Array {
  const builder = new flatbuffers.Builder(programs.length * 128 + 64);
  
  const programOffsets: flatbuffers.Offset[] = [];
  for (const p of programs) {
    const nameOffset = builder.createString(p.name);
    const descOffset = builder.createString(p.description);
    
    ProgramInfo.startProgramInfo(builder);
    ProgramInfo.addName(builder, nameOffset);
    ProgramInfo.addSize(builder, p.size);
    ProgramInfo.addDescription(builder, descOffset);
    programOffsets.push(ProgramInfo.endProgramInfo(builder));
  }
  
  const programsVector = ProgramListResponse.createProgramsVector(builder, programOffsets);
  
  ProgramListResponse.startProgramListResponse(builder);
  ProgramListResponse.addPrograms(builder, programsVector);
  const respOffset = ProgramListResponse.endProgramListResponse(builder);
  
  return createEnvelope(builder, requestId, ServerMessage.ProgramListResponse, respOffset);
}

export function encodeProgramContentResponse(requestId: number, name: string, content: string): Uint8Array {
  const builder = new flatbuffers.Builder(content.length + 256);
  
  const nameOffset = builder.createString(name);
  const contentOffset = builder.createString(content);
  
  ProgramContentResponse.startProgramContentResponse(builder);
  ProgramContentResponse.addName(builder, nameOffset);
  ProgramContentResponse.addContent(builder, contentOffset);
  const respOffset = ProgramContentResponse.endProgramContentResponse(builder);
  
  return createEnvelope(builder, requestId, ServerMessage.ProgramContentResponse, respOffset);
}

export function encodePreferencesResponse(requestId: number, json: string): Uint8Array {
  const builder = new flatbuffers.Builder(json.length + 128);
  
  const jsonOffset = builder.createString(json);
  
  PreferencesResponse.startPreferencesResponse(builder);
  PreferencesResponse.addJson(builder, jsonOffset);
  const respOffset = PreferencesResponse.endPreferencesResponse(builder);
  
  return createEnvelope(builder, requestId, ServerMessage.PreferencesResponse, respOffset);
}

export function encodeDebugInfoResponse(requestId: number, json: string): Uint8Array {
  const builder = new flatbuffers.Builder(json.length + 128);
  
  const jsonOffset = builder.createString(json);
  
  DebugInfoResponse.startDebugInfoResponse(builder);
  DebugInfoResponse.addJson(builder, jsonOffset);
  const respOffset = DebugInfoResponse.endDebugInfoResponse(builder);
  
  return createEnvelope(builder, requestId, ServerMessage.DebugInfoResponse, respOffset);
}

export interface LogInfoData {
  name: string;
  size: number;
}

export function encodeLogListResponse(requestId: number, logs: LogInfoData[]): Uint8Array {
  const builder = new flatbuffers.Builder(logs.length * 64 + 64);
  
  const logOffsets: flatbuffers.Offset[] = [];
  for (const l of logs) {
    const nameOffset = builder.createString(l.name);
    
    LogInfo.startLogInfo(builder);
    LogInfo.addName(builder, nameOffset);
    LogInfo.addSize(builder, l.size);
    logOffsets.push(LogInfo.endLogInfo(builder));
  }
  
  const logsVector = LogListResponse.createLogsVector(builder, logOffsets);
  
  LogListResponse.startLogListResponse(builder);
  LogListResponse.addLogs(builder, logsVector);
  const respOffset = LogListResponse.endLogListResponse(builder);
  
  return createEnvelope(builder, requestId, ServerMessage.LogListResponse, respOffset);
}

export function encodeLogContentResponse(requestId: number, name: string, content: string): Uint8Array {
  const builder = new flatbuffers.Builder(content.length + 256);
  
  const nameOffset = builder.createString(name);
  const contentOffset = builder.createString(content);
  
  LogContentResponse.startLogContentResponse(builder);
  LogContentResponse.addName(builder, nameOffset);
  LogContentResponse.addContent(builder, contentOffset);
  const respOffset = LogContentResponse.endLogContentResponse(builder);
  
  return createEnvelope(builder, requestId, ServerMessage.LogContentResponse, respOffset);
}

export function encodeError(requestId: number, code: number, message: string): Uint8Array {
  const builder = new flatbuffers.Builder(message.length + 64);
  
  const messageOffset = builder.createString(message);
  
  FbError.startError(builder);
  FbError.addCode(builder, code);
  FbError.addMessage(builder, messageOffset);
  const errOffset = FbError.endError(builder);
  
  return createEnvelope(builder, requestId, ServerMessage.Error, errOffset);
}

/**
 * Check if a WebSocket message is binary (FlatBuffers) or text (JSON)
 */
export function isBinaryMessage(data: Buffer): boolean {
  // FlatBuffers messages start with a 4-byte offset to the root table
  // JSON messages start with '{' (0x7B)
  return data.length > 0 && data[0] !== 0x7B;
}


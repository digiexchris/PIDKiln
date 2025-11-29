// Application state types

export type ProgramStatusCode =
  | 0 // NONE
  | 1 // READY
  | 2 // RUNNING
  | 3 // PAUSED
  | 4 // STOPPED
  | 5 // ERROR
  | 6 // WAITING_THRESHOLD
  | 7; // FINISHED

export interface FurnaceState {
  program_status: ProgramStatusCode;
  program_name: string | null;
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
  error_message: string | null;
}

export interface EditorState {
  filename: string;
  isNew: boolean;
}

export interface ChartMarker {
  x: number;
  type: string;
  value?: string | number;
}

export interface ProgramProfile {
  name: string;
  startTime: number | null;
  durationMinutes: number;
  times: number[];
  temps: number[];
}

export interface ChartData {
  timestamps: number[]; // Unix seconds
  kilnTemps: number[];
  setTemps: number[];
  envTemps: number[];
  caseTemps: number[];
  markers: ChartMarker[];
}

export type PreferencesMap = Record<string, string>;

export interface StateMessage {
  type: 'state';
  data: FurnaceState;
}

export interface GenericMessage {
  type: string;
  data?: unknown;
}

export type IncomingMessage = StateMessage | GenericMessage;

export const STATUS_NAMES: Record<number, string> = {
  0: 'NONE', 1: 'READY', 2: 'RUNNING', 3: 'PAUSED',
  4: 'STOPPED', 5: 'ERROR', 6: 'WAITING', 7: 'FINISHED',
};

export const STATUS_CLASSES: Record<number, string> = {
  2: 'running', 3: 'paused', 5: 'error',
};


export interface ProgramFile {
  name: string;
  size: number;
  description?: string;
}

export interface LogFile {
  name: string;
  size: number;
}

export interface HistoryMarker {
  type: string;
  value?: string | number;
}

export interface HistoryPoint {
  t: number;
  k: number;
  s: number;
  p: number;
  e?: number;
  c?: number;
  m?: HistoryMarker;
}

export interface HistoryResponse {
  interval_ms: number;
  max_age_ms: number;
  count: number;
  data: HistoryPoint[];
}

export interface ProgramsResponse {
  files: ProgramFile[];
}

export interface LogsResponse {
  files: LogFile[];
}

export interface DebugInfo {
  [key: string]: string | number;
}

export interface PreferencesMap {
  [key: string]: string | number;
}


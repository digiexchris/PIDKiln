// Utility functions

export function formatTemp(val: number | undefined): string {
  return val !== undefined ? `${val.toFixed(1)}°C` : '--';
}

export function formatTimeLabel(value: number): string {
  const date = new Date(value * 1000);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatPreviewTimeLabel(baseMs: number, offsetMinutes: number): string {
  const ms = baseMs + Math.round(offsetMinutes * 60 * 1000);
  const date = new Date(ms);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function escapeHtml(str: string): string {
  return String(str).replace(/[&<>"']/g, c => 
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c] as string)
  );
}

export function escapeAttr(value: string): string {
  return escapeHtml(value);
}

export function escapeJs(value: string): string {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\\\'')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

export function cssEscape(value: string): string {
  if (window.CSS && (window.CSS as { escape?: (s: string) => string }).escape) {
    return (window.CSS as { escape: (s: string) => string }).escape(value);
  }
  return String(value).replace(/[^a-zA-Z0-9_-]/g, match => `\\${match}`);
}

export function timeToSeconds(field: { hours?: number; minutes?: number; seconds?: number } | null | undefined): number {
  if (!field) return 0;
  const hours = Number(field.hours) || 0;
  const minutes = Number(field.minutes) || 0;
  const seconds = Number(field.seconds) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}


/**
 * Stopwatch maths, timestamp-based so it survives backgrounding, locking and app restarts:
 * elapsed = accumulated + (now − startedAt) while running. No tick counting anywhere.
 */
export interface StopwatchState {
  /** Epoch ms when the current running stretch began; null while paused / reset. */
  startedAt: number | null;
  /** Elapsed ms banked from earlier running stretches. */
  accumulatedMs: number;
  /** Total elapsed ms at each lap press, oldest first. */
  laps: number[];
}

export const INITIAL_STOPWATCH: StopwatchState = { startedAt: null, accumulatedMs: 0, laps: [] };

export const isRunning = (s: StopwatchState) => s.startedAt !== null;
/** Clock changes can move Date.now() backwards; never let elapsed go negative or shrink. */
export const elapsedMs = (s: StopwatchState, now: number) => s.accumulatedMs + (s.startedAt === null ? 0 : Math.max(0, now - s.startedAt));

export const start = (s: StopwatchState, now: number): StopwatchState => (s.startedAt === null ? { ...s, startedAt: now } : s);
export const pause = (s: StopwatchState, now: number): StopwatchState => (s.startedAt === null ? s : { ...s, startedAt: null, accumulatedMs: elapsedMs(s, now) });
export const lap = (s: StopwatchState, now: number): StopwatchState => (s.startedAt === null ? s : { ...s, laps: [...s.laps, elapsedMs(s, now)] });
export const reset = (): StopwatchState => INITIAL_STOPWATCH;

export interface LapRow { number: number; lapMs: number; totalMs: number; fastest: boolean; slowest: boolean }

/** Lap rows newest first; fastest / slowest are only marked once there are at least two laps. */
export function lapRows(laps: number[]): LapRow[] {
  const rows = laps.map((totalMs, i) => ({ number: i + 1, totalMs, lapMs: totalMs - (i ? laps[i - 1] : 0) }));
  const durations = rows.map((r) => r.lapMs);
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  const mark = rows.length >= 2 && min !== max;
  return rows.map((r) => ({ ...r, fastest: mark && r.lapMs === min, slowest: mark && r.lapMs === max })).reverse();
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** 00:00.00, or 01:24:36.42 once past an hour (hundredths are truncated, never rounded up). */
export function formatStopwatch(ms: number) {
  const total = Math.max(0, Math.floor(ms / 10));
  const cs = total % 100;
  const s = Math.floor(total / 100) % 60;
  const m = Math.floor(total / 6000) % 60;
  const h = Math.floor(total / 360000);
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}.${pad(cs)}` : `${pad(m)}:${pad(s)}.${pad(cs)}`;
}

/** Restores persisted state defensively (corrupt or future-dated values fall back to safe ones). */
export function restoreStopwatch(raw: unknown, now: number): StopwatchState {
  if (!raw || typeof raw !== 'object') return INITIAL_STOPWATCH;
  const r = raw as Partial<StopwatchState>;
  const accumulatedMs = typeof r.accumulatedMs === 'number' && r.accumulatedMs >= 0 ? r.accumulatedMs : 0;
  const startedAt = typeof r.startedAt === 'number' && r.startedAt <= now ? r.startedAt : null;
  const laps = Array.isArray(r.laps) ? r.laps.filter((n): n is number => typeof n === 'number' && n >= 0) : [];
  return { startedAt, accumulatedMs, laps };
}

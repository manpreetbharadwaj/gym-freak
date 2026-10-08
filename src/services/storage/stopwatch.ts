import { useEffect, useSyncExternalStore } from 'react';
import { INITIAL_STOPWATCH, lap, pause, reset, restoreStopwatch, start, StopwatchState } from '@/utils/stopwatch';
import { safeStorage } from './safeStorage';

/**
 * One app-wide stopwatch. Only timestamps are stored (`gymfreak.stopwatch`: startedAt, accumulatedMs,
 * laps), so it keeps time while the screen is closed, the app is backgrounded or the phone is locked,
 * and restores after the OS kills the app. The screen just re-renders `elapsedMs(state, Date.now())`.
 */
const KEY = 'stopwatch';
let state: StopwatchState = INITIAL_STOPWATCH;
let loaded = false;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const commit = (next: StopwatchState) => {
  if (next === state) return;
  state = next;
  listeners.forEach((l) => l());
  safeStorage.set(KEY, state).catch(() => undefined);
};

let loading: Promise<void> | null = null;
const load = () => (loading ??= safeStorage.get<unknown>(KEY, null).then((raw) => {
  // An action taken before storage answered wins over the stored value.
  if (!loaded && state === INITIAL_STOPWATCH) state = restoreStopwatch(raw, Date.now());
  loaded = true;
  listeners.forEach((l) => l());
}).catch(() => { loaded = true; }));

export function useStopwatch() {
  const s = useSyncExternalStore(subscribe, () => state);
  useEffect(() => { load(); }, []);
  return {
    state: s,
    start: () => commit(start(state, Date.now())),
    pause: () => commit(pause(state, Date.now())),
    lap: () => commit(lap(state, Date.now())),
    reset: () => commit(reset()),
  };
}

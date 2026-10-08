import { ACTIVITY_TYPES, ActivityType, isGpsActivity } from './activityTypes';
import { METERS_PER_KM, METERS_PER_MILE } from '../../utils/units';

/**
 * Pure activity-tracking engine. Every location fix and every user action goes through these
 * functions, so the same logic runs in the foreground, in the background location task, and in tests.
 *
 * Time model: `startedAt` is when the countdown hit GO. Active time = now − startedAt − paused time,
 * where paused time includes manual pauses and auto-pauses. Nothing is tracked before GO.
 */

export interface Fix { lat: number; lng: number; alt?: number | null; accuracy?: number | null; altitudeAccuracy?: number | null; speed?: number | null; t: number }
export interface RoutePoint { lat: number; lng: number; alt: number | null; accuracy: number | null; t: number; /** Starts a new polyline segment (after a pause or long signal gap). */ gap?: boolean }
export interface Split { number: number; distanceMeters: number; durationMs: number }

export interface TrackerState {
  id: string;
  type: ActivityType;
  status: 'active' | 'paused' | 'finished';
  startedAt: number;
  endedAt: number | null;
  /** When the current pause began (manual or auto). */
  pausedAt: number | null;
  pausedTotalMs: number;
  autoPaused: boolean;
  distanceMeters: number;
  elevationGainM: number;
  /** Altitude reference for hysteresis-based elevation gain. */
  altRef: number | null;
  /** Last point distance was measured from (null after pause/start/gap). */
  anchor: RoutePoint | null;
  /** Active ms when the anchor was recorded (split interpolation). */
  anchorMs: number;
  route: RoutePoint[];
  lastFix: Fix | null;
  /** Last few accepted fixes, averaged into the point distance is measured on. */
  recent: Fix[];
  lastFixAt: number | null;
  /** Recent (activeMs, distance, t) samples for current pace + auto-pause. */
  window: { t: number; activeMs: number; distance: number }[];
  splitsKm: Split[];
  splitsMi: Split[];
  /** Active ms at which each completed split ended (for split durations). */
  lastSplitKmMs: number;
  lastSplitMiMs: number;
  /** Last milestone (in meters) the voice coach announced. */
  lastMilestone: number;
  /** Below-stop-speed / above-resume-speed timers for auto-pause hysteresis. */
  stillSince: number | null;
  movingSince: number | null;
}

export interface EngineSettings {
  autoPause: boolean;
  /** Voice coach milestone interval in meters (0 = off). */
  milestoneMeters: number;
}

export type EngineEvent =
  | { kind: 'milestone'; meters: number }
  | { kind: 'autoPause' }
  | { kind: 'autoResume' };

/** Fixes worse than this are ignored entirely (indoor / cold start noise). */
export const MAX_ACCURACY_M = 30;
/** A gap longer than this between accepted fixes starts a new route segment. */
export const GAP_MS = 20_000;
const WINDOW_MS = 30_000;
const STILL_HOLD_MS = 8_000;
const STOP_WINDOW_MS = 10_000;
/** Fixes averaged (accuracy-weighted) before measuring distance, to cancel standing-still jitter. */
const SMOOTH_FIXES = 3;
const MOVING_HOLD_MS = 5_000;
const ELEVATION_HYSTERESIS_M = 3;

export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371008.8;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function createTracker(id: string, type: ActivityType, startedAt: number): TrackerState {
  return {
    id, type, status: 'active', startedAt, endedAt: null, pausedAt: null, pausedTotalMs: 0, autoPaused: false,
    distanceMeters: 0, elevationGainM: 0, altRef: null, anchor: null, anchorMs: 0, route: [], lastFix: null, recent: [], lastFixAt: null, window: [],
    splitsKm: [], splitsMi: [], lastSplitKmMs: 0, lastSplitMiMs: 0, lastMilestone: 0, stillSince: null, movingSince: null,
  };
}

export function activeMs(s: TrackerState, now: number) {
  const end = s.endedAt ?? s.pausedAt ?? now;
  return Math.max(0, end - s.startedAt - s.pausedTotalMs);
}

export const pausedMs = (s: TrackerState, now: number) => s.pausedTotalMs + (s.pausedAt != null ? (s.endedAt ?? now) - s.pausedAt : 0);

export function pause(s: TrackerState, now: number): TrackerState {
  if (s.status !== 'active' || s.pausedAt != null) return s.status === 'active' ? { ...s, status: 'paused', autoPaused: false } : s;
  return { ...s, status: 'paused', pausedAt: now, autoPaused: false, anchor: null, recent: [], window: [], stillSince: null, movingSince: null };
}

export function resume(s: TrackerState, now: number): TrackerState {
  if (s.status !== 'paused') return s;
  return { ...s, status: 'active', pausedAt: null, pausedTotalMs: s.pausedTotalMs + (now - (s.pausedAt ?? now)), autoPaused: false, anchor: null, recent: [], window: [], stillSince: null, movingSince: null };
}

export function finish(s: TrackerState, now: number): TrackerState {
  if (s.status === 'finished') return s;
  const closed = s.pausedAt != null ? { ...s, pausedTotalMs: s.pausedTotalMs + (now - s.pausedAt), pausedAt: null } : s;
  return { ...closed, status: 'finished', endedAt: now, autoPaused: false };
}

/** Why a fix was not used for distance (exported for tests/diagnostics). */
export function rejectReason(s: TrackerState, fix: Fix): 'accuracy' | 'stale' | 'jump' | null {
  if (fix.accuracy != null && fix.accuracy > MAX_ACCURACY_M) return 'accuracy';
  const last = s.lastFix;
  if (last && fix.t <= last.t) return 'stale';
  const anchor = s.anchor;
  if (anchor) {
    const dt = (fix.t - anchor.t) / 1000;
    const d = haversine(anchor, fix);
    // Allow a little slack for GPS uncertainty on short intervals before calling it a jump.
    const slack = ((fix.accuracy ?? 10) + (anchor.accuracy ?? 10));
    if (dt > 0 && (d - slack) / dt > ACTIVITY_TYPES[s.type].maxSpeed) return 'jump';
  }
  return null;
}

/** Minimum movement before distance is added: suppresses standing-still jitter, scales with accuracy. */
export const moveThreshold = (a: RoutePoint, fix: Fix) => Math.min(20, Math.max(5, 0.5 * ((a.accuracy ?? 10) + (fix.accuracy ?? 10))));

/**
 * Applies one location fix. Returns the new state plus voice/auto-pause events.
 * Manual pause: the map still follows the user but no distance is added.
 */
export function applyFix(s: TrackerState, fix: Fix, settings: EngineSettings): { state: TrackerState; events: EngineEvent[] } {
  if (s.status === 'finished' || !isGpsActivity(s.type)) return { state: s, events: [] };
  const reason = rejectReason(s, fix);
  if (reason === 'accuracy' || reason === 'stale') return { state: s, events: [] };
  const events: EngineEvent[] = [];
  let next: TrackerState = { ...s, lastFix: fix, lastFixAt: fix.t };
  if (reason === 'jump') return { state: next, events };
  if (s.status === 'paused' && !s.autoPaused) return { state: next, events };

  const fresh = s.recent.length && fix.t - s.recent[s.recent.length - 1].t > GAP_MS ? [] : s.recent;
  const recent = [...fresh, fix].slice(-SMOOTH_FIXES);
  next = { ...next, recent };
  const point = smoothed(recent);
  const elapsed = activeMs(next, fix.t);

  // Auto-pause / auto-resume with hysteresis on the speed over the recent window.
  if (settings.autoPause) {
    const result = autoPauseStep(next, point, fix, s.lastFix);
    next = result.state;
    if (result.event) events.push(result.event);
    if (next.autoPaused) return { state: next, events };
  }

  const anchor = next.anchor;
  if (!anchor) {
    next = { ...next, anchor: point, anchorMs: elapsed, route: [...next.route, { ...point, gap: next.route.length > 0 }] };
  } else {
    const d = haversine(anchor, point);
    // Signal loss = a long silence between consecutive fixes (not a long time standing at the anchor).
    const gap = !!s.lastFix && fix.t - s.lastFix.t > GAP_MS;
    if (d >= moveThreshold(anchor, fix) || gap) {
      const before = next.distanceMeters;
      const distance = before + d;
      const fromMs = next.anchorMs;
      next = { ...next, distanceMeters: distance, anchor: point, anchorMs: elapsed, route: [...next.route, gap ? { ...point, gap: true } : point] };
      next = recordSplits(next, before, distance, fromMs, elapsed);
      if (settings.milestoneMeters > 0) {
        const reached = Math.floor(distance / settings.milestoneMeters) * settings.milestoneMeters;
        if (reached > next.lastMilestone) { next = { ...next, lastMilestone: reached }; events.push({ kind: 'milestone', meters: reached }); }
      }
    }
  }

  next = trackElevation(next, fix);
  const window = [...next.window, { t: fix.t, activeMs: elapsed, distance: next.distanceMeters }].filter((w) => fix.t - w.t <= WINDOW_MS);
  return { state: { ...next, window }, events };
}

/** Accuracy-weighted mean of the recent fixes (latest timestamp/altitude/accuracy). */
function smoothed(fixes: Fix[]): RoutePoint {
  const last = fixes[fixes.length - 1];
  let w = 0; let lat = 0; let lng = 0;
  for (const f of fixes) { const k = 1 / Math.max(1, f.accuracy ?? 10) ** 2; w += k; lat += f.lat * k; lng += f.lng * k; }
  return { lat: lat / w, lng: lng / w, alt: last.alt ?? null, accuracy: last.accuracy ?? null, t: last.t };
}

function autoPauseStep(s: TrackerState, point: RoutePoint, fix: Fix, prevFix: Fix | null): { state: TrackerState; event?: EngineEvent } {
  const info = ACTIVITY_TYPES[s.type];
  const now = fix.t;
  if (!s.autoPaused) {
    // Speed over the recent window: measured distance since the oldest sample + the pending chord from the anchor.
    const first = s.window.find((w) => now - w.t <= STOP_WINDOW_MS);
    if (!first || now - first.t < 5000) return { state: s };
    const pending = s.anchor ? haversine(s.anchor, point) : 0;
    const speed = (s.distanceMeters + pending - first.distance) / ((now - first.t) / 1000);
    if (speed < info.stopSpeed) {
      const since = s.stillSince ?? now;
      if (now - since >= STILL_HOLD_MS) {
        // Pause starts from when the user actually stopped, not from when we were sure.
        return { state: { ...s, status: 'paused', autoPaused: true, pausedAt: since, stillSince: null, movingSince: null, window: [] }, event: { kind: 'autoPause' } };
      }
      return { state: { ...s, stillSince: since } };
    }
    return { state: { ...s, stillSince: null } };
  }
  // Auto-paused: resume only after sustained movement clearly above the stop speed, away from where we stopped.
  // Raw fixes here: the smoothed point lags, which would hide the first seconds of movement.
  const step = prevFix && fix.t > prevFix.t ? haversine(prevFix, fix) / ((fix.t - prevFix.t) / 1000) : 0;
  const moved = s.anchor ? haversine(s.anchor, fix) : Infinity;
  if (moved > 12 && step > info.stopSpeed * 2) {
    const since = s.movingSince ?? prevFix?.t ?? now;
    if (now - since >= MOVING_HOLD_MS) {
      const pausedAt = s.pausedAt ?? since;
      return { state: { ...s, status: 'active', autoPaused: false, pausedAt: null, pausedTotalMs: s.pausedTotalMs + Math.max(0, since - pausedAt), movingSince: null, anchor: null, recent: [], window: [] }, event: { kind: 'autoResume' } };
    }
    return { state: { ...s, movingSince: since } };
  }
  return { state: { ...s, movingSince: null } };
}

function recordSplits(s: TrackerState, before: number, after: number, fromMs: number, elapsed: number): TrackerState {
  let next = s;
  for (const [unit, key, lastKey] of [[METERS_PER_KM, 'splitsKm', 'lastSplitKmMs'], [METERS_PER_MILE, 'splitsMi', 'lastSplitMiMs']] as const) {
    let crossed = Math.floor(before / unit);
    while (Math.floor(after / unit) > crossed) {
      crossed += 1;
      // Interpolate the moment the boundary was crossed within this segment.
      const prevElapsed = fromMs;
      const frac = after > before ? (crossed * unit - before) / (after - before) : 1;
      const at = Math.round(prevElapsed + (elapsed - prevElapsed) * Math.min(1, Math.max(0, frac)));
      next = { ...next, [key]: [...next[key], { number: crossed, distanceMeters: unit, durationMs: at - next[lastKey] }], [lastKey]: at };
    }
  }
  return next;
}

function trackElevation(s: TrackerState, fix: Fix): TrackerState {
  if (fix.alt == null || (fix.altitudeAccuracy != null && fix.altitudeAccuracy > 15)) return s;
  if (s.altRef == null) return { ...s, altRef: fix.alt };
  const delta = fix.alt - s.altRef;
  if (delta >= ELEVATION_HYSTERESIS_M) return { ...s, elevationGainM: s.elevationGainM + delta, altRef: fix.alt };
  if (delta <= -ELEVATION_HYSTERESIS_M) return { ...s, altRef: fix.alt };
  return s;
}

/** Current pace (sec/km) over the recent window; null when not enough movement. */
export function currentPace(s: TrackerState): number | null {
  if (s.status !== 'active' || s.window.length < 2) return null;
  const first = s.window[0];
  const last = s.window[s.window.length - 1];
  const d = last.distance - first.distance;
  const t = (last.activeMs - first.activeMs) / 1000;
  if (d < 15 || t < 5) return null;
  return t / (d / METERS_PER_KM);
}

/** Final split for the leftover distance (shown as e.g. "5.21 km  1:22"). */
export function partialSplit(s: TrackerState, unitMeters: number, now: number): Split | null {
  const done = Math.floor(s.distanceMeters / unitMeters);
  const rest = s.distanceMeters - done * unitMeters;
  if (rest < unitMeters * 0.05) return null;
  const last = unitMeters === METERS_PER_MILE ? s.lastSplitMiMs : s.lastSplitKmMs;
  return { number: done + 1, distanceMeters: rest, durationMs: activeMs(s, now) - last };
}

/**
 * Douglas–Peucker simplification so a long route is stored at a sensible size
 * (keeps shape within ~`tolerance` meters; gap markers are always kept).
 */
export function simplifyRoute(points: RoutePoint[], tolerance = 4, maxPoints = 1500): RoutePoint[] {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1; keep[points.length - 1] = 1;
  points.forEach((p, i) => { if (p.gap) { keep[i] = 1; if (i > 0) keep[i - 1] = 1; } });
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let max = 0; let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = crossTrack(points[i], points[a], points[b]);
      if (d > max) { max = d; idx = i; }
    }
    if (idx > 0 && max > tolerance) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  const out = points.filter((_, i) => keep[i]);
  if (out.length <= maxPoints) return out;
  return simplifyRoute(out, tolerance * 2, maxPoints);
}

function crossTrack(p: RoutePoint, a: RoutePoint, b: RoutePoint) {
  const ab = haversine(a, b);
  if (ab < 0.5) return haversine(a, p);
  // Planar approximation is fine at route scale.
  const x = (lng: number, lat: number) => [(lng - a.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180), (lat - a.lat) * 110540] as const;
  const [bx, by] = x(b.lng, b.lat);
  const [px, py] = x(p.lng, p.lat);
  return Math.abs(bx * py - by * px) / Math.hypot(bx, by);
}

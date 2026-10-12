import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { safeStorage } from '@/services/storage/safeStorage';
import { METERS_PER_KM, METERS_PER_MILE, UnitSystem } from '@/utils/units';
import { ActivitySplit, NewActivity } from '@/types/domain';
import { ActivityType, isGpsActivity } from './activityTypes';
import { activeMs, applyFix, createTracker, finish as finishTracker, Fix, partialSplit, pause as pauseTracker, pausedMs, resume as resumeTracker, simplifyRoute, TrackerState } from './engine';
import { estimateActiveCalories } from './calories';
import { milestoneAnnouncement, VoiceCopy, VoiceMetrics } from './announce';
import { speak } from './voice';

/**
 * The one live activity session. It is persisted after every meaningful change so it survives
 * navigation, backgrounding, a locked screen and an app relaunch; only one session can exist at a
 * time (starting another is refused until this one is saved or discarded).
 *
 * GPS fixes arrive through a background location task (iOS: "when in use" + location background
 * mode with the blue indicator; Android: a location foreground service with a notification), so the
 * same code path runs whether the app is visible or not. Coordinates are never logged.
 */
export const LOCATION_TASK = 'gymfreak-activity-location';
const STORAGE_KEY = 'activeActivity';

export interface SessionMeta {
  unitSystem: UnitSystem;
  voice: boolean;
  milestoneMeters: number;
  metrics: VoiceMetrics;
  autoPause: boolean;
  weightKg: number | null;
  language: string;
  copy: VoiceCopy & { autoPaused: string; autoResumed: string; paused: string; resumed: string };
  notification: { title: string; body: string };
}

export interface ActiveSession { tracker: TrackerState; meta: SessionMeta }

export class ActivityInProgress extends Error {
  constructor(public session: ActiveSession) { super('Another activity is in progress'); }
}

let session: ActiveSession | null = null;
let loaded = false;
let loading: Promise<void> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function ensureLoaded() {
  if (loaded) return;
  loading ??= (async () => {
    session = await safeStorage.get<ActiveSession | null>(STORAGE_KEY, null);
    loaded = true;
    emit();
  })();
  await loading;
}

async function persistNow() {
  if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
  if (session) await safeStorage.set(STORAGE_KEY, session);
  else await safeStorage.remove(STORAGE_KEY);
}

/** Fixes arrive about once a second; write at most every few seconds (and immediately on state changes). */
function schedulePersist() {
  persistTimer ??= setTimeout(() => { persistTimer = null; persistNow(); }, 4000);
}

function update(next: ActiveSession | null, persist: 'now' | 'later' = 'now') {
  session = next;
  emit();
  if (persist === 'now') persistNow(); else schedulePersist();
}

function liveCalories(s: ActiveSession, now = Date.now()) {
  return estimateActiveCalories({ type: s.tracker.type, activeMs: activeMs(s.tracker, now), distanceMeters: s.tracker.distanceMeters, elevationGainM: s.tracker.elevationGainM, weightKg: s.meta.weightKg });
}

function ingest(location: Location.LocationObject) {
  if (!session || session.tracker.status === 'finished') return;
  const fix: Fix = {
    lat: location.coords.latitude, lng: location.coords.longitude, alt: location.coords.altitude, accuracy: location.coords.accuracy,
    altitudeAccuracy: location.coords.altitudeAccuracy, speed: location.coords.speed, t: location.timestamp,
  };
  const { meta } = session;
  const { state, events } = applyFix(session.tracker, fix, { autoPause: meta.autoPause, milestoneMeters: meta.voice ? meta.milestoneMeters : 0 });
  const next = { ...session, tracker: state };
  const statusChanged = state.status !== session.tracker.status;
  update(next, statusChanged || events.length ? 'now' : 'later');
  for (const event of events) {
    if (!meta.voice) continue;
    if (event.kind === 'milestone') speak(milestoneAnnouncement({ meters: event.meters, activeMs: activeMs(state, fix.t), calories: liveCalories(next, fix.t), system: meta.unitSystem, metrics: meta.metrics }, meta.copy));
    else speak(event.kind === 'autoPause' ? meta.copy.autoPaused : meta.copy.autoResumed);
  }
}

// Must be defined at module load (imported from the app entry) so the OS can deliver background fixes.
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  await ensureLoaded();
  const { locations } = data as { locations: Location.LocationObject[] };
  for (const location of [...locations].sort((a, b) => a.timestamp - b.timestamp)) ingest(location);
});

async function startLocationUpdates(meta: SessionMeta) {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 1000,
    distanceInterval: 0,
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: { notificationTitle: meta.notification.title, notificationBody: meta.notification.body, notificationColor: '#5B46F6', killServiceOnDestroy: false },
  });
}

async function stopLocationUpdates() {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)) await Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => undefined);
}

export type LocationPermission = 'granted' | 'denied' | 'blocked';

/** Asked only when the user starts a GPS activity — never at launch. "When in use" is enough on both platforms. */
export async function requestLocationPermission(): Promise<LocationPermission> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'blocked';
  const next = await Location.requestForegroundPermissionsAsync();
  return next.granted ? 'granted' : next.canAskAgain ? 'denied' : 'blocked';
}

export async function locationServicesOn() {
  return Location.hasServicesEnabledAsync().catch(() => true);
}

export const tracker = {
  ensureLoaded,

  current: () => session,

  /** Called right after the countdown reaches GO — nothing is tracked before that. */
  async start(type: ActivityType, meta: SessionMeta): Promise<ActiveSession> {
    await ensureLoaded();
    if (session && session.tracker.status !== 'finished') throw new ActivityInProgress(session);
    const next: ActiveSession = { tracker: createTracker(Crypto.randomUUID(), type, Date.now()), meta };
    update(next);
    if (isGpsActivity(type)) {
      try { await startLocationUpdates(meta); } catch (error) { update(null); throw error; }
    }
    if (meta.voice) speak(meta.copy.started);
    return next;
  },

  pause() {
    if (!session || session.tracker.status !== 'active') return;
    update({ ...session, tracker: pauseTracker(session.tracker, Date.now()) });
    if (session.meta.voice) speak(session.meta.copy.paused);
  },

  resume() {
    if (!session || session.tracker.status !== 'paused') return;
    update({ ...session, tracker: resumeTracker(session.tracker, Date.now()) });
    if (session.meta.voice) speak(session.meta.copy.resumed);
  },

  async finish() {
    if (!session) return null;
    const next = { ...session, tracker: finishTracker(session.tracker, Date.now()) };
    update(next);
    await stopLocationUpdates();
    return next;
  },

  /** Throws away the session (after the user confirmed). */
  async discard() {
    await stopLocationUpdates();
    update(null);
  },

  /** The server has the activity: forget the local copy. */
  async clear() { update(null); },

  /**
   * App start: a session that was live when the app was suspended or killed is restored; GPS
   * updates are restarted if the OS stopped them (and permission is still granted).
   */
  async recover() {
    await ensureLoaded();
    if (!session || session.tracker.status === 'finished' || !isGpsActivity(session.tracker.type)) return session;
    const permission = await Location.getForegroundPermissionsAsync().catch(() => null);
    if (permission?.granted) await startLocationUpdates(session.meta).catch(() => undefined);
    return session;
  },

  /** Builds the payload saved to the backend (simplified route, km + mi splits incl. the last partial one). */
  payload(s: ActiveSession): NewActivity {
    const t = s.tracker;
    const end = t.endedAt ?? Date.now();
    const gps = isGpsActivity(t.type);
    const splits: ActivitySplit[] = [];
    if (gps) {
      for (const [unit, list, meters] of [['km', t.splitsKm, METERS_PER_KM], ['mi', t.splitsMi, METERS_PER_MILE]] as const) {
        list.forEach((x) => splits.push({ unit, number: x.number, distanceMeters: Math.round(x.distanceMeters * 100) / 100, durationMs: x.durationMs }));
        const rest = partialSplit(t, meters, end);
        if (rest) splits.push({ unit, number: rest.number, distanceMeters: Math.round(rest.distanceMeters * 100) / 100, durationMs: rest.durationMs });
      }
    }
    return {
      clientId: t.id,
      type: t.type,
      startedAt: new Date(t.startedAt).toISOString(),
      endedAt: new Date(end).toISOString(),
      activeDurationMs: Math.round(activeMs(t, end)),
      pausedDurationMs: Math.round(pausedMs(t, end)),
      distanceMeters: gps ? Math.round(t.distanceMeters * 100) / 100 : null,
      calories: liveCalories(s, end),
      caloriesEstimated: true,
      elevationGainM: gps && t.elevationGainM > 0 ? Math.round(t.elevationGainM * 10) / 10 : null,
      // iOS fix timestamps carry sub-millisecond fractions; the API stores whole milliseconds (a fraction is a 400).
      route: gps ? simplifyRoute(t.route).map((p) => ({ lat: p.lat, lng: p.lng, alt: p.alt, accuracy: p.accuracy, t: Math.round(p.t), gap: p.gap || undefined })) : [],
      splits,
    };
  },

  calories: liveCalories,
};

export function useActiveSession() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => session);
}

// Flush the latest state before the OS can suspend us.
AppState.addEventListener('change', (state) => { if (state !== 'active' && session) persistNow(); });
if (Platform.OS === 'android') AppState.addEventListener('blur', () => { if (session) persistNow(); });

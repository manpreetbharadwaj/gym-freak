import { useSyncExternalStore } from 'react';
import type { GymRepository } from '@/services/repositories';
import { safeStorage } from '@/services/storage/safeStorage';
import { ActivityDetail, HealthConnectionStatus, HealthSyncResult } from '@/types/domain';
import { addDays, dayKey } from '@/utils/dates';
import { healthAdapter } from './index';

/**
 * Apple Health / Health Connect → Gym Freak sync.
 *
 * - Runs when the app comes to the foreground (at most every 30 min), after an activity is saved,
 *   and on "Sync Now". No background polling, so no battery drain.
 * - Reads workouts since the last successful sync minus a 3-day overlap (watch data can arrive
 *   late), and daily step/distance/energy totals for the last 14 days. The server de-duplicates
 *   by external id, Gym Freak metadata and time/distance overlap, so overlapping reads are safe.
 * - "Disconnected" is a local switch too: once the user disconnects, nothing is read again until
 *   they reconnect (iOS cannot revoke HealthKit access from inside an app).
 */
const STATE_KEY = 'healthSync';
const FIRST_SYNC_DAYS = 30;
const OVERLAP_DAYS = 3;
const DAILY_DAYS = 14;
const MIN_INTERVAL_MS = 30 * 60_000;

interface Persisted { enabled: boolean; lastSuccessAt: string | null }
export interface HealthSyncState extends Persisted { syncing: boolean; error: string | null; last?: HealthSyncResult; status: HealthConnectionStatus | null }

let state: HealthSyncState = { enabled: false, lastSuccessAt: null, syncing: false, error: null, status: null };
let loaded = false;
const listeners = new Set<() => void>();
const set = (patch: Partial<HealthSyncState>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };

async function load() {
  if (loaded) return state;
  const stored = await safeStorage.get<Persisted>(STATE_KEY, { enabled: false, lastSuccessAt: null });
  loaded = true;
  set(stored);
  return state;
}
const persist = () => safeStorage.set<Persisted>(STATE_KEY, { enabled: state.enabled, lastSuccessAt: state.lastSuccessAt });

export function useHealthSync() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state);
}

export const healthSync = {
  load,

  /** Permission sheet → first sync. */
  async connect(gym: GymRepository) {
    const adapter = healthAdapter();
    if (!adapter) return null;
    await load();
    const permissions = await adapter.connect();
    set({ enabled: permissions.status !== 'NOT_CONNECTED' || adapter.provider === 'APPLE_HEALTH', status: permissions.status });
    await persist();
    await gym.setHealthConnection(adapter.provider, permissions.status, permissions.granted).catch(() => undefined);
    if (state.enabled) await healthSync.run(gym, { force: true });
    return permissions;
  },

  async disconnect(gym: GymRepository) {
    const adapter = healthAdapter();
    if (!adapter) return { revoked: false };
    const revoked = await adapter.revoke().catch(() => false);
    set({ enabled: false, status: 'NOT_CONNECTED', error: null });
    await persist();
    await gym.setHealthConnection(adapter.provider, 'NOT_CONNECTED', []).catch(() => undefined);
    return { revoked };
  },

  async run(gym: GymRepository, options: { force?: boolean } = {}) {
    const adapter = healthAdapter();
    await load();
    if (!adapter || !state.enabled || state.syncing) return null;
    if (!options.force && state.lastSuccessAt && Date.now() - new Date(state.lastSuccessAt).getTime() < MIN_INTERVAL_MS) return null;
    if ((await adapter.availability()) !== 'available') { set({ error: 'unavailable' }); return null; }
    set({ syncing: true, error: null });
    try {
      const permissions = await adapter.permissions();
      if (permissions.status === 'NOT_CONNECTED') {
        set({ syncing: false, status: 'NOT_CONNECTED' });
        await gym.setHealthConnection(adapter.provider, 'NOT_CONNECTED', permissions.granted).catch(() => undefined);
        return null;
      }
      const since = state.lastSuccessAt ? addDays(new Date(state.lastSuccessAt), -OVERLAP_DAYS) : addDays(new Date(), -FIRST_SYNC_DAYS);
      const days = Array.from({ length: DAILY_DAYS }, (_, i) => dayKey(addDays(new Date(), -i)));
      const [workouts, daily] = await Promise.all([adapter.workouts(since).catch(() => []), adapter.daily(days).catch(() => [])]);
      const result = await gym.syncHealth({ provider: adapter.provider, status: permissions.status, permissions: permissions.granted, workouts, daily: daily.filter((d) => d.steps != null || d.distanceMeters != null || d.activeCalories != null) });
      set({ syncing: false, last: result, status: result.connection?.status ?? permissions.status, lastSuccessAt: new Date().toISOString() });
      await persist();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 200) : 'sync failed';
      set({ syncing: false, error: message });
      await gym.syncHealth({ provider: adapter.provider, status: 'ERROR', permissions: [], workouts: [], daily: [], error: message }).catch(() => undefined);
      return null;
    }
  },

  /**
   * Writes a just-saved Gym Freak activity to the health store (if enabled and permitted) and tells
   * the server the platform record id, so the next sync recognises it instead of importing it again.
   */
  async writeBack(gym: GymRepository, activity: ActivityDetail, wanted: boolean) {
    const adapter = healthAdapter();
    await load();
    if (!adapter || !wanted || !state.enabled || activity.exportedTo.includes(adapter.provider)) return false;
    try {
      const externalId = await adapter.writeActivity(activity);
      if (!externalId) return false;
      await gym.addActivityHealthRef(activity.id, adapter.provider, externalId);
      return true;
    } catch {
      return false;
    }
  },
};

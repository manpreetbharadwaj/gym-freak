import { useEffect, useSyncExternalStore } from 'react';
import { safeStorage } from './safeStorage';

/**
 * Activity settings are a property of this phone (like audio cues), so they stay on the device.
 * Distances are canonical meters; the voice interval is stored as "units" (0.5 / 1 / 2 of the
 * user's km-or-mile) so switching km ↔ mi keeps "every 1 km" as "every 1 mi".
 */
export interface ActivitySettings {
  voiceCoach: boolean;
  /** Announcement interval in km or miles (whichever unit is active). */
  voiceStep: 0.5 | 1 | 2;
  voiceMetrics: { distance: boolean; duration: boolean; pace: boolean; calories: boolean };
  autoPause: boolean;
  /** Write finished Gym Freak activities to Apple Health / Health Connect (needs write permission). */
  saveToHealth: boolean;
}

export const DEFAULT_ACTIVITY_SETTINGS: ActivitySettings = {
  voiceCoach: true,
  voiceStep: 1,
  voiceMetrics: { distance: true, duration: true, pace: true, calories: true },
  autoPause: false,
  saveToHealth: true,
};

const KEY = 'activitySettings';
let current: ActivitySettings = DEFAULT_ACTIVITY_SETTINGS;
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadActivitySettings() {
  if (!loaded) {
    const stored = await safeStorage.get<Partial<ActivitySettings>>(KEY, {});
    current = { ...DEFAULT_ACTIVITY_SETTINGS, ...stored, voiceMetrics: { ...DEFAULT_ACTIVITY_SETTINGS.voiceMetrics, ...stored.voiceMetrics } };
    loaded = true;
    emit();
  }
  return current;
}

export async function updateActivitySettings(patch: Partial<ActivitySettings>) {
  current = { ...current, ...patch, voiceMetrics: { ...current.voiceMetrics, ...patch.voiceMetrics } };
  emit();
  await safeStorage.set(KEY, current);
}

export function useActivitySettings() {
  useEffect(() => { loadActivitySettings(); }, []);
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => current);
}

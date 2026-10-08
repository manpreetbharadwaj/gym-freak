import { Platform } from 'react-native';
import type { HealthAdapter } from './types';

/** The platform's health store, loaded lazily so each platform only touches its own native module. */
let adapter: HealthAdapter | null | undefined;

export function healthAdapter(): HealthAdapter | null {
  if (adapter !== undefined) return adapter;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    adapter = Platform.OS === 'ios' ? require('./appleHealth').appleHealth : Platform.OS === 'android' ? require('./healthConnect').healthConnect : null;
  } catch {
    adapter = null;
  }
  return adapter ?? null;
}

export type { HealthAdapter, HealthAvailability, HealthPermissionState } from './types';

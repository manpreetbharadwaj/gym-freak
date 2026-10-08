import { ActivityDetail, HealthConnectionStatus, HealthDaily, HealthProvider, ImportedWorkout } from '@/types/domain';

/**
 * Device health platform (Apple Health / HealthKit on iOS, Health Connect on Android).
 * The backend never reads these stores: this adapter reads on the device, with the user's
 * permission, and the app sends only what the Activity module needs.
 */
export type HealthAvailability = 'available' | 'unavailable' | 'needs-install' | 'needs-update';

export interface HealthPermissionState {
  status: HealthConnectionStatus;
  /** Human-readable grants, e.g. ["steps", "distance", "workouts", "write-workouts"]. */
  granted: string[];
  /** iOS never reveals whether *read* access was granted (privacy); we can only say we asked. */
  readStatusKnown: boolean;
}

export interface HealthAdapter {
  provider: HealthProvider;
  availability(): Promise<HealthAvailability>;
  permissions(): Promise<HealthPermissionState>;
  /** Shows the platform permission sheet for exactly the types the Activity module uses. */
  connect(): Promise<HealthPermissionState>;
  /** Revokes what the platform lets an app revoke itself (Health Connect: everything; iOS: nothing — the user does it in the Health app). */
  revoke(): Promise<boolean>;
  /** Opens the platform's own permission management (Health app / Health Connect settings). */
  managePermissions(): Promise<void>;
  /** Platform-aggregated totals per local day (already de-duplicated across phone + watch). */
  daily(days: string[]): Promise<HealthDaily[]>;
  /** Workouts that started at/after `since`, excluding the ones Gym Freak wrote (reported via gymFreakActivityId). */
  workouts(since: Date): Promise<ImportedWorkout[]>;
  /** Writes a Gym Freak activity; returns the platform record id (used to avoid duplicates). */
  writeActivity(activity: ActivityDetail): Promise<string | null>;
}

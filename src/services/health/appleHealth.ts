import { Linking } from 'react-native';
import {
  authorizationStatusFor, AuthorizationStatus, getRequestStatusForAuthorization, AuthorizationRequestStatus, isHealthDataAvailableAsync, queryStatisticsForQuantity,
  queryQuantitySamples, queryWorkoutSamples, requestAuthorization, saveWorkoutSample, WorkoutActivityType,
} from '@kingstinct/react-native-healthkit';
import { ActivityDetail, ActivityType, HealthDaily, ImportedWorkout } from '@/types/domain';
import { HealthAdapter, HealthPermissionState } from './types';

/**
 * Apple Health via HealthKit. Apple Watch data arrives here too (Watch → Health → Gym Freak);
 * the app never talks to the watch directly. Only the types below are requested.
 */
const BUNDLE_ID = 'com.gymfreak.app';
const META_ID = 'GymFreakActivityId';
const STEPS = 'HKQuantityTypeIdentifierStepCount' as const;
const DISTANCE = 'HKQuantityTypeIdentifierDistanceWalkingRunning' as const;
const ENERGY = 'HKQuantityTypeIdentifierActiveEnergyBurned' as const;
const WORKOUT = 'HKWorkoutTypeIdentifier' as const;
const BODY_FAT = 'HKQuantityTypeIdentifierBodyFatPercentage' as const;

const AUTH = { toRead: [STEPS, DISTANCE, ENERGY, WORKOUT], toShare: [WORKOUT, DISTANCE, ENERGY] } as const;

const TO_HK: Record<ActivityType, WorkoutActivityType> = {
  RUNNING: WorkoutActivityType.running,
  WALKING: WorkoutActivityType.walking,
  HIKING: WorkoutActivityType.hiking,
  // HealthKit has no "trekking"; hiking is the closest type.
  TREKKING: WorkoutActivityType.hiking,
  YOGA: WorkoutActivityType.yoga,
};

function fromHK(type: number): ActivityType | null {
  switch (type) {
    case WorkoutActivityType.running: return 'RUNNING';
    case WorkoutActivityType.walking: return 'WALKING';
    case WorkoutActivityType.hiking: return 'HIKING';
    case WorkoutActivityType.yoga: return 'YOGA';
    default: return null;
  }
}

const dayRange = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return { startDate: new Date(y, m - 1, d), endDate: new Date(y, m - 1, d + 1) };
};

async function state(): Promise<HealthPermissionState> {
  const request = await getRequestStatusForAuthorization(AUTH).catch(() => AuthorizationRequestStatus.unknown);
  if (request !== AuthorizationRequestStatus.unnecessary) return { status: 'NOT_CONNECTED', granted: [], readStatusKnown: false };
  const writes = authorizationStatusFor(WORKOUT) === AuthorizationStatus.sharingAuthorized;
  // Reads cannot be inspected on iOS; "asked" is all we know. Writes can, so a denied write = limited.
  return { status: writes ? 'CONNECTED' : 'PERMISSION_LIMITED', granted: ['steps', 'distance', 'active-energy', 'workouts', ...(writes ? ['write-workouts'] : [])], readStatusKnown: false };
}

export const appleHealth: HealthAdapter = {
  provider: 'APPLE_HEALTH',

  bodyFat: {
    async connect() {
      await requestAuthorization({ toRead: [BODY_FAT] });
      return true;
    },
    /** HealthKit's "%" unit is a 0–1 fraction; the server normalises it. `uuid` deduplicates re-imports. */
    async read(since) {
      const samples = await queryQuantitySamples(BODY_FAT, { limit: 500, ascending: false, unit: '%', filter: { date: { startDate: since } } });
      return samples.map((s) => ({ externalId: s.uuid, value: s.quantity, measuredAt: new Date(s.startDate).toISOString(), source: s.sourceRevision?.source?.name ?? null }));
    },
  },

  async availability() {
    return (await isHealthDataAvailableAsync().catch(() => false)) ? 'available' : 'unavailable';
  },

  permissions: state,

  async connect() {
    await requestAuthorization(AUTH);
    return state();
  },

  // iOS offers no API to revoke HealthKit access; Gym Freak stops reading and the user can revoke in Health.
  async revoke() { return false; },

  async managePermissions() {
    // iOS has no deep link into a specific app's Health permissions; the Health app is the closest.
    await Linking.openURL('x-apple-health://').catch(() => Linking.openSettings());
  },

  async daily(days: string[]) {
    const out: HealthDaily[] = [];
    for (const day of days) {
      const filter = { date: dayRange(day) };
      const [steps, distance, energy] = await Promise.all([
        queryStatisticsForQuantity(STEPS, ['cumulativeSum'], { filter, unit: 'count' }).catch(() => null),
        queryStatisticsForQuantity(DISTANCE, ['cumulativeSum'], { filter, unit: 'm' }).catch(() => null),
        queryStatisticsForQuantity(ENERGY, ['cumulativeSum'], { filter, unit: 'kcal' }).catch(() => null),
      ]);
      const value = (r: typeof steps) => (r?.sumQuantity ? r.sumQuantity.quantity : null);
      out.push({ date: day, steps: value(steps) == null ? null : Math.round(value(steps)!), distanceMeters: value(distance) == null ? null : Math.round(value(distance)!), activeCalories: value(energy) == null ? null : Math.round(value(energy)!) });
    }
    return out;
  },

  async workouts(since: Date) {
    const rows = await queryWorkoutSamples({ limit: 200, ascending: false, filter: { date: { startDate: since } } });
    const out: ImportedWorkout[] = [];
    for (const w of rows) {
      const type = fromHK(w.workoutActivityType);
      if (!type) { w.dispose?.(); continue; }
      const source = w.sourceRevision?.source;
      const ownId = typeof w.metadata?.[META_ID] === 'string' ? (w.metadata[META_ID] as string) : null;
      const fromWatch = w.device?.model === 'Watch' || (w.sourceRevision?.productType ?? '').startsWith('Watch');
      out.push({
        externalId: w.uuid,
        type,
        startedAt: w.startDate.toISOString(),
        endedAt: w.endDate.toISOString(),
        durationMs: Math.round((w.duration?.quantity ?? (w.endDate.getTime() - w.startDate.getTime()) / 1000) * 1000),
        distanceMeters: w.totalDistance ? Math.round(w.totalDistance.unit === 'km' ? w.totalDistance.quantity * 1000 : w.totalDistance.unit === 'mi' ? w.totalDistance.quantity * 1609.344 : w.totalDistance.quantity) : null,
        calories: w.totalEnergyBurned ? Math.round(w.totalEnergyBurned.unit === 'kJ' ? w.totalEnergyBurned.quantity / 4.184 : w.totalEnergyBurned.quantity) : null,
        sourceName: fromWatch ? 'Apple Watch' : source?.bundleIdentifier === BUNDLE_ID ? 'Gym Freak' : source?.name ?? null,
        gymFreakActivityId: ownId,
      });
      w.dispose?.();
    }
    return out;
  },

  async writeActivity(activity: ActivityDetail) {
    if (authorizationStatusFor(WORKOUT) !== AuthorizationStatus.sharingAuthorized) return null;
    const start = new Date(activity.startedAt);
    const end = new Date(activity.endedAt);
    const quantities = [
      ...(activity.distanceMeters ? [{ quantityType: DISTANCE, quantity: activity.distanceMeters, unit: 'm', startDate: start, endDate: end }] : []),
      ...(activity.calories ? [{ quantityType: ENERGY, quantity: activity.calories, unit: 'kcal', startDate: start, endDate: end }] : []),
    ];
    const saved = await saveWorkoutSample(
      TO_HK[activity.type], quantities, start, end,
      { distance: activity.distanceMeters ?? undefined, energyBurned: activity.calories ?? undefined },
      // Our id travels with the workout, so reading it back later is recognised as the same session.
      { [META_ID]: activity.id, HKExternalUUID: activity.id },
    );
    return saved?.uuid ?? null;
  },
};

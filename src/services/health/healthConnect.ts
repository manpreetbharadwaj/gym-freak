import {
  aggregateRecord, ExerciseType, revokeAllPermissions, getGrantedPermissions, getSdkStatus, initialize, insertRecords, openHealthConnectSettings, Permission, readRecords, RecordingMethod, requestPermission, SdkAvailabilityStatus,
} from 'react-native-health-connect';
import { Linking } from 'react-native';
import { ActivityDetail, ActivityType, HealthDaily, ImportedWorkout } from '@/types/domain';
import { HealthAdapter, HealthAvailability, HealthPermissionState } from './types';

/**
 * Android Health Connect (not the deprecated Google Fit APIs). Wearables that sync into Health
 * Connect (Galaxy Watch via Samsung Health, Fitbit, Pixel Watch, …) show up here.
 */
const PACKAGE = 'com.gymfreak.app';

const READ: Permission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
];
const WRITE: Permission[] = [
  { accessType: 'write', recordType: 'ExerciseSession' },
  { accessType: 'write', recordType: 'Distance' },
  { accessType: 'write', recordType: 'ActiveCaloriesBurned' },
];

const TO_HC: Record<ActivityType, number> = {
  RUNNING: ExerciseType.RUNNING,
  WALKING: ExerciseType.WALKING,
  HIKING: ExerciseType.HIKING,
  TREKKING: ExerciseType.HIKING,
  YOGA: ExerciseType.YOGA,
};

function fromHC(type: number): ActivityType | null {
  if (type === ExerciseType.RUNNING || type === ExerciseType.RUNNING_TREADMILL) return 'RUNNING';
  if (type === ExerciseType.WALKING) return 'WALKING';
  if (type === ExerciseType.HIKING) return 'HIKING';
  if (type === ExerciseType.YOGA) return 'YOGA';
  return null;
}

let ready: Promise<boolean> | null = null;
const init = () => (ready ??= initialize().catch(() => false));

const LABEL: Record<string, string> = { Steps: 'steps', Distance: 'distance', ExerciseSession: 'workouts', ActiveCaloriesBurned: 'active-energy' };

async function state(): Promise<HealthPermissionState> {
  if (!(await init())) return { status: 'NOT_CONNECTED', granted: [], readStatusKnown: true };
  const granted = (await getGrantedPermissions().catch(() => [])) as Permission[];
  const has = (p: Permission) => granted.some((g) => g.accessType === p.accessType && g.recordType === p.recordType);
  const reads = READ.filter(has);
  const writes = WRITE.filter(has);
  const labels = [...reads.map((p) => LABEL[p.recordType]), ...(writes.some((p) => p.recordType === 'ExerciseSession') ? ['write-workouts'] : [])];
  if (!reads.length) return { status: 'NOT_CONNECTED', granted: labels, readStatusKnown: true };
  return { status: reads.length === READ.length ? 'CONNECTED' : 'PERMISSION_LIMITED', granted: labels, readStatusKnown: true };
}

const dayRange = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return { operator: 'between' as const, startTime: new Date(y, m - 1, d).toISOString(), endTime: new Date(y, m - 1, d + 1).toISOString() };
};

export const healthConnect: HealthAdapter = {
  provider: 'HEALTH_CONNECT',

  bodyFat: {
    async connect() {
      if (!(await init())) return false;
      const granted = await requestPermission([{ accessType: 'read', recordType: 'BodyFat' }]);
      return granted.some((p) => p.recordType === 'BodyFat' && p.accessType === 'read');
    },
    async read(since) {
      if (!(await init())) return [];
      const { records } = await readRecords('BodyFat', { timeRangeFilter: { operator: 'after', startTime: since.toISOString() }, pageSize: 500 });
      return records.flatMap((r) => (r.metadata?.id ? [{ externalId: r.metadata.id, value: r.percentage, measuredAt: r.time, source: r.metadata.dataOrigin ?? null }] : []));
    },
  },

  async availability(): Promise<HealthAvailability> {
    const status = await getSdkStatus().catch(() => SdkAvailabilityStatus.SDK_UNAVAILABLE);
    if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs-update';
    return 'needs-install';
  },

  permissions: state,

  async connect() {
    if (!(await init())) return state();
    await requestPermission([...READ, ...WRITE]);
    return state();
  },

  async revoke() {
    if (!(await init())) return false;
    await revokeAllPermissions().catch(() => undefined);
    return true;
  },

  async managePermissions() {
    try { openHealthConnectSettings(); } catch { await Linking.openSettings(); }
  },

  async daily(days: string[]) {
    if (!(await init())) return [];
    const granted = (await state()).granted;
    const out: HealthDaily[] = [];
    for (const day of days) {
      const timeRangeFilter = dayRange(day);
      const [steps, distance, energy] = await Promise.all([
        granted.includes('steps') ? aggregateRecord({ recordType: 'Steps', timeRangeFilter }).catch(() => null) : null,
        granted.includes('distance') ? aggregateRecord({ recordType: 'Distance', timeRangeFilter }).catch(() => null) : null,
        granted.includes('active-energy') ? aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter }).catch(() => null) : null,
      ]);
      out.push({
        date: day,
        steps: steps && steps.dataOrigins.length ? Math.round(steps.COUNT_TOTAL) : null,
        distanceMeters: distance && distance.dataOrigins.length ? Math.round(distance.DISTANCE.inMeters) : null,
        activeCalories: energy && energy.dataOrigins.length ? Math.round(energy.ACTIVE_CALORIES_TOTAL.inKilocalories) : null,
      });
    }
    return out;
  },

  async workouts(since: Date) {
    if (!(await init())) return [];
    const timeRangeFilter = { operator: 'after' as const, startTime: since.toISOString() };
    const { records } = await readRecords('ExerciseSession', { timeRangeFilter, pageSize: 200 });
    const out: ImportedWorkout[] = [];
    for (const r of records) {
      const type = fromHC(r.exerciseType);
      if (!type || !r.metadata?.id) continue;
      const range = { operator: 'between' as const, startTime: r.startTime, endTime: r.endTime };
      const origin = r.metadata.dataOrigin ? [r.metadata.dataOrigin] : undefined;
      // Distance/energy for the session come from records of the same app in the same time window.
      const [distance, energy] = await Promise.all([
        aggregateRecord({ recordType: 'Distance', timeRangeFilter: range, dataOriginFilter: origin }).catch(() => null),
        aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: range, dataOriginFilter: origin }).catch(() => null),
      ]);
      const own = r.metadata.dataOrigin === PACKAGE;
      const device = r.metadata.device;
      out.push({
        externalId: r.metadata.id,
        type,
        startedAt: r.startTime,
        endedAt: r.endTime,
        durationMs: new Date(r.endTime).getTime() - new Date(r.startTime).getTime(),
        distanceMeters: type !== 'YOGA' && distance && distance.dataOrigins.length ? Math.round(distance.DISTANCE.inMeters) : null,
        calories: energy && energy.dataOrigins.length ? Math.round(energy.ACTIVE_CALORIES_TOTAL.inKilocalories) : null,
        sourceName: own ? 'Gym Freak' : device?.model ? [device.manufacturer, device.model].filter(Boolean).join(' ') : r.metadata.dataOrigin ?? null,
        gymFreakActivityId: own ? r.metadata.clientRecordId ?? null : null,
      });
    }
    return out;
  },

  async writeActivity(activity: ActivityDetail) {
    if (!(await init())) return null;
    const granted = (await state()).granted;
    if (!granted.includes('write-workouts')) return null;
    const startTime = activity.startedAt;
    const endTime = activity.endedAt;
    const metadata = (suffix: string) => ({ clientRecordId: `${activity.id}${suffix}`, clientRecordVersion: 1, recordingMethod: RecordingMethod.RECORDING_METHOD_ACTIVELY_RECORDED });
    // clientRecordId = our activity id: Health Connect upserts on it, so a retry never writes a second session.
    const [id] = await insertRecords([{ recordType: 'ExerciseSession', exerciseType: TO_HC[activity.type], startTime, endTime, title: undefined, metadata: metadata('') }]);
    if (activity.distanceMeters) await insertRecords([{ recordType: 'Distance', startTime, endTime, distance: { value: activity.distanceMeters, unit: 'meters' }, metadata: metadata(':distance') }]).catch(() => undefined);
    if (activity.calories) await insertRecords([{ recordType: 'ActiveCaloriesBurned', startTime, endTime, energy: { value: activity.calories, unit: 'kilocalories' }, metadata: metadata(':energy') }]).catch(() => undefined);
    return id ?? null;
  },
};

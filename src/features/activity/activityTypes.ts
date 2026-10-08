/**
 * Activity catalog. Adding Cycling / Indoor Run / Swimming / Rowing later means adding an entry here
 * (plus the matching backend enum value and the HealthKit / Health Connect mapping) — the tracker,
 * history, progress and import code are all driven by this table.
 */
import type { ActivityType } from '../../types/domain';

export type { ActivitySource, ActivityType } from '../../types/domain';

export interface ActivityTypeInfo {
  type: ActivityType;
  /** Uses GPS route tracking (distance, pace, splits, map). */
  gps: boolean;
  /** MaterialCommunityIcons name. */
  icon: string;
  color: string;
  tint: string;
  /** Fastest plausible speed (m/s) — faster jumps between fixes are treated as GPS errors. */
  maxSpeed: number;
  /** Below this window speed (m/s) for long enough, auto-pause kicks in. */
  stopSpeed: number;
  /** Compendium MET for non-GPS sessions (and the floor for rough terrain). */
  met: number;
}

export const ACTIVITY_TYPES: Record<ActivityType, ActivityTypeInfo> = {
  RUNNING: { type: 'RUNNING', gps: true, icon: 'run-fast', color: '#22B8F5', tint: 'rgba(34,184,245,0.14)', maxSpeed: 11, stopSpeed: 0.7, met: 9.8 },
  WALKING: { type: 'WALKING', gps: true, icon: 'walk', color: '#2DD4BF', tint: 'rgba(45,212,191,0.14)', maxSpeed: 4.5, stopSpeed: 0.35, met: 3.5 },
  HIKING: { type: 'HIKING', gps: true, icon: 'hiking', color: '#5B8CFF', tint: 'rgba(91,140,255,0.16)', maxSpeed: 4.5, stopSpeed: 0.3, met: 6.0 },
  TREKKING: { type: 'TREKKING', gps: true, icon: 'image-filter-hdr', color: '#8BE04E', tint: 'rgba(139,224,78,0.14)', maxSpeed: 4.5, stopSpeed: 0.3, met: 7.0 },
  YOGA: { type: 'YOGA', gps: false, icon: 'meditation', color: '#FF7AB8', tint: 'rgba(255,122,184,0.14)', maxSpeed: 0, stopSpeed: 0, met: 2.5 },
};

export const ACTIVITY_ORDER: ActivityType[] = ['RUNNING', 'WALKING', 'HIKING', 'TREKKING', 'YOGA'];
export const isGpsActivity = (type: ActivityType) => ACTIVITY_TYPES[type].gps;
export const isActivityType = (value: unknown): value is ActivityType => typeof value === 'string' && value in ACTIVITY_TYPES;

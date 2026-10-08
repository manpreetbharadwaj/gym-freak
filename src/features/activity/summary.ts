import type { Activity, HealthDaily } from '../../types/domain';

/**
 * Today's dashboard numbers. Sources are never added together:
 *  - Steps: the health platform only (Gym Freak does not count steps itself) — null when not connected.
 *  - Distance / active calories: the platform's de-duplicated daily total when connected (it already
 *    includes a run the phone or watch measured); otherwise the sum of today's Gym Freak activities.
 *  - Active time: today's activities (already de-duplicated on the server).
 */
export interface TodaySummary {
  steps: number | null;
  distanceMeters: number | null;
  distanceSource: 'health' | 'activities' | null;
  activeCalories: number | null;
  caloriesSource: 'health' | 'activities' | null;
  caloriesEstimated: boolean;
  activeMinutes: number;
}

export function todaySummary(health: HealthDaily | null | undefined, todays: Activity[]): TodaySummary {
  const actDistance = todays.reduce((t, a) => t + (a.distanceMeters ?? 0), 0);
  const withCalories = todays.filter((a) => a.calories != null);
  const actCalories = withCalories.reduce((t, a) => t + (a.calories ?? 0), 0);
  const healthDistance = health?.distanceMeters ?? null;
  const healthCalories = health?.activeCalories ?? null;
  return {
    steps: health?.steps ?? null,
    distanceMeters: healthDistance ?? (todays.length ? actDistance : null),
    distanceSource: healthDistance != null ? 'health' : todays.length ? 'activities' : null,
    activeCalories: healthCalories ?? (withCalories.length ? actCalories : null),
    caloriesSource: healthCalories != null ? 'health' : withCalories.length ? 'activities' : null,
    caloriesEstimated: healthCalories == null && withCalories.some((a) => a.caloriesEstimated),
    activeMinutes: Math.round(todays.reduce((t, a) => t + a.activeDurationMs, 0) / 60000),
  };
}

/** "Morning Run", "Evening Yoga", … from the local start hour. */
export function timeOfDay(iso: string): 'titleMorning' | 'titleAfternoon' | 'titleEvening' | 'titleNight' {
  const h = new Date(iso).getHours();
  if (h >= 5 && h < 12) return 'titleMorning';
  if (h >= 12 && h < 17) return 'titleAfternoon';
  if (h >= 17 && h < 21) return 'titleEvening';
  return 'titleNight';
}

/** Local-day check for "today" lists (device time zone). */
export const isSameLocalDay = (iso: string, now = new Date()) => {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

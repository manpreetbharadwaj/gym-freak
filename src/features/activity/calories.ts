import { ACTIVITY_TYPES, ActivityType, isGpsActivity } from './activityTypes';

/**
 * Estimated ACTIVE calories (energy above resting) for activities Gym Freak records.
 *
 * GPS activities use the ACSM metabolic equations, which depend on speed, slope and body weight
 * (so a fast 5 km burns differently from a slow one — never a fixed number per km):
 *   walking VO2 = 0.1·v + 1.8·v·grade   (ml/kg/min, v in m/min, above resting 3.5)
 *   running VO2 = 0.2·v + 0.9·v·grade
 * Hiking/trekking add a terrain factor and never drop below their Compendium MET.
 * Non-GPS sessions (yoga) use (MET − 1) × kg × hours.
 * 1 L O2 ≈ 5 kcal. Labelled "Estimated" everywhere; not a medical-grade measurement.
 */

/** Used only when the profile has no weight; the result is still labelled estimated. */
export const DEFAULT_WEIGHT_KG = 70;

export interface CalorieInput {
  type: ActivityType;
  activeMs: number;
  distanceMeters?: number | null;
  elevationGainM?: number | null;
  weightKg?: number | null;
}

export function estimateActiveCalories({ type, activeMs, distanceMeters, elevationGainM, weightKg }: CalorieInput): number {
  const kg = weightKg && weightKg > 20 && weightKg < 400 ? weightKg : DEFAULT_WEIGHT_KG;
  const minutes = activeMs / 60000;
  if (minutes <= 0) return 0;
  const info = ACTIVITY_TYPES[type];
  const metKcal = (met: number) => Math.max(0, met - 1) * kg * (minutes / 60);
  if (!isGpsActivity(type) || !distanceMeters) return Math.round(metKcal(info.met));

  const v = distanceMeters / minutes; // m/min
  const grade = elevationGainM && distanceMeters > 0 ? Math.min(0.3, elevationGainM / distanceMeters) : 0;
  // ACSM: running equation above ~8 km/h (134 m/min), walking below.
  const running = type === 'RUNNING' ? v > 110 : v > 134;
  const netVo2 = running ? 0.2 * v + 0.9 * v * grade : 0.1 * v + 1.8 * v * grade;
  let kcal = (netVo2 * kg * minutes / 1000) * 5;
  if (type === 'HIKING' || type === 'TREKKING') kcal = Math.max(kcal * 1.15, metKcal(info.met));
  return Math.round(kcal);
}

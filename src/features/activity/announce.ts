import { METERS_PER_KM, METERS_PER_MILE, pacePerKmToPacePerMile, UnitSystem } from '../../utils/units';

/**
 * Builds the voice coach sentences from translated templates. Numbers are spoken with words for
 * units ("6 minutes 12 seconds", "2 kilometers"), never "6:12 /km", so text-to-speech reads them
 * naturally in every language. No prerecorded audio.
 */

export interface VoiceCopy {
  started: string;
  completed: string; // "You've completed {distance}."
  time: string; // "Time: {time}."
  pace: string; // "Average pace: {pace} per {unit}."
  calories: string; // "Estimated calories burned: {kcal}."
  kmOne: string; kmMany: string; miOne: string; miMany: string;
  kmUnit: string; miUnit: string;
  hourOne: string; hourMany: string; minuteOne: string; minuteMany: string; secondOne: string; secondMany: string;
}

export interface VoiceMetrics { distance: boolean; duration: boolean; pace: boolean; calories: boolean }

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ''));
const plural = (n: number, one: string, many: string) => fill(n === 1 ? one : many, { n });

/** "1 hour 2 minutes", "6 minutes 12 seconds", "45 seconds". */
export function spokenDuration(totalSeconds: number, copy: VoiceCopy) {
  const t = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const parts: string[] = [];
  if (h) parts.push(plural(h, copy.hourOne, copy.hourMany));
  if (m) parts.push(plural(m, copy.minuteOne, copy.minuteMany));
  if (s && !h) parts.push(plural(s, copy.secondOne, copy.secondMany));
  return parts.length ? parts.join(' ') : plural(0, copy.secondOne, copy.secondMany);
}

/** "1 kilometer", "2.5 kilometers", "1 mile". Trailing zeros dropped. */
export function spokenDistance(meters: number, system: UnitSystem, copy: VoiceCopy) {
  const unit = system === 'imperial' ? METERS_PER_MILE : METERS_PER_KM;
  const n = Math.round((meters / unit) * 10) / 10;
  return system === 'imperial' ? plural(n, copy.miOne, copy.miMany) : plural(n, copy.kmOne, copy.kmMany);
}

export function milestoneAnnouncement(input: { meters: number; activeMs: number; calories: number; system: UnitSystem; metrics: VoiceMetrics }, copy: VoiceCopy) {
  const { meters, activeMs, calories, system, metrics } = input;
  const seconds = activeMs / 1000;
  const parts: string[] = [];
  if (metrics.distance) parts.push(fill(copy.completed, { distance: spokenDistance(meters, system, copy) }));
  if (metrics.duration) parts.push(fill(copy.time, { time: spokenDuration(seconds, copy) }));
  if (metrics.pace && meters > 0) {
    const perKm = seconds / (meters / METERS_PER_KM);
    const pace = system === 'imperial' ? pacePerKmToPacePerMile(perKm) : perKm;
    parts.push(fill(copy.pace, { pace: spokenDuration(pace, copy), unit: system === 'imperial' ? copy.miUnit : copy.kmUnit }));
  }
  if (metrics.calories && calories > 0) parts.push(fill(copy.calories, { kcal: Math.round(calories) }));
  return parts.join(' ');
}

/** Interval choices offered per unit system, in meters. */
export const MILESTONE_OPTIONS: Record<UnitSystem, number[]> = {
  metric: [500, 1000, 2000],
  imperial: [METERS_PER_MILE / 2, METERS_PER_MILE],
};

/** Keeps the chosen interval meaningful after a unit switch (1 km ↔ 1 mi, 0.5 km ↔ 0.5 mi). */
export function milestoneFor(system: UnitSystem, stepUnits: number) {
  const unit = system === 'imperial' ? METERS_PER_MILE : METERS_PER_KM;
  const options = MILESTONE_OPTIONS[system];
  const wanted = stepUnits * unit;
  return options.reduce((best, o) => (Math.abs(o - wanted) < Math.abs(best - wanted) ? o : best), options[0]);
}

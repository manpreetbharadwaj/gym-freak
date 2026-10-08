/**
 * One place for every unit conversion and unit-aware format in the app.
 *
 * Canonical storage never changes: distance in meters, height in centimeters, weight in kilograms,
 * pace in seconds per kilometer, speed in meters per second, elevation in meters. A unit system is a
 * display preference only — values are converted on the way to the screen (or the voice coach) and
 * converted back exactly once when the user edits a value in imperial.
 */

export type UnitPreference = 'auto' | 'metric' | 'imperial';
export type UnitSystem = 'metric' | 'imperial';

export const METERS_PER_KM = 1000;
export const METERS_PER_MILE = 1609.344;
export const CM_PER_INCH = 2.54;
export const LB_PER_KG = 2.2046226218;
export const FEET_PER_METER = 3.280839895;

/** Regions that use imperial distance/weight/height day to day (not inferred from language). */
const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM']);

/** Resolves "auto" from the device's region / measurement system; an explicit choice always wins. */
export function resolveUnitSystem(preference: UnitPreference | string | undefined, locale?: { measurementSystem?: string | null; regionCode?: string | null }): UnitSystem {
  if (preference === 'metric' || preference === 'imperial') return preference;
  if (locale?.measurementSystem === 'us') return 'imperial';
  if (locale?.regionCode && IMPERIAL_REGIONS.has(locale.regionCode.toUpperCase())) return 'imperial';
  return 'metric';
}

/* ───────── Conversions (pure, no rounding unless the name says so) ───────── */

export const metersToKm = (m: number) => m / METERS_PER_KM;
export const metersToMiles = (m: number) => m / METERS_PER_MILE;
export const milesToMeters = (mi: number) => mi * METERS_PER_MILE;
export const kgToLb = (kg: number) => kg * LB_PER_KG;
export const lbToKg = (lb: number) => lb / LB_PER_KG;
export const metersToFeet = (m: number) => m * FEET_PER_METER;
/** Seconds per km → seconds per mile. */
export const pacePerKmToPacePerMile = (secPerKm: number) => secPerKm * (METERS_PER_MILE / METERS_PER_KM);

/** Height in cm → whole feet + whole inches (inches rounded, 12" carried into feet). */
export function cmToFeetInches(cm: number) {
  let totalInches = Math.round(cm / CM_PER_INCH);
  const feet = Math.floor(totalInches / 12);
  totalInches -= feet * 12;
  return { feet, inches: totalInches };
}

/** Feet + inches → cm, rounded to 0.1 cm (the stored precision). */
export const feetInchesToCm = (feet: number, inches: number) => Math.round((feet * 12 + inches) * CM_PER_INCH * 10) / 10;

/** Pounds → kg rounded to 0.01 kg (the stored precision), used only when the user edits in pounds. */
export const lbToKgStored = (lb: number) => Math.round(lbToKg(lb) * 100) / 100;

/** Length of one distance unit in meters (km or mile). */
export const unitMeters = (system: UnitSystem) => (system === 'imperial' ? METERS_PER_MILE : METERS_PER_KM);

/* ───────── Display ───────── */

export const distanceUnit = (system: UnitSystem) => (system === 'imperial' ? 'mi' : 'km');
export const paceUnit = (system: UnitSystem) => (system === 'imperial' ? '/mi' : '/km');

export function distanceValue(meters: number, system: UnitSystem, decimals = 2) {
  const v = system === 'imperial' ? metersToMiles(meters) : metersToKm(meters);
  return v.toFixed(decimals);
}

/** "5.00 km" / "3.11 mi". */
export const formatDistance = (meters: number, system: UnitSystem, decimals = 2) => `${distanceValue(meters, system, decimals)} ${distanceUnit(system)}`;

/** m:ss (or h:mm:ss for very slow paces); "--:--" when there is no meaningful pace yet. */
export function paceValue(secPerKm: number | null | undefined, system: UnitSystem) {
  if (!secPerKm || !Number.isFinite(secPerKm) || secPerKm <= 0 || secPerKm > 3600 * 2) return '--:--';
  const s = Math.round(system === 'imperial' ? pacePerKmToPacePerMile(secPerKm) : secPerKm);
  return clock(s, false);
}

/** "6:10 /km" / "9:56 /mi". */
export const formatPace = (secPerKm: number | null | undefined, system: UnitSystem) => `${paceValue(secPerKm, system)} ${paceUnit(system)}`;

/** Average pace (sec/km) from canonical distance + duration; null when too little distance. */
export const paceSecPerKm = (meters: number, activeMs: number) => (meters >= 20 && activeMs > 0 ? (activeMs / 1000) / (meters / METERS_PER_KM) : null);

export function formatSpeed(mps: number, system: UnitSystem) {
  return system === 'imperial' ? `${(mps * 3600 / METERS_PER_MILE).toFixed(1)} mph` : `${(mps * 3.6).toFixed(1)} km/h`;
}

export function formatElevation(meters: number, system: UnitSystem) {
  return system === 'imperial' ? `${Math.round(metersToFeet(meters))} ft` : `${Math.round(meters)} m`;
}

/** "173 cm" / "5 ft 8 in". */
export function formatHeight(cm: number | null | undefined, system: UnitSystem, compact = false) {
  if (!cm) return '—';
  if (system === 'metric') return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return compact ? `${feet}'${inches}"` : `${feet} ft ${inches} in`;
}

/** "70.0 kg" / "154 lb". */
export function formatWeight(kg: number | null | undefined, system: UnitSystem) {
  if (!kg) return '—';
  return system === 'imperial' ? `${Math.round(kgToLb(kg))} lb` : `${(Math.round(kg * 10) / 10).toFixed(1)} kg`;
}

/** 0:42, 6:05, 1:02:09 (always h:mm:ss when `hours` is true). */
export function clock(totalSeconds: number, hours = false) {
  const t = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const ss = String(s).padStart(2, '0');
  if (h > 0 || hours) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${ss}`;
  return `${m}:${ss}`;
}

/** "4h 42m" / "58 min". */
export function formatMinutes(minutes: number) {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

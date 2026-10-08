import { addDays, dayKey, parseDay } from './dates';

/** Pure hydration maths and reminder planning (no React / native imports, so it is unit-tested). */

export const QUICK_ADD_ML = [150, 250, 500] as const;
export const GOAL_PRESETS_ML = [2000, 2500, 3000] as const;
export const REMINDER_INTERVALS_MIN = [60, 90, 120, 180] as const;
export const MIN_GOAL_ML = 500;
export const MAX_GOAL_ML = 6000;
export const MAX_ENTRY_ML = 2000;
export const DAY_MAX_ML = 10000;
/** iOS keeps at most 64 pending local notifications per app; leave room for workout / rest alerts. */
export const REMINDER_BUDGET = 48;
const REMINDER_DAYS_AHEAD = 3;

export interface WaterReminder { enabled: boolean; startMin: number; endMin: number; intervalMin: number }
export const DEFAULT_REMINDER: WaterReminder = { enabled: false, startMin: 8 * 60, endMin: 22 * 60, intervalMin: 120 };

/** Suggested daily goal: ~33 ml per kg body weight, 2.0–4.0 L; 2.5 L when weight is unknown. Not medical advice. */
export function suggestedGoalMl(weightKg?: number) {
  if (!weightKg) return 2500;
  return Math.min(4000, Math.max(2000, Math.round((weightKg * 33) / 100) * 100));
}

export const clampGoal = (ml: number) => Math.round(Math.min(MAX_GOAL_ML, Math.max(MIN_GOAL_ML, ml)) / 50) * 50;
export const clampEntry = (ml: number) => Math.round(Math.min(MAX_ENTRY_ML, Math.max(1, ml)));
/** 2500 → "2.5", 2000 → "2.0", 1850 → "1.85" (ml stays the unit everywhere else). */
export const litres = (ml: number) => { const s = (ml / 1000).toFixed(2); return s.endsWith('0') ? s.slice(0, -1) : s; };
export const percent = (ml: number, goalMl: number) => (goalMl > 0 ? Math.round((ml / goalMl) * 100) : 0);

export interface WaterDay { day: string; ml: number; goalMl: number; percent: number }

/** Last `days` calendar days, newest first; days without a log show 0 against that day’s (or today’s) goal. */
export function recentDays(log: Record<string, number>, goals: Record<string, number>, todayGoal: number, now: Date, days = 7): WaterDay[] {
  return Array.from({ length: days }, (_, i) => {
    const day = dayKey(addDays(now, -i));
    const ml = log[day] ?? 0;
    const goalMl = goals[day] ?? todayGoal;
    return { day, ml, goalMl, percent: percent(ml, goalMl) };
  });
}

/** Drops log/goal entries older than `keepDays` so local storage stays small. */
export function prune<T>(map: Record<string, T>, now: Date, keepDays = 30): Record<string, T> {
  const oldest = dayKey(addDays(now, -(keepDays - 1)));
  return Object.fromEntries(Object.entries(map).filter(([day]) => day >= oldest));
}

/**
 * When the next water reminders should fire: every `intervalMin` from start to end (inclusive) on
 * today and the next few days, skipping times already past and the rest of today once the goal is
 * met (it resumes tomorrow). Capped at REMINDER_BUDGET. The app re-plans on every launch / change.
 */
export function reminderSlots(reminder: WaterReminder, todayMl: number, goalMl: number, now: Date, budget = REMINDER_BUDGET): Date[] {
  if (!reminder.enabled || reminder.intervalMin <= 0 || reminder.endMin < reminder.startMin) return [];
  const slots: Date[] = [];
  for (let d = 0; d <= REMINDER_DAYS_AHEAD && slots.length < budget; d++) {
    if (d === 0 && todayMl >= goalMl) continue;
    const base = parseDay(dayKey(addDays(now, d)));
    for (let m = reminder.startMin; m <= reminder.endMin && slots.length < budget; m += reminder.intervalMin) {
      const at = new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.floor(m / 60), m % 60);
      if (at.getTime() > now.getTime() + 60_000) slots.push(at);
    }
  }
  return slots;
}

/** `HH:MM` → minutes after midnight; display uses the device locale instead. */
export const minutesOf = (hours: number, minutes = 0) => hours * 60 + minutes;
export const timeOf = (min: number) => new Date(2026, 0, 1, Math.floor(min / 60), min % 60);

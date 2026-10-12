import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { addDays, dayKey } from '@/utils/dates';
import { clampEntry, clampGoal, DAY_MAX_ML, DEFAULT_REMINDER, prune, recentDays, suggestedGoalMl, WaterReminder } from '@/utils/water';
import { safeStorage } from './safeStorage';
import { playWaterAddedSound } from '@/services/sounds';
import { haptics } from '@/utils/haptics';

/**
 * Water intake is tracked on this device only: HealthyMe has no hydration API, so nothing here is
 * sent to the server. One shared store backs the Home card, the Water screen and the reminders.
 *
 * Keys (namespaced `gymfreak.`):
 *  - waterLog            Record<YYYY-MM-DD, ml>    daily totals (kept 30 days)
 *  - waterGoals          Record<YYYY-MM-DD, ml>    goal in force on each day, for history %
 *  - waterEntries        { day, items: Entry[] }   today’s individual drinks (for Undo)
 *  - waterGoalMl         number | null             chosen daily goal (null = suggested from weight)
 *  - waterReminders      boolean                   reminders on/off (existing key)
 *  - waterReminderTimes  { startMin, endMin, intervalMin }
 * “Today” is the device’s local date, so intake resets at local midnight while history is kept.
 */
export const GLASS_ML = 250;
export { suggestedGoalMl as waterGoalMl } from '@/utils/water';

export interface WaterEntry { id: string; ml: number; at: number }
interface WaterState {
  loaded: boolean;
  log: Record<string, number>;
  goals: Record<string, number>;
  entries: { day: string; items: WaterEntry[] };
  goalMl: number | null;
  reminder: WaterReminder;
}

let state: WaterState = { loaded: false, log: {}, goals: {}, entries: { day: '', items: [] }, goalMl: null, reminder: DEFAULT_REMINDER };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

let loading: Promise<void> | null = null;
function load() {
  loading ??= (async () => {
    const [log, goals, entries, goalMl, enabled, times] = await Promise.all([
      safeStorage.get<Record<string, number>>('waterLog', {}),
      safeStorage.get<Record<string, number>>('waterGoals', {}),
      safeStorage.get<WaterState['entries']>('waterEntries', { day: '', items: [] }),
      safeStorage.get<number | null>('waterGoalMl', null),
      safeStorage.get<boolean>('waterReminders', false),
      safeStorage.get<Omit<WaterReminder, 'enabled'> | null>('waterReminderTimes', null),
    ]);
    state = { loaded: true, log, goals, entries, goalMl, reminder: { ...DEFAULT_REMINDER, ...times, enabled } };
    emit();
  })().catch(() => { state = { ...state, loaded: true }; emit(); });
  return loading;
}

/** Applies the change in memory at once; resolves true once every write reached disk (false if any failed). */
function update(next: Partial<WaterState>, persist: Array<keyof WaterState>): Promise<boolean> {
  state = { ...state, ...next };
  emit();
  const writes: Promise<void>[] = [];
  for (const key of persist) {
    if (key === 'log') writes.push(safeStorage.set('waterLog', state.log));
    if (key === 'goals') writes.push(safeStorage.set('waterGoals', state.goals));
    if (key === 'entries') writes.push(safeStorage.set('waterEntries', state.entries));
    if (key === 'goalMl') writes.push(safeStorage.set('waterGoalMl', state.goalMl));
    if (key === 'reminder') {
      const { enabled, ...times } = state.reminder;
      writes.push(safeStorage.set('waterReminders', enabled), safeStorage.set('waterReminderTimes', times));
    }
  }
  return Promise.all(writes).then(() => true, () => false);
}

const todayItems = (today: string) => (state.entries.day === today ? state.entries.items : []);

/** Re-renders when the local date changes (midnight, or the app returning after a day). */
function useToday() {
  const [today, setToday] = useState(() => dayKey(new Date()));
  useEffect(() => {
    const refresh = () => setToday(dayKey(new Date()));
    const now = new Date();
    const midnight = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1).getTime() - now.getTime();
    const timer = setTimeout(refresh, midnight + 1000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => { clearTimeout(timer); sub.remove(); };
  }, [today]);
  return today;
}

export function useWater(weightKg?: number) {
  const s = useSyncExternalStore(subscribe, () => state);
  useEffect(() => { load(); }, []);
  const today = useToday();
  const goalMl = s.goalMl ?? suggestedGoalMl(weightKg);
  const ml = s.log[today] ?? 0;
  const items = s.entries.day === today ? s.entries.items : [];

  const add = (amount: number) => {
    const now = new Date();
    const day = dayKey(now);
    const value = clampEntry(amount);
    const total = Math.min(DAY_MAX_ML, (state.log[day] ?? 0) + value);
    const entry: WaterEntry = { id: `${now.getTime()}`, ml: total - (state.log[day] ?? 0), at: now.getTime() };
    if (entry.ml <= 0) return;
    // The one place every manual addition passes through (Home card, Water screen quick-add and custom amount):
    // the water-added sound and success haptic play once the entry is saved, never on a refused (daily cap) or failed write.
    update({
      log: prune({ ...state.log, [day]: total }, now),
      goals: prune({ ...state.goals, [day]: goalMl }, now),
      entries: { day, items: [...todayItems(day), entry].slice(-50) },
    }, ['log', 'goals', 'entries']).then((saved) => { if (saved) { haptics.success(); playWaterAddedSound(); } });
  };
  /** Removes today’s most recent drink. */
  const undo = () => {
    const day = dayKey(new Date());
    const list = todayItems(day);
    const last = list[list.length - 1];
    if (!last) return;
    update({ log: { ...state.log, [day]: Math.max(0, (state.log[day] ?? 0) - last.ml) }, entries: { day, items: list.slice(0, -1) } }, ['log', 'entries']);
  };
  const setGoal = (value: number | null) => {
    const day = dayKey(new Date());
    const next = value === null ? null : clampGoal(value);
    update({ goalMl: next, goals: { ...state.goals, [day]: next ?? suggestedGoalMl(weightKg) } }, ['goalMl', 'goals']);
  };
  const setReminder = (patch: Partial<WaterReminder>) => update({ reminder: { ...state.reminder, ...patch } }, ['reminder']);

  return {
    loaded: s.loaded, today, ml, goalMl, customGoal: s.goalMl !== null, entries: items, lastEntry: items[items.length - 1],
    history: recentDays(s.log, s.goals, goalMl, new Date(), 7), reminder: s.reminder,
    add, undo, setGoal, setReminder,
  };
}

/** Back-compat for the Home card: add / remove one glass (remove = undo the latest drink). */
export function useWaterToday(weightKg?: number) {
  const water = useWater(weightKg);
  return { ml: water.ml, goalMl: water.goalMl, add: () => water.add(GLASS_ML), remove: water.undo };
}

/** Reminders on/off, shared with the Water screen. */
export function useWaterReminderSetting() {
  const water = useWater();
  return [water.reminder.enabled, (enabled: boolean) => water.setReminder({ enabled })] as const;
}

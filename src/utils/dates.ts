/** Local-calendar date helpers. All keys are `YYYY-MM-DD` in the device time zone. */

export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses a `YYYY-MM-DD` key as a local date (Date.parse would treat it as UTC). */
export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday 00:00 of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return addDays(start, -((start.getDay() + 6) % 7));
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Spreads N training days across the week with recovery gaps (Mon-first indexes). */
export const weeklySchedule: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  return `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, '0')}m`;
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

/** "today 18:05", "yesterday 07:30" or a short date, in the app language. */
export function formatRelativeDay(iso: string, locale: string, now = new Date()): string {
  const date = new Date(iso);
  const days = Math.round((parseDay(dayKey(now)).getTime() - parseDay(dayKey(date)).getTime()) / 86_400_000);
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (days <= 1) {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    return `${rtf.format(-days, 'day')} ${time}`;
  }
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

/** YYYY-MM-DD (local date) → ISO at local noon, so the day never shifts across time zones. Null if invalid or in the future. */
export function dateInput(value: string, now = Date.now()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  if (Number.isNaN(date.getTime()) || date.getMonth() !== Number(m[2]) - 1 || date.getTime() > now + 86_400_000) return null;
  return date.toISOString();
}

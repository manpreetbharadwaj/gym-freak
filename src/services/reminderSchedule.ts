import type { PersonalReminder } from '@/types/domain';

/** Produces concrete local-time occurrences so DST changes follow the device calendar. */
export function nextReminderOccurrences(reminder: PersonalReminder, limit = 32, now = new Date()) {
  const first = new Date(reminder.scheduledAt);
  const end = reminder.endAt ? new Date(reminder.endAt) : new Date(now.getTime() + 366 * 86400_000);
  const out: Date[] = [];
  const add = (date: Date) => { if (date > now && date <= end && out.length < limit) out.push(new Date(date)); };
  if (reminder.repeatType === 'ONCE') { add(first); return out; }
  const cursor = new Date(first);
  const advance = () => {
    if (reminder.repeatType === 'DAILY' || reminder.repeatType === 'WEEKDAYS') cursor.setDate(cursor.getDate() + 1);
    else if (reminder.repeatType === 'WEEKLY') cursor.setDate(cursor.getDate() + 7);
    else if (reminder.repeatType === 'MONTHLY') cursor.setMonth(cursor.getMonth() + 1);
    else {
      const interval = Math.max(1, Number(reminder.recurrence.interval ?? 1));
      if (reminder.recurrence.unit === 'month') cursor.setMonth(cursor.getMonth() + interval);
      else cursor.setDate(cursor.getDate() + interval * (reminder.recurrence.unit === 'week' ? 7 : 1));
    }
  };
  while (cursor <= now) advance();
  while (cursor <= end && out.length < limit) {
    const weekdays = reminder.recurrence.weekdays;
    if (reminder.repeatType !== 'WEEKDAYS' || !weekdays?.length || weekdays.includes(cursor.getDay())) add(cursor);
    advance();
  }
  return out;
}

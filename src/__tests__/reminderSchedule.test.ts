import assert from 'node:assert/strict';
import test from 'node:test';
import { nextReminderOccurrences } from '../services/reminderSchedule';
import type { PersonalReminder, ReminderRepeatType } from '../types/domain';

function reminder(repeatType: ReminderRepeatType, scheduledAt: string, recurrence: PersonalReminder['recurrence'] = {}, endAt: string | null = null): PersonalReminder {
  return { id: 'r1', clientId: 'client-r1', title: 'Test', scheduledAt, timezone: 'UTC', repeatType, recurrence, endAt, advanceMinutes: 0, notificationEnabled: true, hideDescriptionOnLock: false, status: 'ACTIVE', revision: 1, createdAt: scheduledAt, updatedAt: scheduledAt };
}

test('one-time reminders only emit a future occurrence', () => {
  assert.deepEqual(nextReminderOccurrences(reminder('ONCE', '2026-01-02T10:00:00Z'), 10, new Date('2026-01-01T10:00:00Z')).map(String), [String(new Date('2026-01-02T10:00:00Z'))]);
  assert.equal(nextReminderOccurrences(reminder('ONCE', '2026-01-01T09:00:00Z'), 10, new Date('2026-01-01T10:00:00Z')).length, 0);
});

test('daily and weekly reminders advance from their original local calendar time', () => {
  assert.deepEqual(nextReminderOccurrences(reminder('DAILY', '2026-01-01T09:30:00Z'), 3, new Date('2026-01-02T10:00:00Z')).map((date) => date.toISOString()), ['2026-01-03T09:30:00.000Z', '2026-01-04T09:30:00.000Z', '2026-01-05T09:30:00.000Z']);
  assert.deepEqual(nextReminderOccurrences(reminder('WEEKLY', '2026-01-01T09:30:00Z'), 2, new Date('2026-01-02T10:00:00Z')).map((date) => date.toISOString()), ['2026-01-08T09:30:00.000Z', '2026-01-15T09:30:00.000Z']);
});

test('selected weekdays, custom intervals, end dates, and limits are respected', () => {
  const weekdays = nextReminderOccurrences(reminder('WEEKDAYS', '2026-01-01T09:00:00Z', { weekdays: [1, 3] }), 4, new Date('2026-01-02T10:00:00Z'));
  assert.deepEqual(weekdays.map((date) => date.getUTCDay()), [1, 3, 1, 3]);
  assert.equal(nextReminderOccurrences(reminder('CUSTOM', '2026-01-01T09:00:00Z', { interval: 2, unit: 'day' }, '2026-01-08T09:00:00Z'), 10, new Date('2026-01-01T10:00:00Z')).length, 3);
});

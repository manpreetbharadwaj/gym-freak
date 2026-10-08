import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_REMINDER, litres, recentDays, REMINDER_BUDGET, reminderSlots, suggestedGoalMl } from '../utils/water';
import { elapsedMs, formatStopwatch, INITIAL_STOPWATCH, lap, lapRows, pause, reset, restoreStopwatch, start } from '../utils/stopwatch';

const at = (h: number, m = 0, day = 4) => new Date(2026, 9, day, h, m);
const hm = (d: Date) => `${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

test('water reminders: every interval inside the window, only future times, resuming tomorrow', () => {
  const r = { ...DEFAULT_REMINDER, enabled: true, startMin: 8 * 60, endMin: 22 * 60, intervalMin: 120 };
  const slots = reminderSlots(r, 500, 2500, at(15, 30)).map(hm);
  assert.deepEqual(slots.slice(0, 4), ['4 16:00', '4 18:00', '4 20:00', '4 22:00']);
  assert.equal(slots[4], '5 08:00');
  assert.ok(slots.every((s) => { const [h] = s.split(' ')[1].split(':').map(Number); return h >= 8 && h <= 22; }));
});

test('water reminders: none for the rest of today once the goal is met; 90-minute steps', () => {
  const r = { ...DEFAULT_REMINDER, enabled: true, startMin: 9 * 60, endMin: 12 * 60, intervalMin: 90 };
  const slots = reminderSlots(r, 2600, 2500, at(7)).map(hm);
  assert.deepEqual(slots.slice(0, 3), ['5 09:00', '5 10:30', '5 12:00']);
  assert.ok(!slots.some((s) => s.startsWith('4 ')));
});

test('water reminders: disabled or inverted window schedules nothing; capped below the iOS limit', () => {
  assert.equal(reminderSlots({ ...DEFAULT_REMINDER, enabled: false }, 0, 2500, at(8)).length, 0);
  assert.equal(reminderSlots({ enabled: true, startMin: 600, endMin: 500, intervalMin: 60 }, 0, 2500, at(8)).length, 0);
  const dense = reminderSlots({ enabled: true, startMin: 0, endMin: 23 * 60 + 59, intervalMin: 60 }, 0, 2500, at(0, 5));
  assert.equal(dense.length, REMINDER_BUDGET);
  assert.equal(new Set(dense.map((d) => d.getTime())).size, dense.length, 'no duplicate times');
});

test('water: suggested goal, litres formatting and the 7-day history window', () => {
  assert.equal(suggestedGoalMl(), 2500);
  assert.equal(suggestedGoalMl(80), 2600);
  assert.equal(suggestedGoalMl(200), 4000);
  assert.deepEqual([litres(2500), litres(2000), litres(1850), litres(0)], ['2.5', '2.0', '1.85', '0.0']);
  const days = recentDays({ '2026-10-04': 1800, '2026-10-03': 2500 }, { '2026-10-03': 2000 }, 2500, at(12));
  assert.equal(days.length, 7);
  assert.deepEqual(days[0], { day: '2026-10-04', ml: 1800, goalMl: 2500, percent: 72 });
  assert.deepEqual(days[1], { day: '2026-10-03', ml: 2500, goalMl: 2000, percent: 125 });
  assert.equal(days[6].day, '2026-09-28');
});

test('stopwatch: elapsed comes from timestamps, so time away is counted and pauses are not', () => {
  let s = start(INITIAL_STOPWATCH, 1_000);
  assert.equal(elapsedMs(s, 61_000), 60_000);                 // e.g. app backgrounded for a minute
  s = pause(s, 61_000);
  assert.equal(elapsedMs(s, 999_999), 60_000);                // paused: frozen
  s = start(s, 100_000);
  assert.equal(elapsedMs(s, 100_500), 60_500);
  assert.equal(elapsedMs(s, 99_000), 60_000, 'clock moving backwards never shrinks elapsed');
  assert.deepEqual(reset(), INITIAL_STOPWATCH);
});

test('stopwatch: laps, newest first, with fastest and slowest marked', () => {
  let s = start(INITIAL_STOPWATCH, 0);
  for (const t of [75_120, 116_320, 156_140, 198_450]) s = lap(s, t);
  const rows = lapRows(s.laps);
  assert.deepEqual(rows.map((r) => r.number), [4, 3, 2, 1]);
  assert.deepEqual(rows.map((r) => r.lapMs), [42_310, 39_820, 41_200, 75_120]);
  assert.equal(rows.find((r) => r.fastest)?.number, 3);
  assert.equal(rows.find((r) => r.slowest)?.number, 1);
  assert.equal(lapRows([5_000])[0].fastest, false, 'a single lap is neither');
  assert.deepEqual(lap(pause(s, 200_000), 300_000).laps.length, 4, 'no laps while paused');
});

test('stopwatch: display format and safe restore', () => {
  assert.equal(formatStopwatch(0), '00:00.00');
  assert.equal(formatStopwatch(198_459), '03:18.45');
  assert.equal(formatStopwatch(5_076_429), '01:24:36.42');
  assert.deepEqual(restoreStopwatch({ startedAt: 5_000, accumulatedMs: 1_000, laps: [500, 'x'] }, 10_000), { startedAt: 5_000, accumulatedMs: 1_000, laps: [500] });
  assert.equal(restoreStopwatch({ startedAt: 99_000 }, 10_000).startedAt, null, 'future start is discarded');
  assert.deepEqual(restoreStopwatch('junk', 1), INITIAL_STOPWATCH);
});

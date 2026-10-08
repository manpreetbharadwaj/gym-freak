import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyFix, activeMs, createTracker, currentPace, finish, Fix, haversine, pause, pausedMs, resume, simplifyRoute, TrackerState } from '../features/activity/engine';
import { estimateActiveCalories } from '../features/activity/calories';
import { milestoneAnnouncement, milestoneFor, spokenDuration, VoiceCopy } from '../features/activity/announce';
import { cmToFeetInches, feetInchesToCm, formatDistance, formatHeight, formatPace, formatWeight, kgToLb, lbToKgStored, resolveUnitSystem } from '../utils/units';

/* ───────── Units ───────── */

test('units: canonical values convert for display only (173 cm ↔ 5\'8", 70 kg ↔ 154 lb, 5 km ↔ 3.11 mi)', () => {
  assert.deepEqual(cmToFeetInches(173), { feet: 5, inches: 8 });
  assert.equal(formatHeight(173, 'imperial'), '5 ft 8 in');
  assert.equal(formatHeight(173, 'imperial', true), '5\'8"');
  assert.equal(formatHeight(173, 'metric'), '173 cm');
  assert.equal(feetInchesToCm(5, 8), 172.7);
  assert.equal(formatWeight(70, 'imperial'), '154 lb');
  assert.equal(formatWeight(70, 'metric'), '70.0 kg');
  assert.equal(lbToKgStored(154), 69.85);
  assert.ok(Math.abs(kgToLb(1) - 2.2046226218) < 1e-9);
  assert.equal(formatDistance(5000, 'metric'), '5.00 km');
  assert.equal(formatDistance(5000, 'imperial'), '3.11 mi');
  // 6:10 /km = 370 s/km → 9:55.4 /mi, shown rounded.
  assert.equal(formatPace(370, 'metric'), '6:10 /km');
  assert.equal(formatPace(370, 'imperial'), '9:55 /mi');
  assert.equal(formatPace(null, 'metric'), '--:-- /km');
  // 12 inches carry into a foot rather than showing 5 ft 12 in.
  assert.deepEqual(cmToFeetInches(182.8), { feet: 6, inches: 0 });
});

test('units: explicit choice beats region; auto follows region/measurement system, not language', () => {
  assert.equal(resolveUnitSystem('metric', { measurementSystem: 'us', regionCode: 'US' }), 'metric');
  assert.equal(resolveUnitSystem('imperial', { regionCode: 'IN' }), 'imperial');
  assert.equal(resolveUnitSystem('auto', { measurementSystem: 'us' }), 'imperial');
  assert.equal(resolveUnitSystem('auto', { measurementSystem: 'metric', regionCode: 'US' }), 'imperial');
  assert.equal(resolveUnitSystem('auto', { measurementSystem: 'metric', regionCode: 'IN' }), 'metric');
  assert.equal(resolveUnitSystem(undefined, {}), 'metric');
});

/* ───────── Engine ───────── */

const START = 1_700_000_000_000;
const settings = { autoPause: false, milestoneMeters: 1000 };
// ~ 3.0 m/s eastward along the equator: 1e-5 deg lng ≈ 1.113 m.
const east = (seconds: number, metersPerSecond = 3, accuracy = 5): Fix => ({ lat: 0, lng: (seconds * metersPerSecond) / 111_319.49, accuracy, t: START + seconds * 1000 });

function run(state: TrackerState, fixes: Fix[], s = settings) {
  const events: string[] = [];
  for (const f of fixes) { const r = applyFix(state, f, s); state = r.state; r.events.forEach((e) => events.push(e.kind === 'milestone' ? `m${e.meters}` : e.kind)); }
  return { state, events };
}

test('engine: steady run accumulates distance, splits and 1 km milestones', () => {
  const fixes = Array.from({ length: 701 }, (_, i) => east(i * 2)); // 1400 s at 3 m/s = 4.2 km
  const { state, events } = run(createTracker('a', 'RUNNING', START), fixes);
  assert.ok(Math.abs(state.distanceMeters - 4200) < 15, `distance ${state.distanceMeters}`);
  assert.deepEqual(events, ['m1000', 'm2000', 'm3000', 'm4000']);
  assert.equal(state.splitsKm.length, 4);
  for (const split of state.splitsKm) assert.ok(Math.abs(split.durationMs - 333_333) < 3000, `split ${split.durationMs}`);
  assert.equal(state.splitsMi.length, 2);
  const pace = currentPace(state)!;
  assert.ok(Math.abs(pace - 333.3) < 5, `pace ${pace}`);
});

test('engine: noisy GPS while standing still adds no distance', () => {
  let state = createTracker('a', 'WALKING', START);
  const jitter = Array.from({ length: 120 }, (_, i) => ({ lat: (Math.sin(i) * 3) / 110_540, lng: (Math.cos(i * 1.7) * 3) / 111_319, accuracy: 8, t: START + i * 1000 }));
  state = run(state, jitter).state;
  assert.ok(state.distanceMeters < 10, `jitter distance ${state.distanceMeters}`);
});

test('engine: inaccurate fixes and impossible jumps are ignored', () => {
  let state = createTracker('a', 'RUNNING', START);
  state = run(state, [east(0), east(5)]).state;
  const before = state.distanceMeters;
  state = run(state, [{ lat: 0, lng: 0.01, accuracy: 5, t: START + 6000 }]).state; // 1.1 km in 1 s
  state = run(state, [{ ...east(7), accuracy: 80 }]).state; // too inaccurate
  assert.equal(state.distanceMeters, before);
  state = run(state, [east(10)]).state;
  assert.ok(state.distanceMeters > before);
});

test('engine: signal loss bridges the gap without inventing a jump, and starts a new segment', () => {
  let state = createTracker('a', 'RUNNING', START);
  state = run(state, Array.from({ length: 21 }, (_, i) => east(i))).state;
  state = run(state, [east(60)]).state; // 40 s without fixes at a plausible speed
  assert.ok(Math.abs(state.distanceMeters - 180) < 6, `distance ${state.distanceMeters}`);
  assert.equal(state.route[state.route.length - 1].gap, true);
});

test('engine: manual pause stops time and distance; resume continues without a jump', () => {
  const span = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => east(from + i));
  let state = createTracker('a', 'RUNNING', START);
  state = run(state, span(0, 20)).state;
  state = pause(state, START + 20_000);
  state = run(state, span(21, 79)).state; // kept moving while paused: not counted
  const dPaused = state.distanceMeters;
  assert.ok(dPaused > 50 && dPaused <= 60, `paused distance ${dPaused}`);
  state = resume(state, START + 80_000);
  state = run(state, span(80, 90)).state;
  assert.ok(state.distanceMeters - dPaused > 22 && state.distanceMeters - dPaused <= 30, `after resume ${state.distanceMeters - dPaused}`);
  assert.equal(activeMs(state, START + 90_000), 30_000);
  assert.equal(pausedMs(state, START + 90_000), 60_000);
  const done = finish(state, START + 100_000);
  assert.equal(activeMs(done, START + 999_999), 40_000);
});

test('engine: auto-pause needs a sustained stop and resumes only on sustained movement', () => {
  const auto = { autoPause: true, milestoneMeters: 0 };
  let state = createTracker('a', 'RUNNING', START);
  const moving = Array.from({ length: 30 }, (_, i) => east(i)); // 30 s running
  let r = run(state, moving, auto);
  state = r.state;
  // Stand still for 25 s at the last position (with small jitter).
  const last = moving[moving.length - 1];
  const still = Array.from({ length: 25 }, (_, i) => ({ ...last, lat: (i % 2) * 1e-6, t: last.t + (i + 1) * 1000 }));
  r = run(state, still, auto);
  state = r.state;
  assert.deepEqual(r.events, ['autoPause']);
  assert.equal(state.status, 'paused');
  // A single jittery fix does not resume; steady movement does.
  const restart = Array.from({ length: 12 }, (_, i) => ({ ...east(30 + i + 1), t: last.t + 26_000 + i * 1000 }));
  r = run(state, restart, auto);
  assert.deepEqual(r.events, ['autoResume']);
  assert.equal(r.state.status, 'active');
  assert.ok(pausedMs(r.state, last.t + 45_000) >= 12_000);
});

test('engine: route simplification keeps shape and gap markers', () => {
  const pts = Array.from({ length: 500 }, (_, i) => ({ lat: 0, lng: i * 1e-5, alt: null, accuracy: 5, t: i, gap: i === 250 }));
  const simple = simplifyRoute(pts);
  assert.ok(simple.length < 10);
  assert.ok(simple.some((p) => p.gap));
  assert.ok(Math.abs(haversine(simple[0], simple[simple.length - 1]) - haversine(pts[0], pts[499])) < 0.01);
});

/* ───────── Calories ───────── */

test('calories depend on speed, weight and terrain — not a constant per km', () => {
  const fast = estimateActiveCalories({ type: 'RUNNING', activeMs: 25 * 60_000, distanceMeters: 5000, weightKg: 70 });
  const slow = estimateActiveCalories({ type: 'RUNNING', activeMs: 40 * 60_000, distanceMeters: 5000, weightKg: 70 });
  const heavy = estimateActiveCalories({ type: 'RUNNING', activeMs: 25 * 60_000, distanceMeters: 5000, weightKg: 90 });
  const walk = estimateActiveCalories({ type: 'WALKING', activeMs: 60 * 60_000, distanceMeters: 5000, weightKg: 70 });
  const hill = estimateActiveCalories({ type: 'HIKING', activeMs: 90 * 60_000, distanceMeters: 6000, elevationGainM: 400, weightKg: 70 });
  const yoga = estimateActiveCalories({ type: 'YOGA', activeMs: 60 * 60_000, weightKg: 70 });
  assert.ok(fast > 250 && fast < 450, `fast ${fast}`);
  assert.ok(heavy > fast);
  assert.ok(walk < fast);
  assert.ok(hill > walk);
  assert.equal(yoga, 105); // (2.5 − 1) × 70 kg × 1 h
  // Net running cost per kg·km is nearly speed-independent (ACSM), but a slow pace switches to the walking equation.
  assert.equal(fast, slow);
  const stroll = estimateActiveCalories({ type: 'RUNNING', activeMs: 50 * 60_000, distanceMeters: 5000, weightKg: 70 });
  assert.ok(stroll < slow, `stroll ${stroll}`);
});

/* ───────── Voice coach ───────── */

const copy: VoiceCopy = {
  started: 'Workout started.', completed: "You've completed {distance}.", time: 'Time: {time}.', pace: 'Average pace: {pace} per {unit}.', calories: 'Estimated calories burned: {kcal}.',
  kmOne: '{n} kilometer', kmMany: '{n} kilometers', miOne: '{n} mile', miMany: '{n} miles', kmUnit: 'kilometer', miUnit: 'mile',
  hourOne: '{n} hour', hourMany: '{n} hours', minuteOne: '{n} minute', minuteMany: '{n} minutes', secondOne: '{n} second', secondMany: '{n} seconds',
};
const all = { distance: true, duration: true, pace: true, calories: true };

test('voice coach: 1 km announcement reads time, pace and calories in words', () => {
  const text = milestoneAnnouncement({ meters: 1000, activeMs: 372_000, calories: 72.4, system: 'metric', metrics: all }, copy);
  assert.equal(text, "You've completed 1 kilometer. Time: 6 minutes 12 seconds. Average pace: 6 minutes 12 seconds per kilometer. Estimated calories burned: 72.");
  assert.equal(spokenDuration(3725, copy), '1 hour 2 minutes');
});

test('voice coach: miles when the unit is imperial, and only the chosen metrics', () => {
  const text = milestoneAnnouncement({ meters: 3218.688, activeMs: 1_200_000, calories: 200, system: 'imperial', metrics: { distance: true, duration: false, pace: true, calories: false } }, copy);
  assert.equal(text, "You've completed 2 miles. Average pace: 10 minutes per mile.");
  assert.equal(milestoneFor('imperial', 1), 1609.344);
  assert.equal(milestoneFor('metric', 0.5), 500);
});

/* ───────── Today summary: no double counting ───────── */
import { todaySummary } from '../features/activity/summary';
import type { Activity } from '../types/domain';

const act = (over: Partial<Activity>): Activity => ({ id: 'a', type: 'RUNNING', source: 'GYM_FREAK', startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), activeDurationMs: 30 * 60_000, pausedDurationMs: 0, distanceMeters: 5000, calories: 350, caloriesEstimated: true, steps: null, elevationGainM: null, avgPaceSecPerKm: 360, hasRoute: true, exportedTo: [], ...over });

test('today: platform aggregates win over Gym Freak sums (never both), steps only from health', () => {
  const runs = [act({}), act({ id: 'b', type: 'YOGA', distanceMeters: null, calories: 100, activeDurationMs: 20 * 60_000 })];
  const withHealth = todaySummary({ date: 'x', steps: 9248, distanceMeters: 7100, activeCalories: 420 }, runs);
  assert.deepEqual([withHealth.steps, withHealth.distanceMeters, withHealth.distanceSource, withHealth.activeCalories, withHealth.caloriesEstimated, withHealth.activeMinutes], [9248, 7100, 'health', 420, false, 50]);
  const offline = todaySummary(null, runs);
  assert.deepEqual([offline.steps, offline.distanceMeters, offline.distanceSource, offline.activeCalories, offline.caloriesEstimated], [null, 5000, 'activities', 450, true]);
  const empty = todaySummary(null, []);
  assert.deepEqual([empty.steps, empty.distanceMeters, empty.activeCalories, empty.activeMinutes], [null, null, null, 0]);
});

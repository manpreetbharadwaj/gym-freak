import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateNutrition } from '../nutrition/engine';
import { feetInchesToCm, lbToKgStored } from '../utils/units';
import { dateInput } from '../utils/dates';

test('imperial entry (ft/in, lb) is stored canonically and gives the same targets as metric', () => {
  const heightCm = feetInchesToCm(5, 11); // 180.3 cm
  const weightKg = lbToKgStored(176); // 79.83 kg
  assert.equal(heightCm, 180.3);
  assert.equal(weightKg, 79.83);
  const imperial = calculateNutrition({ weightKg, heightCm, age: 30, sex: 'male', activityLevel: 'moderate', goal: 'build_muscle' });
  const metric = calculateNutrition({ weightKg: 80, heightCm: 180, age: 30, sex: 'male', activityLevel: 'moderate', goal: 'build_muscle' });
  if (imperial.status !== 'ready' || metric.status !== 'ready') throw new Error('expected targets');
  assert.ok(Math.abs(imperial.calories - metric.calories) <= 10);
  assert.ok(Math.abs(imperial.proteinG - metric.proteinG) <= 1);
});

test('an age change moves the estimate (5 kcal BMR per year in Mifflin-St Jeor)', () => {
  const at = (age: number) => calculateNutrition({ weightKg: 70, heightCm: 175, age, sex: 'female', activityLevel: 'sedentary', goal: 'general_fitness' });
  const a = at(30), b = at(40);
  if (a.status !== 'ready' || b.status !== 'ready') throw new Error('expected targets');
  assert.equal(a.bmr - b.bmr, 50);
});

test('measurement dates: YYYY-MM-DD only, real calendar days, not in the future', () => {
  const now = new Date(2026, 9, 10, 12).getTime();
  assert.ok(dateInput('2026-10-01', now));
  assert.equal(dateInput('2026-02-30', now), null);
  assert.equal(dateInput('01/10/2026', now), null);
  assert.equal(dateInput('2026-12-01', now), null);
});

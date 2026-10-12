import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { calculateNutrition, navyBodyFat, NutritionInputs } from '../nutrition/engine';

/** Same reference cases as the backend (computed independently from the published formulas). */
const vectors = JSON.parse(readFileSync('src/nutrition/engine.vectors.json', 'utf8')) as {
  nutrition: { name: string; inputs: NutritionInputs; expected: Record<string, unknown> }[];
  navy: { inputs: { sex: 'male' | 'female'; heightCm: number; neckCm: number; waistCm: number; hipCm: number | null }; expectedPercent: number }[];
};

test('nutrition engine (app copy) matches every reference case', () => {
  for (const v of vectors.nutrition) {
    const result = calculateNutrition(v.inputs) as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(v.expected)) assert.deepEqual(result[key], value, `${v.name}: ${key}`);
  }
  for (const v of vectors.navy) assert.deepEqual(navyBodyFat(v.inputs), { percent: v.expectedPercent });
});

test('one engine: the app copy is byte-identical to the backend source of truth (when the backend repo is checked out)', () => {
  const backend = `${process.env.HOME}/Documents/healthyMe-Backend/src/gym/nutrition-engine.ts`;
  if (!existsSync(backend)) return;
  assert.equal(readFileSync('src/nutrition/engine.ts', 'utf8'), readFileSync(backend, 'utf8'), 'copy healthyMe-Backend/src/gym/nutrition-engine.ts to src/nutrition/engine.ts');
});

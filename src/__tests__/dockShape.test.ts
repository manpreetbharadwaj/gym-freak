import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dockPath, notchDepth, notchHalfWidth } from '../navigation/dockShape';

// Mirrors CapsuleTabBar: 60px dock, 50px Workout button raised 15px, 4px ring gap, 9px shoulders.
const shape = { width: 358, height: 60, radius: 20, notchCenterY: 10, notchRadius: 29, fillet: 9 };

test('cradle hugs the raised button and stays shallow enough for the label underneath', () => {
  // Button bottom = raise-adjusted centre + radius (35); cradle leaves a 4px ring and ends above the label row (≥ 41px).
  assert.equal(notchDepth(shape), 39);
  assert.ok(notchDepth(shape) - (shape.notchCenterY + 25) === 4);
  const half = notchHalfWidth(shape);
  assert.ok(half > 29 && half < 45, `opening half-width ${half}`);
});

test('dock outline is a single closed path with the cradle centred on the bar', () => {
  const d = dockPath(shape);
  assert.match(d, /^M20 0 /);
  assert.match(d, / Z$/);
  const left = Number(/^M20 0 L([\d.]+) 0/.exec(d)?.[1]);
  const right = Number(/A9 9 0 0 1 ([\d.]+) 0 /.exec(d)?.[1]);
  assert.ok(Math.abs((shape.width - right) - left) < 0.02, 'opening is symmetric');
  // Large-arc flag is set because the fillet tangent points sit above the cradle centre.
  assert.match(d, /A29 29 0 1 0 /);
});

test('path follows the window width (rotation / tablets)', () => {
  assert.notEqual(dockPath(shape), dockPath({ ...shape, width: 480 }));
  assert.match(dockPath({ ...shape, width: 480 }), /L460 0 A20 20 0 0 1 480 20/);
});

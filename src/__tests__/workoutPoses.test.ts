import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poseFor, repDepth, WORKOUT_MOVES, type Seg } from '../navigation/workoutPoses';

const length = (s: Seg) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
const depths = Array.from({ length: 21 }, (_, i) => i / 20);

test('rep depth starts and ends at rest and peaks mid-rep', () => {
  assert.equal(repDepth(0), 0);
  assert.ok(Math.abs(repDepth(1)) < 1e-9);
  assert.ok(Math.abs(repDepth(0.5) - 1) < 1e-9);
});

test('every pose stays inside the 32×32 box (so it never clips against the round button)', () => {
  for (const move of WORKOUT_MOVES) for (const d of depths) {
    const p = poseFor(move, d);
    const points = p.segs.flatMap((s) => [[s.x1, s.y1], [s.x2, s.y2]]);
    points.push([p.head.x - p.head.r, p.head.y - p.head.r], [p.head.x + p.head.r, p.head.y + p.head.r]);
    for (const [x, y] of points) {
      assert.ok(Number.isFinite(x) && Number.isFinite(y), `${move} @${d}: non-finite point`);
      assert.ok(x >= 1 && x <= 31 && y >= 1 && y <= 31, `${move} @${d}: (${x.toFixed(1)}, ${y.toFixed(1)}) outside the box`);
    }
  }
});

test('bones keep their length through the rep (the IK joints never stretch a limb)', () => {
  // [move, segment index] pairs whose length is fixed by the skeleton.
  const bones: Array<[typeof WORKOUT_MOVES[number], number]> = [['pushup', 2], ['pushup', 3], ['squat', 0], ['squat', 1], ['squat', 2], ['curl', 4]];
  for (const [move, index] of bones) {
    const rest = length(poseFor(move, 0).segs[index]);
    for (const d of depths) assert.ok(Math.abs(length(poseFor(move, d).segs[index]) - rest) < 0.05, `${move} bone ${index} changed length at ${d}`);
  }
});

test('each move visibly moves: the head travels between rest and the bottom/top of the rep', () => {
  for (const move of WORKOUT_MOVES) {
    const a = poseFor(move, 0);
    const b = poseFor(move, 1);
    const travel = Math.hypot(b.head.x - a.head.x, b.head.y - a.head.y) + (a.weight && b.weight ? Math.hypot(b.weight.x - a.weight.x, b.weight.y - a.weight.y) : 0);
    assert.ok(travel > 3, `${move} barely moves (${travel.toFixed(1)})`);
  }
});

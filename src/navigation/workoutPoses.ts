/**
 * Poses for the mini workout character in the centre tab button.
 *
 * A side-view stick figure in a 32×32 box (ground at y = 27): straight segments for limbs and torso and a
 * circle for the head, so it stays crisp at any density and reads as a silhouette at ~30 px. Each exercise is
 * a pure function of `d` — 0 at the start position, 1 at the bottom/top of the rep — and runs as a worklet,
 * so the UI thread computes every frame without touching React.
 */

export type WorkoutMove = 'pushup' | 'curl' | 'squat';
export const WORKOUT_MOVES: readonly WorkoutMove[] = ['pushup', 'curl', 'squat'];

type P = { x: number; y: number };
export type Seg = { x1: number; y1: number; x2: number; y2: number };
/** Six limb segments (unused ones collapse to a point hidden under the head), the head, and an optional weight. */
export type Pose = { segs: Seg[]; head: P & { r: number }; weight: (P & { r: number }) | null };

const seg = (a: P, b: P): Seg => { 'worklet'; return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }; };
/** An unused segment: a zero-length line at the head centre, so its round cap is covered by the head. */
const none = (head: P): Seg => { 'worklet'; return seg(head, head); };
const lerp = (a: number, b: number, t: number) => { 'worklet'; return a + (b - a) * t; };
const lerpP = (a: P, b: P, t: number): P => { 'worklet'; return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }; };

/** Two-bone IK: the joint between `a` and `b` with bone lengths l1/l2; `side` picks which way it bends. */
function joint(a: P, b: P, l1: number, l2: number, side: 1 | -1): P {
  'worklet';
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.min(Math.max(Math.hypot(dx, dy), 0.001), l1 + l2 - 0.001);
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const ux = dx / d;
  const uy = dy / d;
  return { x: a.x + along * ux - side * h * uy, y: a.y + along * uy + side * h * ux };
}

/** Push-up: a plank pivoting on the toes; elbows fold back toward the hips as the chest drops. */
function pushup(d: number): Pose {
  'worklet';
  const feet = { x: 4.5, y: 25.5 };
  const hand = { x: 23.5, y: 25.5 };
  const shoulder = { x: 22.5, y: lerp(16.2, 21.6, d) };
  const hip = lerpP(feet, shoulder, 0.5);
  const bx = shoulder.x - feet.x;
  const by = shoulder.y - feet.y;
  const len = Math.hypot(bx, by);
  const head = { x: shoulder.x + (bx / len) * 3.6, y: shoulder.y + (by / len) * 3.6 - 0.6, r: 2.5 };
  const elbow = joint(shoulder, hand, 4.7, 4.7, 1);
  return { segs: [seg(feet, hip), seg(hip, shoulder), seg(shoulder, elbow), seg(elbow, hand), none(head), none(head)], head, weight: null };
}

/** Dumbbell curl: standing tall; the near forearm swings the weight up toward the shoulder and back down. */
function curl(d: number): Pose {
  'worklet';
  const hip = { x: 15.5, y: 18.5 };
  const shoulder = { x: 15.5, y: 10 };
  const elbow = { x: 16.3, y: 15.6 };
  const angle = (lerp(70, -62, d) * Math.PI) / 180;
  const hand = { x: elbow.x + Math.cos(angle) * 5.6, y: elbow.y + Math.sin(angle) * 5.6 };
  return {
    segs: [
      seg(hip, { x: 13.4, y: 27 }), seg(hip, { x: 17.6, y: 27 }), seg(hip, shoulder),
      seg(shoulder, elbow), seg(elbow, hand), none({ x: 15.8, y: 6 }),
    ],
    head: { x: 15.8, y: 6, r: 2.5 },
    weight: { x: hand.x + Math.cos(angle) * 1.2, y: hand.y + Math.sin(angle) * 1.2, r: 2.1 },
  };
}

/** Squat: hips sit back and down, knees track forward, torso leans in and arms reach out for balance. */
function squat(d: number): Pose {
  'worklet';
  const ankle = { x: 17, y: 27 };
  const hip = { x: lerp(16.2, 11, d), y: lerp(17.15, 22.2, d) };
  const knee = joint(ankle, hip, 5, 5.2, 1);
  const lean = (lerp(4, 38, d) * Math.PI) / 180;
  const shoulder = { x: hip.x + Math.sin(lean) * 8, y: hip.y - Math.cos(lean) * 8 };
  const head = { x: shoulder.x + Math.sin(lean) * 3.4, y: shoulder.y - Math.cos(lean) * 3.4, r: 2.5 };
  const reach = (lerp(82, 6, d) * Math.PI) / 180;
  const hand = { x: shoulder.x + Math.cos(reach) * 6.6, y: shoulder.y + Math.sin(reach) * 6.6 };
  return { segs: [seg(ankle, knee), seg(knee, hip), seg(hip, shoulder), seg(shoulder, hand), seg(ankle, { x: 19.6, y: 27 }), none(head)], head, weight: null };
}

/** Rep phase (0→1, linear) to depth: eased down and back up, with a brief hold at each end. */
export function repDepth(phase: number) {
  'worklet';
  return (1 - Math.cos(phase * Math.PI * 2)) / 2;
}

export function poseFor(move: WorkoutMove, d: number): Pose {
  'worklet';
  return move === 'pushup' ? pushup(d) : move === 'curl' ? curl(d) : squat(d);
}

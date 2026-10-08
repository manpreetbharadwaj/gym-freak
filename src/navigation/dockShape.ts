/**
 * Geometry for the floating tab dock: a rounded capsule whose top edge dips into a circular cradle
 * around the raised centre (Workout) button, with small convex fillets where the edge meets the cradle.
 * Pure maths so it can be unit-tested and recomputed on rotation.
 */
export interface DockShape {
  width: number;
  height: number;
  radius: number;
  /** Cradle circle centre, measured down from the dock's top edge. */
  notchCenterY: number;
  /** Cradle radius (button radius + visible ring gap). */
  notchRadius: number;
  /** Radius of the rounded shoulders where the top edge turns into the cradle. */
  fillet: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Half-width of the opening along the top edge (from the centre to where the fillet starts). */
export function notchHalfWidth({ notchCenterY: cy, notchRadius: R, fillet: f }: DockShape) {
  return Math.sqrt((R + f) ** 2 - (cy - f) ** 2);
}

/** Deepest point of the cradle, measured down from the top edge. */
export const notchDepth = (s: DockShape) => s.notchCenterY + s.notchRadius;

export function dockPath(s: DockShape): string {
  const { width: w, height: h, radius: r, notchCenterY: cy, notchRadius: R, fillet: f } = s;
  const cx = w / 2;
  const d = notchHalfWidth(s);
  // Fillet centres sit inside the bar (below the top edge) and touch the cradle circle externally.
  const k = R / (R + f);
  const t1 = { x: cx + (-d) * k, y: cy + (f - cy) * k };
  const t2 = { x: cx + d * k, y: t1.y };
  return [
    `M${r} 0`,
    `L${r2(cx - d)} 0`,
    `A${f} ${f} 0 0 1 ${r2(t1.x)} ${r2(t1.y)}`,
    `A${R} ${R} 0 ${t1.y < cy ? 1 : 0} 0 ${r2(t2.x)} ${r2(t2.y)}`,
    `A${f} ${f} 0 0 1 ${r2(cx + d)} 0`,
    `L${w - r} 0`,
    `A${r} ${r} 0 0 1 ${w} ${r}`,
    `L${w} ${h - r}`,
    `A${r} ${r} 0 0 1 ${w - r} ${h}`,
    `L${r} ${h}`,
    `A${r} ${r} 0 0 1 0 ${h - r}`,
    `L0 ${r}`,
    `A${r} ${r} 0 0 1 ${r} 0`,
    'Z',
  ].join(' ');
}

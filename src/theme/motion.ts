import { Easing, ReduceMotion, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

/**
 * Motion system. Every animation in the app picks from these instead of inventing its own numbers,
 * so presses, selections and transitions share one rhythm. All configs carry ReduceMotion.System:
 * with the OS "Reduce Motion" setting on, Reanimated jumps straight to the end value.
 *
 *  press     100–150 ms  touch down/up, tab icon response
 *  standard  180–250 ms  selection outlines, colour changes, small reveals, tab content cross-fade
 *  large     250–350 ms  panels, expanding sections, screen-level reveals
 */
export const durations = { press: 120, release: 160, standard: 220, large: 300 } as const;

export const easings = {
  /** Decelerate: things arriving or responding to a touch. */
  out: Easing.out(Easing.cubic),
  /** Symmetric: things moving between two resting places. */
  inOut: Easing.inOut(Easing.cubic),
} as const;

const timing = (duration: number, easing = easings.out): WithTimingConfig => ({ duration, easing, reduceMotion: ReduceMotion.System });

export const timings = {
  press: timing(durations.press),
  release: timing(durations.release),
  standard: timing(durations.standard),
  large: timing(durations.large, easings.inOut),
} as const;

/** Springs tuned near critical damping (ratio ≈ 0.9): they settle without a visible wobble (no bouncy toy feel). */
export const springs = {
  /** The tab indicator and other things that travel between slots. */
  slide: { damping: 29, stiffness: 320, mass: 0.8, reduceMotion: ReduceMotion.System },
  /** Press release and small pops (set ticks, badges). */
  snappy: { damping: 18, stiffness: 380, mass: 0.7, reduceMotion: ReduceMotion.System },
  /** Panels and progress fills. */
  gentle: { damping: 24, stiffness: 160, mass: 1, overshootClamping: true, reduceMotion: ReduceMotion.System },
} satisfies Record<string, WithSpringConfig>;

/** Press-down scales: 0.97 for buttons, 0.98 for large cards (bigger surfaces need less travel to read as pressed). */
export const pressScales = { button: 0.97, card: 0.98, icon: 0.92 } as const;

/**
 * Mini workout character in the centre tab button: a short, occasional appearance (never a loop).
 * Gaps are randomised between min/max so it never feels metronomic; one appearance = fade in, `reps` reps,
 * fade out (≈ 2.4–3 s in total). The move cycles push-up → curl → squat.
 */
export const workoutTabCharacter = {
  minGapMs: 15_000,
  maxGapMs: 25_000,
  /** If the dock is hidden (scrolled away) or covered when an appearance is due, check again after this. */
  retryMs: 4_000,
  fadeMs: 260,
  reps: 3,
  repMs: { pushup: 760, curl: 700, squat: 820 },
} as const;

/**
 * Home "plan on its way" calendar: flips `pages` pages (one flip = `flipMs`, `gapMs` between flips),
 * rests for `pauseMs`, then continues from the date it stopped on (so the restart never jumps back).
 */
export const calendarFlip = {
  flipMs: 620,
  gapMs: 240,
  pages: 3,
  pauseMs: 8_000,
  /** First cycle starts shortly after Home appears, not instantly (lets the card settle first). */
  startDelayMs: 1_200,
} as const;

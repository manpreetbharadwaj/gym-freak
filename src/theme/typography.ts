import type { TextStyle } from 'react-native';

/** Digits all share one width, so timers, counters and metrics never jitter as values change. */
const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/** Inter weights used throughout the interface. Keep all font selection centralized here. */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  /** Display aliases preserve each role's existing weight while using the same family. */
  display: 'Inter_700Bold',
  displaySemibold: 'Inter_600SemiBold',
} as const;

/**
 * The one type scale for the app. Screens pick a role (`<Txt variant="section">`), never a raw size.
 * Line heights stay compact (~1.3×); tracking is ~0 except on small uppercase labels.
 */
export const typography = {
  /** Rare hero moments: splash, workout complete. */
  hero: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.8 },
  /** Every screen title. */
  display: { fontFamily: fonts.display, fontSize: 25, lineHeight: 31, letterSpacing: -0.6 },
  /** Onboarding questions and first-run headlines. */
  question: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.7 },
  /** Section headings ("Today’s Activity", "Exercises", sheet titles). */
  title: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  /** Card headings and list-row titles. */
  h3: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  /** Settings / list rows. */
  row: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  /** Primary body copy. */
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  /** Secondary body copy and descriptions. */
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  /** Metadata, helper text, chips and small labels. */
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  /** Uppercase eyebrow labels. */
  overline: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.2 },
  /** Button labels (compact buttons override to 14). */
  button: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  /** Bottom tab labels. */
  tab: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },
  /** Card metrics (tiles, set counters, water). */
  metric: { fontFamily: fonts.display, fontSize: 21, lineHeight: 27, letterSpacing: -0.5, fontVariant: tabular },
  /** Live set values (reps / kg steppers). */
  metricLg: { fontFamily: fonts.display, fontSize: 27, lineHeight: 33, letterSpacing: -0.7, fontVariant: tabular },
  /** The one large figure on a screen (streak, timers, pickers). */
  number: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -1.2, fontVariant: tabular },
  /** Running timers and big pickers (rest timer, body metrics). */
  timer: { fontFamily: fonts.display, fontSize: 52, lineHeight: 58, letterSpacing: -1.5, fontVariant: tabular },
  /** The 3-2-1 countdown. */
  countdown: { fontFamily: fonts.display, fontSize: 96, lineHeight: 104, letterSpacing: -2, fontVariant: tabular },
  /** Text typed into fields (inputs set this directly on TextInput). */
  input: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20 },
} satisfies Record<string, TextStyle>;

export type TypographyRole = keyof typeof typography;

/** Interactive control sizes, shared by every button and icon button. */
export const controls = {
  button: { height: 52, compactHeight: 40, radius: 16, compactRadius: 12, paddingHorizontal: 20, iconGap: 8, iconSize: 20 },
  /** sm/md/lg for toolbars and headers; `cta` only beside a full-height button (Previous / Next). */
  iconButton: { sm: 36, md: 40, lg: 44, cta: 52 },
  input: { height: 50, radius: 14 },
} as const;

import type { AccentScope } from '@/components/accentScope';
import { DEFAULT_ACCENT_SCOPE } from '@/components/accentScope';
import { palette, scenes, type GradientPair, type Scene } from '@/theme';
import { brandGradient, logoPalette } from '@/theme/brandAccent';

/**
 * EXPERIMENT — Home only: orange / amber accents sampled from the Gym Freak logo (src/assets/app_logo.png).
 * Set HOME_ORANGE_EXPERIMENT to false to restore the standard Home look; nothing else reads this file.
 * The colours themselves live in src/theme/brandAccent.ts (shared with the tab bar and the calendar).
 */
export const HOME_ORANGE_EXPERIMENT = true;

export { logoPalette };

const orangeGradient = brandGradient;

export interface HomeTheme {
  scene: Scene;
  scope: AccentScope;
  /** Primary CTA border gradient (GradientButton). */
  cta: GradientPair;
  avatar: GradientPair;
  /** Metric strip / macro colours (active minutes · calories · streak; protein · carbs · fat). */
  metrics: { minutes: string; calories: string; streak: string };
  macros: { protein: string; carbs: string; fat: string };
  surface: string;
  line: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
}

const standard: HomeTheme = {
  scene: scenes.violet,
  scope: DEFAULT_ACCENT_SCOPE,
  cta: ['#1DAEEA', '#2C7BFF'],
  avatar: ['#1DAEEA', '#2C7BFF'],
  metrics: { minutes: palette.accent, calories: palette.orange, streak: palette.yellow },
  macros: { protein: palette.accent, carbs: palette.orange, fat: palette.yellow },
  surface: palette.surface,
  line: palette.line,
  accent: palette.accent,
  accentSoft: palette.accentSoft,
  onAccent: palette.onAccent,
};

const orange: HomeTheme = {
  // Dark canvas with one faint warm glow (no orange backgrounds).
  scene: { accent: logoPalette.orange, gradient: orangeGradient, background: logoPalette.canvas, blobs: [logoPalette.orange, logoPalette.deep, logoPalette.amber] },
  scope: { accent: logoPalette.orange, accentSoft: logoPalette.amber, onAccent: logoPalette.onAccent, ring: orangeGradient, storyRing: orangeGradient, surface: logoPalette.surface, line: logoPalette.line, canvas: logoPalette.canvas },
  cta: orangeGradient,
  avatar: [logoPalette.deep, logoPalette.amber],
  metrics: { minutes: logoPalette.amber, calories: logoPalette.deep, streak: logoPalette.gold },
  macros: { protein: logoPalette.orange, carbs: logoPalette.amber, fat: logoPalette.gold },
  surface: logoPalette.surface,
  line: logoPalette.line,
  accent: logoPalette.orange,
  accentSoft: logoPalette.amber,
  onAccent: logoPalette.onAccent,
};

export const homeTheme: HomeTheme = HOME_ORANGE_EXPERIMENT ? orange : standard;

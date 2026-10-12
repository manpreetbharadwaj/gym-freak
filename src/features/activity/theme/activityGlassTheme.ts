import type { AccentScope } from '@/components/accentScope';
import { DEFAULT_ACCENT_SCOPE } from '@/components/accentScope';
import { gradients, palette, scenes, type GradientPair, type Scene } from '@/theme';

/**
 * EXPERIMENT — Activity section only: dark glass surfaces with orange / amber light from the Gym Freak logo.
 * Set ACTIVITY_GLASS_EXPERIMENT to false to restore the standard Activity look. Nothing outside
 * src/features/activity reads this file.
 *
 * Logo samples (src/assets/app_logo.png, brightest pixels per hue band): #FD4924 · #FE7429 · #FE8C31 ·
 * #FFB043 (amber) · #FFDA62 (gold).
 */
export const ACTIVITY_GLASS_EXPERIMENT = true;

const logo = { deep: '#FD4924', orange: '#FE7429', amber: '#FFB043', gold: '#FFDA62' } as const;

export interface ActivityTheme {
  glass: boolean;
  scene: Scene;
  scope: AccentScope;
  /** Primary CTA border gradient (Start / Save). */
  cta: GradientPair;
  accent: string;
  accentSoft: string;
  /** Canvas behind the live tracking screen. */
  liveBackground: string;
  /** Route line, start dot and fastest split on maps / sketches. */
  route: string;
  routeStart: string;
  /** Glass tokens (used only when `glass` is true). */
  fill: string;
  fillStrong: string;
  border: string;
  /** Reflection along the top edge. */
  highlight: readonly [string, string];
  /** Opaque stand-in when the OS asks for reduced transparency. */
  solid: string;
  textSecondary: string;
  /** Floating controls: pause is the primary (orange), resume stays distinct. */
  pause: string;
  resume: string;
}

const standard: ActivityTheme = {
  glass: false,
  scene: scenes.violet,
  scope: DEFAULT_ACCENT_SCOPE,
  cta: gradients.primary,
  accent: palette.accent,
  accentSoft: palette.accentSoft,
  liveBackground: palette.surfaceRaised,
  route: '#5B46F6',
  routeStart: palette.aqua,
  fill: palette.surface,
  fillStrong: palette.surfaceRaised,
  border: palette.line,
  highlight: ['rgba(255,255,255,0)', 'rgba(255,255,255,0)'],
  solid: palette.surface,
  textSecondary: palette.inkMuted,
  pause: palette.violet,
  resume: palette.aqua,
};

const glass: ActivityTheme = {
  glass: true,
  // Charcoal canvas with one faint warm glow; no orange backgrounds.
  scene: { accent: logo.orange, gradient: [logo.deep, logo.orange, logo.amber], background: '#0B0D12', blobs: [logo.orange, logo.amber, logo.deep] },
  scope: { ...DEFAULT_ACCENT_SCOPE, accent: logo.orange, accentSoft: logo.amber, ring: [logo.deep, logo.orange, logo.amber] },
  cta: [logo.deep, logo.orange, logo.amber],
  accent: logo.orange,
  accentSoft: logo.amber,
  liveBackground: '#0B0D12',
  route: logo.orange,
  routeStart: '#34D399',
  fill: 'rgba(255,255,255,0.06)',
  fillStrong: 'rgba(255,255,255,0.09)',
  border: 'rgba(255,255,255,0.14)',
  highlight: ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)'],
  solid: '#16181E',
  textSecondary: '#AAB2BF',
  pause: logo.orange,
  resume: '#2DD4BF',
};

export const activityTheme: ActivityTheme = ACTIVITY_GLASS_EXPERIMENT ? glass : standard;

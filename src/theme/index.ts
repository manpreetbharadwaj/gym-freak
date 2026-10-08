import { Platform, useWindowDimensions } from 'react-native';

/**
 * Gym Freak design tokens — one navy-black + cyan system for the whole app (it continues the
 * onboarding/auth look). Token names are semantic: `ink*` = text on the dark canvas, `surface*` =
 * card layers, `white` = pure white for text/icons on filled accents. Category hues (coral, orange,
 * lime …) stay for data and illustration only, never for chrome.
 */
export const palette = {
  /** Text */
  ink: '#FFFFFF',
  inkSoft: '#FFFFFFBF',
  inkMuted: '#FFFFFF94',
  inkFaint: '#FFFFFF61',
  white: '#FFFFFF',
  /** Text/icons placed on a filled cyan accent. */
  onAccent: '#02121C',

  /** Brand accent (cyan / aqua / electric blue). `violet` and `blue` are the legacy names for it. */
  accent: '#22B8F5',
  accentStrong: '#1DAEEA',
  accentSoft: '#63D8FF',
  accentGlow: '#7AE6FF',
  blue: '#2CC6FF',
  violet: '#22B8F5',
  purple: '#1DAEEA',
  lavender: '#7AE6FF',
  sky: '#63D8FF',

  /** Data / category hues (charts, activity types, status) — tuned to read on navy. */
  coral: '#FF6B7E',
  orange: '#FFA24C',
  lime: '#8BE04E',
  aqua: '#2DD4BF',
  yellow: '#FFD166',
  pink: '#FF7AB8',
  success: '#34D399',
  danger: '#FF6B7E',

  /** Canvas and layered surfaces. */
  background: '#02060B',
  canvas: '#02060B',
  canvasMid: '#040A12',
  canvasHigh: '#07111A',
  lavenderBg: '#02060B',
  skyBg: '#02060B',
  creamBg: '#02060B',
  aquaBg: '#02060B',
  limeBg: '#02060B',
  surface: '#0B1220',
  surfaceRaised: '#101826',
  surfaceHigh: '#131D2C',
  /** Subtle fill for tracks, inactive chips, icon wells. */
  grayBg: '#121B2A',
  card: '#0B1220',
  glass: '#141822B8',
  glassStrong: '#101826',
  line: '#FFFFFF1A',
  lineStrong: '#FFFFFF29',
} as const;

export type GradientPair = readonly [string, string, ...string[]];

export const gradients = {
  /** Brand: cyan → electric blue (filled emphasis only; CTAs use the dark capsule + cyan border). */
  primary: ['#1DAEEA', '#2C7BFF'],
  splash: ['#1DAEEA', '#22B8F5', '#63D8FF'],
  berry: ['#7A5CFF', '#FF6FAE'],
  sunrise: ['#FFA250', '#F1516B'],
  ocean: ['#22B8F5', '#2DD4BF'],
  citrus: ['#FFD25A', '#FF8A3D'],
  lime: ['#8BE04E', '#1ABF87'],
  sky: ['#63D8FF', '#2C7BFF'],
  lavender: ['#7AE6FF', '#22B8F5'],
  /** Card washes: dark navy with a faint cyan lift. */
  surface: ['#0E1A2B', '#0B1220'],
  hero: ['#0D2135', '#0A1422', '#081019'],
  disabled: ['#1A2333', '#151D2B'],
} satisfies Record<string, GradientPair>;

/** Each onboarding scene owns 1–2 dominant colours; everything else is a supporting accent. */
export interface Scene {
  accent: string;
  gradient: GradientPair;
  background: string;
  blobs: [string, string, string];
}

export const scenes = {
  violet: { accent: palette.accent, gradient: gradients.primary, background: palette.canvas, blobs: ['#22B8F5', '#2C7BFF', '#63D8FF'] },
  blue: { accent: palette.blue, gradient: gradients.primary, background: palette.canvas, blobs: ['#2C7BFF', '#22B8F5', '#63D8FF'] },
  aqua: { accent: '#2DD4BF', gradient: gradients.ocean, background: palette.canvas, blobs: ['#2DD4BF', '#22B8F5', '#63D8FF'] },
  coral: { accent: '#FF6B7E', gradient: gradients.sunrise, background: palette.canvas, blobs: ['#22B8F5', '#FF6B7E', '#2C7BFF'] },
  orange: { accent: '#FFA24C', gradient: gradients.sunrise, background: palette.canvas, blobs: ['#22B8F5', '#FFA24C', '#2C7BFF'] },
  lime: { accent: '#8BE04E', gradient: gradients.lime, background: palette.canvas, blobs: ['#22B8F5', '#8BE04E', '#2C7BFF'] },
} satisfies Record<string, Scene>;

export { fonts, typography, controls } from './typography';
export type { TypographyRole } from './typography';

export const radius = { sm: 14, md: 18, lg: 22, xl: 24, pill: 999 } as const;
export const gutter = 20;
export const motion = { fast: 220, normal: 300, slow: 400, pressScale: 0.97 } as const;

/** Depth on navy: a soft dark drop (tinted shadows only for glowing accents). */
export function shadow(color = '#000000', strength = 1) {
  const glow = color.toUpperCase() !== '#000000' && color.toUpperCase() !== '#2B2370';
  return Platform.select({
    ios: { shadowColor: glow ? color : '#000000', shadowOffset: { width: 0, height: glow ? 0 : 6 * strength }, shadowOpacity: glow ? 0.28 * Math.min(strength, 1.5) : 0.35 * Math.min(strength, 1.4), shadowRadius: (glow ? 14 : 14) * strength },
    android: { elevation: Math.round(3 * strength), shadowColor: glow ? color : '#000000' },
    default: {},
  });
}

/** Screen-size awareness so heroes and type scale down on small phones instead of clipping. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const compact = height < 760;
  const tiny = height < 690;
  return { width, height, compact, tiny, typeScale: tiny ? 0.86 : compact ? 0.93 : 1, contentWidth: Math.min(width, 520) - gutter * 2 };
}

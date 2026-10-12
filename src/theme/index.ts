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
  /** Neutral studio backdrop behind product shots shown whole (equipment); matches typical white-background photos. */
  productBackdrop: '#EEF2F6',
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
export { durations, easings, timings, springs, pressScales, workoutTabCharacter, calendarFlip } from './motion';

export const radius = { xs: 10, sm: 14, md: 18, lg: 22, xl: 24, pill: 999 } as const;
export const gutter = 20;
/** 4-pt spacing scale. New layout code uses these rather than ad-hoc numbers. */
export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 } as const;
/** The only icon sizes: 16 inline/metadata, 20 controls and rows, 24 navigation and headers, 32 feature marks. */
export const iconSizes = { xs: 16, sm: 20, md: 24, lg: 32 } as const;
export type IconSize = keyof typeof iconSizes;
/** Stroke per icon size: a constant ~1.75 px line reads the same at every size and screen density. */
export const iconStroke = { xs: 1.6, sm: 1.75, md: 1.85, lg: 2 } as const;
/** Durations (ms) and the shared press scale. `instant` for state colour changes, `fast` for presses and selection. */
export const motion = { instant: 120, fast: 220, normal: 300, slow: 400, pressScale: 0.97 } as const;
/** Hairline borders that stay visible on high-density screens (2 physical px). */
export const border = { hairline: 1, strong: 1.5 } as const;

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

import type { GradientPair } from './index';

/**
 * Gym Freak logo accents (sampled from src/assets/app_logo.png), shared by the Home screen, the bottom tab bar
 * and Home's animated calendar so all three use the same orange → amber.
 *
 * Logo samples (brightest pixels per hue band): #FD4924 deep red-orange · #FE7429 orange · #FE8C31 warm orange ·
 * #FEA53A / #FFC04D amber · #FFDA62 gold highlight · #100D0D logo background.
 */
export const logoPalette = {
  deep: '#FD4924',
  orange: '#FE7429',
  warm: '#FE8C31',
  amber: '#FFB043',
  gold: '#FFDA62',
  /** Near-black canvas, nudged from the logo's #100D0D toward neutral so photos and white text stay clean. */
  canvas: '#0D0C0E',
  surface: '#17161A',
  surfaceRaised: '#1E1D22',
  line: '#FFFFFF17',
  /** Dark text on filled orange (≥ 7:1 on #FE7429). */
  onAccent: '#1A0B02',
} as const;

/** Deep orange → orange → amber: Home's CTA border, story rings, and now the tab bar's selected state. */
export const brandGradient: GradientPair = [logoPalette.deep, logoPalette.orange, logoPalette.amber];

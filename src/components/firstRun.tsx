import React, { useEffect, useId } from 'react';
import { ActivityIndicator, I18nManager, Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, FadeInDown, ReduceMotion, cancelAnimation, useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient as SvgGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Glyph, GlyphIcon, PressableScale, Txt } from './primitives';
import { fonts, motion, palette, radius } from '@/theme';
import { useReducedMotion } from '@/utils/motion';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/**
 * First-run-only visual tokens. Keep these separate from `@/theme` so the
 * signed-in product can continue to use its light visual language.
 */
export const firstRunTheme = {
  /** Deep navy-black base (top → bottom of the ambient background). */
  background: '#02060B',
  backgroundMid: '#040A12',
  backgroundHigh: '#07111A',
  /** Raised navy surfaces. */
  surface: '#0B1220',
  surfaceRaised: '#101826',
  surfacePressed: '#131D2C',
  /** Frosted pills / chips / helper cards. */
  glass: 'rgba(20,24,34,0.72)',
  glassBorder: 'rgba(255,255,255,0.10)',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.72)',
  faint: 'rgba(255,255,255,0.45)',
  line: 'rgba(255,255,255,0.10)',
  lineStrong: 'rgba(255,255,255,0.16)',
  /** Cyan / aqua brand glow (primary accent) and its supporting tints. */
  accent: '#22B8F5',
  accentAlt: '#1DAEEA',
  accentBlue: '#2CC6FF',
  accentCool: '#63D8FF',
  accentSoft: '#7AE6FF',
  danger: '#FF8F9D',
  measurementSurface: '#07111A',
  measurementText: '#FFFFFF',
  measurementMuted: 'rgba(255,255,255,0.72)',
  gradient: ['#1DAEEA', '#22B8F5', '#63D8FF', '#7AE6FF', '#1DAEEA'] as const,
} as const;

export type FirstRunAccent = string;

/**
 * Navy-black canvas with soft, static cyan ambient light: one diffused glow high on the screen and a
 * fainter one low on the opposite side. No animation, no blur layers — cheap to render on every screen.
 */
export function FirstRunBackground({ accent = firstRunTheme.accent }: { accent?: FirstRunAccent }) {
  const id = `frbg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: firstRunTheme.background }]}>
    <LinearGradient colors={[firstRunTheme.backgroundHigh, firstRunTheme.backgroundMid, firstRunTheme.background]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={`${id}a`} cx="78%" cy="12%" rx="70%" ry="42%" fx="78%" fy="12%">
          <Stop offset="0" stopColor={accent} stopOpacity="0.22" />
          <Stop offset="0.45" stopColor={accent} stopOpacity="0.07" />
          <Stop offset="1" stopColor={accent} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`${id}b`} cx="8%" cy="88%" rx="60%" ry="34%" fx="8%" fy="88%">
          <Stop offset="0" stopColor={firstRunTheme.accentBlue} stopOpacity="0.10" />
          <Stop offset="1" stopColor={firstRunTheme.accentBlue} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}a)`} />
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}b)`} />
    </Svg>
  </View>;
}

/** Frosted glass pill: translucent navy, thin border, cyan dot or icon (info pills, stat chips, badges). */
export function GlassPill({ label, value, glyph, dot = !glyph, color = firstRunTheme.accent, style }: { label: string; value?: string; glyph?: Glyph; dot?: boolean; color?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.glass, style]}>
    {Platform.OS === 'ios' ? <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} /> : null}
    {dot ? <View style={[styles.glassDot, { backgroundColor: color, shadowColor: color }]} /> : null}
    {glyph ? <GlyphIcon glyph={glyph} size={16} color={color} /> : null}
    <View style={styles.badgeCopy}>
      <Txt variant="label" color={value ? firstRunTheme.faint : firstRunTheme.muted}>{label}</Txt>
      {value ? <Txt variant="h3" color={firstRunTheme.text}>{value}</Txt> : null}
    </View>
  </View>;
}

/** Header copy used only by the redesigned first-run screens. */
export function PremiumScreenHeader({ title, subtitle, eyebrow, style }: { title: string; subtitle?: string; eyebrow?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.premiumHeading, style]}>
    {eyebrow ? <Txt variant="label" color={firstRunTheme.accent} style={styles.premiumEyebrow}>{eyebrow}</Txt> : null}
    <Txt variant="question" color={firstRunTheme.text} style={styles.premiumTitle}>{title}</Txt>
    {subtitle ? <Txt variant="body" color={firstRunTheme.muted}>{subtitle}</Txt> : null}
  </View>;
}

/** A dark first-run progress rail with the same accessible progress semantics. */
export function PremiumProgress({ total, current, color = firstRunTheme.accent }: { total: number; current: number; color?: string }) {
  return <View style={styles.progressRail} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: current + 1 }}>
    {Array.from({ length: total }, (_, index) => <View key={index} style={styles.progressSegment}>
      {index <= current ? <View style={[styles.progressFill, { backgroundColor: color }]} /> : null}
    </View>)}
  </View>;
}

/** Back affordance sized for touch and readable in both compact and large layouts. */
export function PremiumBackButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={10}
    onPress={onPress}
    style={({ pressed }) => [styles.premiumBack, pressed && styles.premiumBackPressed]}
  >
    <GlyphIcon glyph={{ set: 'mdi', name: I18nManager.isRTL ? 'chevron-right' : 'chevron-left' }} size={24} color={firstRunTheme.text} />
  </Pressable>;
}

/**
 * Capsule CTA with a slow perimeter highlight. The loop is intentionally
 * decorative and follows the system reduce-motion setting.
 */
export function PremiumCTA({ label, onPress, icon = 'arrow-forward', disabled = false, loading = false, style, testID, accessibilityLabel }: {
  label: string;
  onPress: () => void;
  icon?: string | null;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const reducedMotion = useReducedMotionForFirstRun();
  const offset = useSharedValue(0);
  const gradientId = `firstRunCta${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
  const inactive = disabled || loading;

  useEffect(() => {
    if (reducedMotion || inactive) {
      cancelAnimation(offset);
      offset.value = 0;
      return;
    }
    // The dash pattern repeats every 312 units; ending on that exact phase keeps
    // the travelling highlight from snapping when the loop restarts.
    offset.value = withRepeat(withTiming(-312, { duration: 3800, easing: Easing.linear, reduceMotion: ReduceMotion.System }), -1, false);
    return () => cancelAnimation(offset);
  }, [inactive, offset, reducedMotion]);

  return <PressableScale
    onPress={onPress}
    disabled={inactive}
    haptic="press"
    containerStyle={[styles.ctaPress, style]}
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ disabled: inactive, busy: loading }}
    testID={testID}
  >
    <View style={[styles.ctaShell, inactive && styles.ctaInactive]}>
      <LinearGradient colors={firstRunTheme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaBorder} />
      <View style={styles.ctaInner}>
        {loading ? <ActivityIndicator size="small" color={firstRunTheme.text} /> : <Txt variant="button" color={inactive ? firstRunTheme.faint : firstRunTheme.text} align="center" numberOfLines={1} style={styles.ctaLabel}>{label}</Txt>}
        {!loading && icon ? <GlyphIcon glyph={{ set: 'ion', name: icon }} size={18} color={inactive ? firstRunTheme.faint : firstRunTheme.accent} /> : null}
      </View>
      <Svg pointerEvents="none" width="100%" height={58} viewBox="0 0 100 58" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={firstRunTheme.accentAlt} stopOpacity="0.06" />
              <Stop offset="0.32" stopColor={firstRunTheme.accent} stopOpacity="0.95" />
              <Stop offset="0.62" stopColor={firstRunTheme.accentSoft} stopOpacity="1" />
              <Stop offset="1" stopColor={firstRunTheme.accentBlue} stopOpacity="0.06" />
          </SvgGradient>
        </Defs>
        <AnimatedRect
          x="1"
          y="1"
          width="98"
          height="56"
          rx="28"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.4"
          strokeDasharray="26 286"
          animatedProps={animatedProps}
          opacity={inactive ? 0.25 : 1}
        />
      </Svg>
    </View>
  </PressableScale>;
}

/** Dark selectable surface that preserves the radio/checkbox interaction model. */
export function PremiumSelectableSurface({ selected, accent = firstRunTheme.accent, onPress, children, style, containerStyle, cornerRadius = radius.lg, role = 'radio', label }: {
  selected: boolean;
  accent?: string;
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  cornerRadius?: number;
  role?: 'radio' | 'checkbox';
  label?: string;
}) {
  return <PressableScale onPress={onPress} haptic="select" scaleTo={0.98} pressDuration={160} containerStyle={containerStyle} accessibilityRole={role} accessibilityLabel={label} accessibilityState={role === 'radio' ? { selected } : { checked: selected }}>
    <View style={[styles.selectionOuter, selected && styles.selectionOuterSelected, { borderRadius: cornerRadius }, selected && { borderColor: accent, shadowColor: accent }]}>
      <View style={[styles.selectionInner, selected && styles.selectionInnerSelected, { borderRadius: Math.max(0, cornerRadius - 1) }, style]}>{children}</View>
    </View>
  </PressableScale>;
}

/** Kept for existing callers; now rendered as a frosted glass pill. */
export function PremiumInfoBadge({ label, value, glyph, color = firstRunTheme.accent, style }: { label: string; value?: string; glyph?: Glyph; color?: string; style?: StyleProp<ViewStyle> }) {
  return <GlassPill label={label} value={value} glyph={glyph} color={color} style={style} />;
}

/** Local reduced-motion hook avoids changing the app-wide motion contract. */
function useReducedMotionForFirstRun() {
  return useReducedMotion();
}

/** Subtle, static surface wash: no animated blobs or blurred layers on form screens. */
export function SurfaceBackground({ accent = palette.violet }: { accent?: string }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: palette.background }]}>
    <LinearGradient colors={[`${accent}06`, `${accent}00`]} style={styles.wash} />
  </View>;
}

/** A layout-neutral entrance wrapper, so it can wrap cards, photos, and grids alike. */
export function AnimatedCard({ children, style, delay = 0 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; delay?: number }) {
  return <Animated.View entering={FadeInDown.duration(motion.normal).delay(delay).reduceMotion(ReduceMotion.System)} style={style}>{children}</Animated.View>;
}

export function ScreenHeader({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return <View style={styles.heading}>
    {eyebrow ? <Txt variant="label" color={palette.violet} style={styles.eyebrow}>{eyebrow}</Txt> : null}
    <Txt variant="question">{title}</Txt>
    {subtitle ? <Txt variant="body" color={palette.inkMuted}>{subtitle}</Txt> : null}
  </View>;
}

export function InfoBadge({ label, value, glyph, color = palette.violet, style }: { label: string; value?: string; glyph?: Glyph; color?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.badge, { backgroundColor: `${color}08` }, style]}>
    {glyph ? <GlyphIcon glyph={glyph} size={17} color={color} /> : null}
    <View style={styles.badgeCopy}>
      <Txt variant="small" color={value ? palette.inkMuted : color}>{label}</Txt>
      {value ? <Txt variant="h3">{value}</Txt> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  premiumHeading: { gap: 10 },
  premiumTitle: { fontFamily: fonts.display, fontSize: 30, lineHeight: 38, letterSpacing: -0.8 },
  premiumEyebrow: { letterSpacing: 1.3, marginBottom: 3 },
  progressRail: { flex: 1, flexDirection: 'row', gap: 4, minHeight: 20, alignItems: 'center' },
  progressSegment: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.12)' },
  progressFill: { flex: 1, borderRadius: 2 },
  premiumBack: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: firstRunTheme.glassBorder, backgroundColor: firstRunTheme.glass, alignItems: 'center', justifyContent: 'center' },
  premiumBackPressed: { backgroundColor: firstRunTheme.surfacePressed, transform: [{ scale: 0.96 }] },
  ctaPress: { width: '100%' },
  ctaShell: { height: 58, width: '100%', borderRadius: 29, overflow: 'hidden', position: 'relative', backgroundColor: firstRunTheme.surface, shadowColor: firstRunTheme.accent, shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  ctaBorder: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 29 },
  ctaInner: { position: 'absolute', left: 1.5, right: 1.5, top: 1.5, bottom: 1.5, borderRadius: 27.5, backgroundColor: '#0A1726', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  ctaLabel: { flexShrink: 1, textTransform: 'uppercase', letterSpacing: 1.05 },
  ctaInactive: { opacity: 0.58 },
  selectionOuter: { backgroundColor: firstRunTheme.surface, borderWidth: 1, borderColor: firstRunTheme.line },
  selectionOuterSelected: { borderWidth: 1.5, shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  selectionInner: { overflow: 'hidden', backgroundColor: firstRunTheme.surface },
  selectionInnerSelected: { backgroundColor: '#0D1B2B' },
  glass: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: firstRunTheme.glassBorder, backgroundColor: firstRunTheme.glass, overflow: 'hidden' },
  glassDot: { width: 7, height: 7, borderRadius: 4, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  heading: { gap: 8 },
  eyebrow: { letterSpacing: 1, marginBottom: 3 },
  badge: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.sm },
  badgeCopy: { flexShrink: 1, minWidth: 0, gap: 2 },
});

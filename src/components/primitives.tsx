import React, { useEffect, useId, useRef } from 'react';
import { useReducedMotion } from '@/utils/motion';
import { AccessibilityState, ActivityIndicator, Animated, Easing, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Motion, { Easing as MotionEasing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { haptics } from '@/utils/haptics';
import { controls, GradientPair, gradients, motion, palette, radius, shadow, typography, useLayout } from '@/theme';

/* ───────────── Type ───────────── */

const variants = typography;
const scaled = new Set(['hero', 'display', 'question', 'number']);

export type TxtVariant = keyof typeof variants;

export function Txt({ children, variant = 'body', color = palette.ink, align, style, numberOfLines, testID }: { children: React.ReactNode; variant?: TxtVariant; color?: string; align?: TextStyle['textAlign']; style?: StyleProp<TextStyle>; numberOfLines?: number; testID?: string }) {
  const { typeScale } = useLayout();
  const base = variants[variant];
  const size = scaled.has(variant) ? { fontSize: base.fontSize * typeScale, lineHeight: base.lineHeight * typeScale } : null;
  return <Text testID={testID} maxFontSizeMultiplier={1.3} numberOfLines={numberOfLines} style={[base, size, { color, textAlign: align }, style]}>{children}</Text>;
}

/* ───────────── Icons ───────────── */

export type Glyph = { set: 'mdi' | 'ion'; name: string };
export const mdi = (name: string): Glyph => ({ set: 'mdi', name });
export const ion = (name: string): Glyph => ({ set: 'ion', name });

export function GlyphIcon({ glyph, size = 24, color = palette.ink, style }: { glyph: Glyph; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return glyph.set === 'mdi'
    ? <MaterialCommunityIcons name={glyph.name as never} size={size} color={color} style={style} />
    : <Ionicons name={glyph.name as never} size={size} color={color} style={style} />;
}

/* ───────────── Backgrounds ───────────── */

/**
 * Navy canvas with soft, static ambient light: a cyan glow high on the screen and a fainter one low
 * on the other side (the same atmosphere as onboarding). `blobs[0]` tints the main glow per screen.
 */
export function MeshBackground({ base, blobs, layout = 'default' }: { base: string; blobs: readonly [string, string, string]; animated?: boolean; layout?: 'default' | 'top' | 'center' }) {
  const id = `mesh${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const main = layout === 'center' ? { cx: '50%', cy: '30%' } : { cx: '82%', cy: '6%' };
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: base, overflow: 'hidden' }]}>
    <LinearGradient colors={[palette.canvasHigh, palette.canvasMid, base]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={`${id}a`} cx={main.cx} cy={main.cy} rx="75%" ry="38%" fx={main.cx} fy={main.cy}>
          <Stop offset="0" stopColor={blobs[0]} stopOpacity="0.20" />
          <Stop offset="0.5" stopColor={blobs[0]} stopOpacity="0.06" />
          <Stop offset="1" stopColor={blobs[0]} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`${id}b`} cx="6%" cy="92%" rx="60%" ry="30%" fx="6%" fy="92%">
          <Stop offset="0" stopColor={blobs[1]} stopOpacity="0.09" />
          <Stop offset="1" stopColor={blobs[1]} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}a)`} />
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}b)`} />
    </Svg>
  </View>;
}

export function Blob({ color, cx, cy, r, animated = true, index = 0, opacity = 0.95 }: { color: string; cx: number; cy: number; r: number; animated?: boolean; index?: number; opacity?: number }) {
  const id = `blob${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const drift = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!animated || reduced) return;
    const half = 6500 + index * 1700;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animated, drift, index, reduced]);
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [0, index % 2 ? -26 : 26] });
  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, index === 1 ? 34 : -22] });
  const size = r * 2;
  return <Animated.View style={{ position: 'absolute', left: cx - r, top: cy - r, width: size, height: size, transform: [{ translateX }, { translateY }] }}><Svg width={size} height={size}><Defs><RadialGradient id={id} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={color} stopOpacity={opacity} /><Stop offset="0.5" stopColor={color} stopOpacity={opacity * 0.45} /><Stop offset="1" stopColor={color} stopOpacity={0} /></RadialGradient></Defs><Circle cx={r} cy={r} r={r} fill={`url(#${id})`} /></Svg></Animated.View>;
}

/* ───────────── Interaction ───────────── */

export function PressableScale({ onPress, children, style, containerStyle, disabled, scaleTo = motion.pressScale, pressDuration = motion.fast, haptic = 'tap', accessibilityLabel, accessibilityState, accessibilityRole = 'button', testID }: { onPress: () => void; children: React.ReactNode; style?: StyleProp<ViewStyle>; containerStyle?: StyleProp<ViewStyle>; disabled?: boolean; scaleTo?: number; pressDuration?: number; haptic?: keyof typeof haptics | null; accessibilityLabel?: string; accessibilityState?: AccessibilityState; accessibilityRole?: 'button' | 'radio' | 'checkbox'; testID?: string }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const to = (value: number) => { scale.value = withTiming(value, { duration: pressDuration, easing: MotionEasing.out(MotionEasing.cubic), reduceMotion: ReduceMotion.System }); };
  return <Pressable accessibilityRole={accessibilityRole} accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled, ...accessibilityState }} disabled={disabled} testID={testID} onPressIn={() => to(scaleTo)} onPressOut={() => to(1)} onPress={() => { if (haptic) haptics[haptic](); onPress(); }} style={containerStyle}><Motion.View style={[style, animatedStyle]}>{children}</Motion.View></Pressable>;
}

/**
 * Primary CTA: dark navy capsule with a cyan gradient border, a soft glow and a white label —
 * the same button as onboarding. `gradient` colours the border; `compact` is the 40 px size.
 */
export function GradientButton({ label, onPress, icon = 'arrow-forward', gradient = gradients.primary, disabled = false, loading = false, style, textColor, size = 'regular', testID }: { label: string; onPress: () => void; icon?: string | null; gradient?: GradientPair; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; textColor?: string; size?: 'regular' | 'compact'; testID?: string }) {
  const inactive = disabled || loading;
  const tone = gradient[0];
  const compact = size === 'compact';
  const shape = compact ? styles.buttonCompact : styles.button;
  const radiusValue = shape.borderRadius;
  return <PressableScale onPress={onPress} disabled={inactive} haptic="press" containerStyle={style} accessibilityLabel={label} accessibilityState={{ busy: loading }} testID={testID}>
    <View style={[{ borderRadius: radiusValue }, !disabled && shadow(tone, compact ? 0.45 : 0.75)]}>
      <LinearGradient colors={disabled ? gradients.disabled : gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.buttonBorder, { borderRadius: radiusValue }]}>
        <View style={[shape, styles.buttonInner, { borderRadius: radiusValue - 1.5 }]}>
          <ButtonContent label={label} icon={icon} loading={loading} color={disabled ? palette.inkFaint : textColor ?? palette.white} iconColor={disabled ? palette.inkFaint : tone} compact={compact} />
        </View>
      </LinearGradient>
    </View>
  </PressableScale>;
}

/** Shared label + icon/spinner row; the spinner takes the icon's slot so the width never jumps. */
export function ButtonContent({ label, icon, loading, color, compact, iconColor, iconFirst }: { label: string; icon?: string | null; loading?: boolean; color: string; compact?: boolean; iconColor?: string; iconFirst?: boolean }) {
  const iconSize = compact ? 16 : controls.button.iconSize;
  return <View style={[styles.buttonRow, iconFirst && { flexDirection: 'row-reverse' }]}>
    <Txt variant="button" color={color} align="center" numberOfLines={1} style={[{ flexShrink: 1 }, compact && { fontSize: 14, lineHeight: 18 }]}>{label}</Txt>
    {loading ? <ActivityIndicator size="small" color={color} style={{ width: iconSize, height: iconSize }} /> : icon ? (icon in Ionicons.glyphMap ? <Ionicons name={icon as never} size={iconSize} color={iconColor ?? color} /> : <MaterialCommunityIcons name={icon as never} size={iconSize} color={iconColor ?? color} />) : null}
  </View>;
}

/** Crisp card with a quiet animated selection outline; never changes its layout size. */
export function SelectableSurface({ selected, accent, onPress, children, style, containerStyle, cornerRadius = radius.lg, role = 'radio', label }: { selected: boolean; accent: string; onPress: () => void; children: React.ReactNode; style?: StyleProp<ViewStyle>; containerStyle?: StyleProp<ViewStyle>; cornerRadius?: number; role?: 'radio' | 'checkbox'; label?: string }) {
  const ring = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    ring.value = withTiming(selected ? 1 : 0, { duration: motion.fast, reduceMotion: ReduceMotion.System });
  }, [ring, selected]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value }));
  return <PressableScale onPress={onPress} haptic="select" containerStyle={containerStyle} accessibilityRole={role} accessibilityLabel={label} accessibilityState={role === 'radio' ? { selected } : { checked: selected }}>
    <View style={{ borderRadius: cornerRadius, backgroundColor: palette.card }}>
      {/* Inner layer clips content; the outer one keeps the shadow (iOS drops shadows on clipped views). */}
      <View style={[styles.surface, { borderRadius: cornerRadius }, style]}>{children}</View>
      <Motion.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: cornerRadius, borderWidth: 1.5, borderColor: accent, backgroundColor: `${accent.length === 7 ? accent : palette.accent}0F` }, shadow(accent.length === 7 ? accent : palette.accent, 0.6), ringStyle]} />
    </View>
  </PressableScale>;
}

export function CheckBadge({ visible, color, size = 26, ring = false, dark = false }: { visible: boolean; color: string; size?: number; ring?: boolean; dark?: boolean }) {
  const pop = useSharedValue(visible ? 1 : 0);
  useEffect(() => { pop.value = withTiming(visible ? 1 : 0, { duration: motion.fast, reduceMotion: ReduceMotion.System }); }, [pop, visible]);
  const popStyle = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ scale: 0.9 + pop.value * 0.1 }] }));
  return <View style={{ width: size, height: size }}>
    {ring ? <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: 2, borderColor: palette.lineStrong, backgroundColor: palette.surfaceRaised }]} /> : null}
    <Motion.View style={[StyleSheet.absoluteFill, styles.check, { borderRadius: size / 2, backgroundColor: color, borderColor: dark ? '#050506' : palette.canvas }, popStyle]}><Ionicons name="checkmark" size={size * 0.62} color={palette.onAccent} /></Motion.View>
  </View>;
}

/* ───────────── Layout pieces ───────────── */

export function GlassCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.glass, shadow(undefined, 0.7), style]}>{children}</View>;
}

export function Chip({ glyph, label, color = palette.violet, style }: { glyph?: Glyph; label: string; color?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.chip, { backgroundColor: `${color}18` }, style]}>{glyph ? <GlyphIcon glyph={glyph} size={14} color={color} /> : null}<Txt variant="label" color={color}>{label}</Txt></View>;
}

/** Sticky bottom CTA area that fades the scrolling content out underneath it. */
export function BottomBar({ children, background }: { children: React.ReactNode; background: string }) {
  const insets = useSafeAreaInsets();
  return <View pointerEvents="box-none" style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) + 6 }]}>
    <LinearGradient pointerEvents="none" colors={[`${background}00`, `${background}F2`, background]} locations={[0, 0.38, 1]} style={StyleSheet.absoluteFill} />
    <View style={styles.bottomContent}>{children}</View>
  </View>;
}

export function SegmentedProgress({ total, current, color }: { total: number; current: number; color: string }) {
  const fill = useSharedValue(0);
  useEffect(() => { fill.value = 0; fill.value = withTiming(1, { duration: motion.normal, reduceMotion: ReduceMotion.System }); }, [current, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` as `${number}%` }));
  return <View style={styles.segments} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: current + 1 }}>
    {Array.from({ length: total }, (_, index) => <View key={index} style={styles.segment}>{index < current ? <View style={[styles.segmentFill, { width: '100%', backgroundColor: color }]} /> : index === current ? <Motion.View style={[styles.segmentFill, { backgroundColor: color }, fillStyle]} /> : null}</View>)}
  </View>;
}

const styles = StyleSheet.create({
  button: { minHeight: controls.button.height - 3, borderRadius: controls.button.height / 2, paddingHorizontal: controls.button.paddingHorizontal, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  buttonCompact: { minHeight: controls.button.compactHeight - 3, borderRadius: controls.button.compactHeight / 2, paddingHorizontal: 14, paddingVertical: 7, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  buttonBorder: { padding: 1.5 },
  buttonInner: { backgroundColor: '#0A1726' },
  buttonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: controls.button.iconGap, maxWidth: '100%' },
  surface: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.line, overflow: 'hidden' },
  check: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: palette.line },
  glass: { backgroundColor: palette.glass, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line, padding: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 34 },
  bottomContent: { maxWidth: 480, width: '100%', alignSelf: 'center' },
  segments: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: palette.line, overflow: 'hidden' },
  segmentFill: { height: 4, borderRadius: 2 },
});

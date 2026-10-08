import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { controls, palette, shadow } from '@/theme';
import { haptics } from '@/utils/haptics';
import { ButtonContent, GlyphIcon, GradientButton, PressableScale, Txt, type Glyph } from './primitives';

/**
 * The app's button set. Every CTA uses one of these, so heights (52 / 40), radii (16 / 12),
 * the 8 px icon gap, the 0.97 press scale and the disabled/loading states stay identical everywhere.
 */
export const PrimaryButton = GradientButton;

type ButtonProps = { label: string; onPress: () => void; icon?: string | null; iconColor?: string; iconFirst?: boolean; disabled?: boolean; loading?: boolean; size?: 'regular' | 'compact'; style?: StyleProp<ViewStyle>; color?: string; accessibilityLabel?: string; testID?: string };

function SurfaceButton({ label, onPress, icon = null, iconColor, iconFirst, disabled, loading, size = 'regular', style, color = palette.violet, accessibilityLabel, outline, testID }: ButtonProps & { outline?: boolean }) {
  const compact = size === 'compact';
  return <PressableScale onPress={onPress} disabled={disabled || loading} haptic="tap" containerStyle={style} accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ busy: loading }} testID={testID}>
    <View style={[compact ? styles.compact : styles.regular, outline ? [styles.outline, { borderColor: `${color}55` }] : [styles.secondary, shadow(undefined, 0.35)], disabled && styles.disabled]}>
      <ButtonContent label={label} icon={icon} loading={loading} color={disabled ? palette.inkFaint : color} iconColor={disabled ? undefined : iconColor} iconFirst={iconFirst} compact={compact} />
    </View>
  </PressableScale>;
}

/** White surface + hairline border; same height as the primary button. */
export function SecondaryButton(props: ButtonProps) {
  return <SurfaceButton {...props} />;
}

/** Transparent with a tinted border, for low-emphasis actions that still need a target. */
export function OutlineButton(props: ButtonProps) {
  return <SurfaceButton {...props} outline />;
}

/** Inline text action ("See all", "Clear"); keeps a 44 px touch target without a visible box. */
export function TextButton({ label, onPress, color = palette.violet, disabled, style }: { label: string; onPress: () => void; color?: string; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} hitSlop={10} onPress={() => { haptics.tap(); onPress(); }} style={({ pressed }) => [styles.text, { opacity: disabled ? 0.45 : pressed ? 0.6 : 1 }, style]}>
    <Txt variant="label" color={color}>{label}</Txt>
  </Pressable>;
}

export type IconButtonSize = keyof typeof controls.iconButton;

/** Square-ish icon control in three sizes only: sm 36, md 40, lg 44. */
export function IconButton({ glyph, onPress, label, size = 'md', tone = 'surface', color = palette.ink, disabled, style }: { glyph: Glyph; onPress: () => void; label: string; size?: IconButtonSize; tone?: 'surface' | 'tinted' | 'glass'; color?: string; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const side = controls.iconButton[size];
  const surface = tone === 'surface' ? [styles.iconSurface, shadow(undefined, 0.3)] : tone === 'tinted' ? { backgroundColor: `${color}14` } : styles.iconGlass;
  return <PressableScale onPress={onPress} disabled={disabled} haptic="tap" accessibilityLabel={label} containerStyle={style}>
    <View style={[{ width: side, height: side, borderRadius: Math.round(side * 0.32), alignItems: 'center', justifyContent: 'center' }, surface, disabled && styles.disabled]}>
      <GlyphIcon glyph={glyph} size={Math.round(side * 0.5)} color={color} />
    </View>
  </PressableScale>;
}

const styles = StyleSheet.create({
  regular: { minHeight: controls.button.height - 3, borderRadius: controls.button.height / 2, paddingHorizontal: controls.button.paddingHorizontal, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  compact: { minHeight: controls.button.compactHeight - 3, borderRadius: controls.button.compactHeight / 2, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: palette.surfaceRaised, borderWidth: 1, borderColor: palette.lineStrong },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5 },
  disabled: { opacity: 0.5 },
  text: { minHeight: 44, justifyContent: 'center' },
  iconSurface: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  iconGlass: { backgroundColor: palette.glass, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
});

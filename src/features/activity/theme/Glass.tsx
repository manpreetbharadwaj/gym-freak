import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/layout';
import { radius } from '@/theme';
import { activityTheme } from './activityGlassTheme';

/** iOS "Reduce Transparency": glass becomes an opaque surface (Android has no equivalent setting). */
export function useReducedTransparency() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AccessibilityInfo.isReduceTransparencyEnabled().then(setReduced).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

/**
 * A frosted surface: translucent fill, hairline glass border and a soft reflection along the top edge.
 * `blur` adds a real backdrop blur — iOS only, and only for small floating panels (it is GPU work every frame
 * whatever is behind it moves). Elsewhere the dark ambient canvas shows through the translucency instead.
 * With the experiment off this is exactly the shared Card.
 */
export function GlassSurface({ children, style, padded = true, strong, blur, radius: r = radius.lg, testID }: {
  children?: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean; strong?: boolean; blur?: boolean; radius?: number; testID?: string;
}) {
  const reduced = useReducedTransparency();
  if (!activityTheme.glass) return <Card style={style} padded={padded}>{children}</Card>;
  const fill = reduced ? activityTheme.solid : strong ? activityTheme.fillStrong : activityTheme.fill;
  const useBlur = blur && !reduced && Platform.OS === 'ios';
  return <View testID={testID} style={[styles.base, { borderRadius: r, backgroundColor: useBlur ? 'transparent' : fill }, padded && styles.padded, style]}>
    {useBlur ? <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} /> : null}
    {useBlur ? <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} /> : null}
    {!reduced ? <LinearGradient pointerEvents="none" colors={activityTheme.highlight} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.6 }} style={StyleSheet.absoluteFill} /> : null}
    {children}
  </View>;
}

/** Drop-in for the shared Card inside the Activity module. */
export const GlassCard = GlassSurface;

const styles = StyleSheet.create({
  base: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: activityTheme.border },
  padded: { padding: 16 },
});

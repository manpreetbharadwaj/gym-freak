import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/utils/motion';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ApiError } from '@/api/client';
import { useI18n } from '@/i18n';
import { GlyphIcon, GradientButton, mdi, Txt } from './primitives';
import { palette, radius } from '@/theme';

/** Pulsing placeholder block; compose these to mirror the real layout while data loads. */
export function Skeleton({ width = '100%', height = 16, round = 10, style }: { width?: number | `${number}%`; height?: number; round?: number; style?: StyleProp<ViewStyle> }) {
  const pulse = useRef(new Animated.Value(0.5)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);
  return <Animated.View accessibilityLabel="Loading" style={[{ width, height, borderRadius: round, backgroundColor: 'rgba(255,255,255,0.07)', opacity: pulse }, style]} />;
}

export function SkeletonList({ rows = 4, height = 76 }: { rows?: number; height?: number }) {
  return <View style={{ gap: 12 }}>{Array.from({ length: rows }, (_, i) => <Skeleton key={i} height={height} round={radius.lg} />)}</View>;
}

export function errorMessage(error: unknown, copy: { network: string; generic: string; locked: string }) {
  if (error instanceof ApiError) {
    if (error.kind === 'network') return copy.network;
    if (error.kind === 'forbidden') return copy.locked;
  }
  return copy.generic;
}

export function ErrorState({ error, onRetry, compact }: { error: unknown; onRetry?: () => void; compact?: boolean }) {
  const { dictionary } = useI18n();
  const copy = dictionary.states;
  return <View style={[styles.state, compact && { paddingVertical: 20 }]}>
    <View style={[styles.stateIcon, { backgroundColor: 'rgba(255,107,126,0.12)' }]}><GlyphIcon glyph={mdi('cloud-alert')} size={28} color={palette.coral} /></View>
    <Txt variant="h3" align="center">{copy.errorTitle}</Txt>
    <Txt variant="small" color={palette.inkMuted} align="center">{errorMessage(error, copy)}</Txt>
    {onRetry ? <GradientButton label={copy.retry} icon="refresh" onPress={onRetry} style={{ alignSelf: 'stretch', marginTop: 8 }} /> : null}
  </View>;
}

export function EmptyState({ title, body, glyph = mdi('dumbbell'), action }: { title: string; body?: string; glyph?: ReturnType<typeof mdi>; action?: React.ReactNode }) {
  return <View style={styles.state}>
    <View style={[styles.stateIcon, { backgroundColor: 'rgba(34,184,245,0.12)' }]}><GlyphIcon glyph={glyph} size={28} color={palette.accent} /></View>
    <Txt variant="h3" align="center">{title}</Txt>
    {body ? <Txt variant="small" color={palette.inkMuted} align="center">{body}</Txt> : null}
    {action}
  </View>;
}

const styles = StyleSheet.create({
  state: { alignItems: 'center', gap: 8, paddingVertical: 36, paddingHorizontal: 24, backgroundColor: palette.glass, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.line },
  stateIcon: { width: 60, height: 60, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});

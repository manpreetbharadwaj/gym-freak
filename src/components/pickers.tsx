import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Txt } from '@/components';
import { haptics } from '@/utils/haptics';
import { useReducedMotion } from '@/utils/motion';
import { fonts, palette, radius } from '@/theme';

function useSnappedValue(values: number[], value: number, onChange: (value: number) => void) {
  const last = useRef(value);
  return (index: number) => {
    const next = values[Math.max(0, Math.min(values.length - 1, index))];
    if (next !== last.current) { last.current = next; haptics.select(); onChange(next); }
  };
}

function useInitialScroll(ref: React.RefObject<ScrollView | null>, offset: number, horizontal: boolean) {
  useEffect(() => {
    const frame = requestAnimationFrame(() => ref.current?.scrollTo(horizontal ? { x: offset, animated: false } : { y: offset, animated: false }));
    return () => cancelAnimationFrame(frame);
    // Only on mount: afterwards the scroll position is the source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Snapping number wheel with a quiet selection band and adjustable screen-reader actions. */
export function WheelPicker({ min, max, value, onChange, accent, unit, itemHeight = 60, visible = 5, accessibilityLabel, dark = false }: { min: number; max: number; value: number; onChange: (value: number) => void; accent: string; unit?: string; itemHeight?: number; visible?: number; accessibilityLabel?: string; dark?: boolean }) {
  const values = useMemo(() => Array.from({ length: max - min + 1 }, (_, i) => min + i), [max, min]);
  const startOffset = (value - min) * itemHeight;
  const scrollY = useRef(new Animated.Value(startOffset)).current;
  const ref = useRef<ScrollView>(null);
  const reducedMotion = useReducedMotion();
  const snap = useSnappedValue(values, value, onChange);
  useInitialScroll(ref, startOffset, false);
  const pad = (itemHeight * (visible - 1)) / 2;
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true, listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => snap(Math.round(event.nativeEvent.contentOffset.y / itemHeight)) });

  return <View style={{ height: itemHeight * visible, width: '100%' }} accessible accessibilityRole="adjustable" accessibilityLabel={accessibilityLabel} accessibilityValue={{ min, max, now: value, text: unit ? `${value} ${unit}` : String(value) }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={({ nativeEvent }) => {
    if (nativeEvent.actionName !== 'increment' && nativeEvent.actionName !== 'decrement') return;
    const index = Math.max(0, Math.min(values.length - 1, value - min + (nativeEvent.actionName === 'increment' ? 1 : -1)));
    ref.current?.scrollTo({ y: index * itemHeight, animated: false });
    snap(index);
  }}>
    <View pointerEvents="none" style={[styles.band, { top: pad, height: itemHeight, borderColor: `${accent}44`, backgroundColor: `${accent}08` }]}>
      {unit ? <Txt variant="label" color={accent} style={styles.bandUnit}>{unit}</Txt> : null}
    </View>
    <Animated.ScrollView ref={ref} nestedScrollEnabled showsVerticalScrollIndicator={false} snapToInterval={itemHeight} decelerationRate="fast" onScroll={onScroll} scrollEventThrottle={16} contentOffset={{ x: 0, y: startOffset }} contentContainerStyle={{ paddingVertical: pad }}>
      {values.map((item, i) => {
        const input = [(i - 2) * itemHeight, (i - 1) * itemHeight, i * itemHeight, (i + 1) * itemHeight, (i + 2) * itemHeight];
        const opacity = scrollY.interpolate({ inputRange: input, outputRange: [0.2, 0.45, 1, 0.45, 0.2], extrapolate: 'clamp' });
        const scale = scrollY.interpolate({ inputRange: input, outputRange: [0.82, 0.92, 1, 0.92, 0.82], extrapolate: 'clamp' });
        return <Pressable key={item} onPress={() => ref.current?.scrollTo({ y: i * itemHeight, animated: !reducedMotion })} style={{ height: itemHeight, alignItems: 'center', justifyContent: 'center' }} accessible={false}>
           <Animated.Text allowFontScaling={false} style={[styles.wheelText, dark && styles.wheelTextDark, { opacity, transform: [{ scale: reducedMotion ? 1 : scale }] }]}>{item}</Animated.Text>
        </Pressable>;
      })}
    </Animated.ScrollView>
  </View>;
}

/**
 * Snapping ruler for height (vertical) and weight (horizontal).
 * Major ticks carry labels; the centre indicator stays fixed while the scale moves.
 */
export function RulerPicker({ min, max, value, onChange, accent, orientation, length, fade, tick = 12, majorEvery = 10, accessibilityLabel, dark = false }: { min: number; max: number; value: number; onChange: (value: number) => void; accent: string; orientation: 'horizontal' | 'vertical'; length: number; fade: string; tick?: number; majorEvery?: number; accessibilityLabel?: string; dark?: boolean }) {
  const horizontal = orientation === 'horizontal';
  // Vertical rulers read top-down from tallest, like a real height chart.
  const values = useMemo(() => { const list = Array.from({ length: max - min + 1 }, (_, i) => min + i); return horizontal ? list : list.reverse(); }, [horizontal, max, min]);
  const ref = useRef<ScrollView>(null);
  const snap = useSnappedValue(values, value, onChange);
  const startOffset = values.indexOf(value) * tick;
  useInitialScroll(ref, startOffset, horizontal);
  const pad = length / 2 - tick / 2;
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => snap(Math.round((horizontal ? event.nativeEvent.contentOffset.x : event.nativeEvent.contentOffset.y) / tick));
  const cross = horizontal ? 96 : 118;

  return <View style={[horizontal ? { width: length, height: cross } : { height: length, width: cross }]} accessible accessibilityRole="adjustable" accessibilityLabel={accessibilityLabel} accessibilityValue={{ min, max, now: value }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={({ nativeEvent }) => {
    if (nativeEvent.actionName !== 'increment' && nativeEvent.actionName !== 'decrement') return;
    const next = Math.max(min, Math.min(max, value + (nativeEvent.actionName === 'increment' ? 1 : -1)));
    const index = values.indexOf(next);
    ref.current?.scrollTo(horizontal ? { x: index * tick, animated: false } : { y: index * tick, animated: false });
    snap(index);
  }}>
    <ScrollView ref={ref} nestedScrollEnabled horizontal={horizontal} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} snapToInterval={tick} decelerationRate="fast" onScroll={onScroll} scrollEventThrottle={16} contentOffset={horizontal ? { x: startOffset, y: 0 } : { x: 0, y: startOffset }} contentContainerStyle={horizontal ? { paddingHorizontal: pad } : { paddingVertical: pad }}>
      {values.map((item) => {
        const major = item % majorEvery === 0;
        const mid = !major && item % (majorEvery / 2) === 0;
        const size = major ? 36 : mid ? 25 : 15;
        return horizontal
          ? <View key={item} style={{ width: tick, height: cross, alignItems: 'center' }}>
               <View style={{ width: major ? 2.5 : 1.5, height: size, borderRadius: 2, backgroundColor: major ? (dark ? 'rgba(255,255,255,0.55)' : palette.inkSoft) : (dark ? 'rgba(255,255,255,0.22)' : palette.inkFaint), marginTop: 8 }} />
               {major ? <Txt variant="label" color={dark ? 'rgba(255,255,255,0.62)' : palette.inkMuted} style={[styles.hLabel, { left: tick / 2 - 24 }]}>{item}</Txt> : null}
            </View>
          : <View key={item} style={{ height: tick, width: cross, justifyContent: 'center' }}>
               <View style={{ height: major ? 2.5 : 1.5, width: size, borderRadius: 2, backgroundColor: major ? (dark ? 'rgba(255,255,255,0.55)' : palette.inkSoft) : (dark ? 'rgba(255,255,255,0.22)' : palette.inkFaint), alignSelf: 'flex-end' }} />
               {major ? <Txt variant="label" color={dark ? 'rgba(255,255,255,0.62)' : palette.inkMuted} style={[styles.vLabel, { top: tick / 2 - 8 }]}>{item}</Txt> : null}
            </View>;
      })}
    </ScrollView>
    <LinearGradient pointerEvents="none" colors={[fade, `${fade}00`]} start={horizontal ? { x: 0, y: 0 } : { x: 0, y: 0 }} end={horizontal ? { x: 1, y: 0 } : { x: 0, y: 1 }} style={horizontal ? styles.fadeLeft : styles.fadeTop} />
    <LinearGradient pointerEvents="none" colors={[`${fade}00`, fade]} start={horizontal ? { x: 0, y: 0 } : { x: 0, y: 0 }} end={horizontal ? { x: 1, y: 0 } : { x: 0, y: 1 }} style={horizontal ? styles.fadeRight : styles.fadeBottom} />
     <View pointerEvents="none" style={horizontal ? [styles.hIndicator, { left: length / 2 - 1.5, backgroundColor: accent }] : [styles.vIndicator, { top: length / 2 - 1.5, backgroundColor: accent }]}>
       <View style={[horizontal ? styles.hKnob : styles.vKnob, { backgroundColor: accent, borderColor: dark ? '#07111A' : palette.white }]} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  band: { position: 'absolute', left: 0, right: 0, borderRadius: radius.sm, borderWidth: 1, justifyContent: 'center' },
  bandUnit: { position: 'absolute', right: 18 },
  wheelText: { fontFamily: fonts.bold, fontSize: 32, color: palette.ink, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  wheelTextDark: { color: '#FFFFFF' },
  hLabel: { position: 'absolute', top: 58, width: 48, textAlign: 'center' },
  vLabel: { position: 'absolute', left: 0, width: 48 },
  fadeLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 56 },
  fadeRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 56 },
  fadeTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 56 },
  fadeBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 56 },
  hIndicator: { position: 'absolute', top: 0, width: 3, height: 54, borderRadius: 2 },
  hKnob: { position: 'absolute', top: -4, left: -3.5, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: palette.line },
  vIndicator: { position: 'absolute', right: 0, height: 3, width: 64, borderRadius: 2 },
  vKnob: { position: 'absolute', left: -4, top: -3.5, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: palette.line },
});

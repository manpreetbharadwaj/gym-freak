import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Txt } from '@/components';
import { useI18n } from '@/i18n';
import { palette, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

/** 3 · 2 · 1 · GO before the first set. Spoken through the existing audio-cue setting; tap to skip. */
export function Countdown({ onDone, speak }: { onDone: () => void; speak?: (text: string) => void }) {
  const { dictionary } = useI18n();
  const copy = dictionary.player;
  const steps = ['3', '2', '1', copy.go];
  const [index, setIndex] = useState(0);
  const scale = useSharedValue(0.9);
  const done = useRef(false);
  const finish = () => { if (done.current) return; done.current = true; onDone(); };

  useEffect(() => {
    const label = steps[index];
    scale.value = 0.9;
    scale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
    if (index < 3) haptics.tap(); else haptics.success();
    speak?.(label);
    const timer = setTimeout(() => (index < steps.length - 1 ? setIndex(index + 1) : finish()), index < 3 ? 900 : 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.root}>
    <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityRole="button" accessibilityLabel={dictionary.common.skip} />
    <Txt variant="label" color={palette.violet} style={{ letterSpacing: 3 }}>{copy.get.toUpperCase()}</Txt>
    <Animated.View style={pop} accessible accessibilityLiveRegion="assertive" accessibilityLabel={steps[index]}>
      <Txt variant="number" color={index === 3 ? palette.violet : palette.ink} style={styles.digit}>{steps[index]}</Txt>
    </Animated.View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(248,248,252,0.96)', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 30 },
  /** Full-screen 3·2·1 is meant to be read at arm’s length mid-set; intentionally oversized. */
  digit: typography.countdown,
});

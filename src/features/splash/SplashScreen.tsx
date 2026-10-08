import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { AppLogo, Txt } from '@/components';
import { FirstRunBackground, firstRunTheme } from '@/components/firstRun';
import { useI18n } from '@/i18n';
import { fonts } from '@/theme';

const DURATION = 2600;
const EXIT_DURATION = 260;

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const { dictionary } = useI18n();
  const exit = useSharedValue(1);
  const tagline = useSharedValue(0);
  const done = useRef(onDone);
  const completed = useRef(false);
  done.current = onDone;

  useEffect(() => {
    let active = true;
    let finish: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      exit.value = withTiming(0, { duration: EXIT_DURATION, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System });
      finish = setTimeout(() => {
        if (!active || completed.current) return;
        completed.current = true;
        done.current();
      }, EXIT_DURATION);
    }, DURATION);
    return () => {
      active = false;
      clearTimeout(timer);
      if (finish !== undefined) clearTimeout(finish);
      cancelAnimation(exit);
    };
  }, [exit]);

  useEffect(() => {
    // The tagline follows the logo, so the two never compete for attention.
    tagline.value = withDelay(520, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }));
  }, [tagline]);

  const exitStyle = useAnimatedStyle(() => ({ opacity: exit.value, transform: [{ scale: 0.985 + exit.value * 0.015 }] }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: tagline.value * 0.9, transform: [{ translateY: (1 - tagline.value) * 6 }] }));

  return <View style={styles.root}>
    <StatusBar style="light" />
    <FirstRunBackground />
    <Animated.View style={[styles.scene, exitStyle]}>
      <AppLogo size={176} glow animated />
      <Animated.View style={[styles.taglineWrap, taglineStyle]}>
        <Txt variant="label" color={firstRunTheme.muted} align="center" style={styles.tagline}>{dictionary.splash.tagline.toUpperCase()}</Txt>
      </Animated.View>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: firstRunTheme.background },
  scene: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  taglineWrap: { position: 'absolute', bottom: '18%', left: 24, right: 24 },
  tagline: { fontFamily: fonts.displaySemibold, letterSpacing: 2.4, fontSize: 11 },
});

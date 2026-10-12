import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Motion, { Easing, interpolate, ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { calendarFlip as T, fonts } from '@/theme';
import { brandGradient } from '@/theme/brandAccent';
import { useReducedMotion } from '@/utils/motion';

/** Illustrative dates only (a counter that wraps 1–31) — never tied to real plan dates. */
const FIRST_DAY = 12;
const nextDay = (day: number) => (day % 31) + 1;

const BODY = '#232128';
const PAGE = '#2B2930';

const flipTiming = { duration: T.flipMs, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.Never };

/**
 * A small desk calendar whose top page lifts from the binding, folds toward you and over, revealing the
 * next date — a few pages, a rest, then onward. Built from views (charcoal body, logo-gradient header,
 * crisp text pages) with a perspective rotateX on the UI thread; no images.
 *
 * Runs only while its screen is focused, the app is active and Reduce Motion is off; otherwise it shows
 * `fallback` (Reduce Motion) or simply holds the current page. Decorative: hidden from screen readers.
 */
export function AnimatedCalendarIcon({ size = 36, fallback }: { size?: number; fallback: React.ReactNode }) {
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  // Two numbers, changed one at a time so neither page ever shows a wrong date for a frame (see below).
  const [day, setDay] = useState(FIRST_DAY);
  const [under, setUnder] = useState(nextDay(FIRST_DAY));
  const flip = useSharedValue(0);
  const active = focused && appActive && !reduced;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => sub.remove();
  }, []);

  // After a flip the top page is hidden (flip = 1) and the page underneath already shows the new date.
  // 1) the top page takes that same date while still hidden; 2) once drawn, it drops back to 0 (no visible change);
  // 3) only then, safely covered, does the page underneath move on to the following date.
  useEffect(() => {
    flip.value = 0;
    const id = setTimeout(() => setUnder(nextDay(day)), 120);
    return () => clearTimeout(id);
  }, [day, flip]);

  const remaining = useRef(0);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const later = (fn: () => void, ms: number) => { clearTimeout(timer); timer = setTimeout(fn, ms); };
    const flipped = () => {
      if (cancelled) return;
      setDay(nextDay);
      remaining.current -= 1;
      later(remaining.current > 0 ? flipOnce : cycle, remaining.current > 0 ? T.gapMs : T.pauseMs);
    };
    function flipOnce() {
      if (cancelled) return;
      flip.value = withTiming(1, flipTiming, (done) => { if (done) runOnJS(flipped)(); });
    }
    function cycle() { remaining.current = T.pages; flipOnce(); }
    later(cycle, T.startDelayMs);
    return () => { cancelled = true; clearTimeout(timer); flip.value = 0; };
  }, [active, flip]);

  // Lift → fold toward the viewer around the binding → over the top (gone past ~95°).
  const topPage = useAnimatedStyle(() => ({
    opacity: interpolate(flip.value, [0, 0.82, 0.95], [1, 1, 0], 'clamp'),
    transform: [{ perspective: size * 4 }, { rotateX: `${interpolate(flip.value, [0, 1], [0, 108])}deg` }],
  }));
  // The page darkens as it turns away from the light…
  const topShade = useAnimatedStyle(() => ({ opacity: interpolate(flip.value, [0, 0.6], [0, 0.5], 'clamp') }));
  // …and casts a shadow on the next page that clears as it lifts away.
  const underShade = useAnimatedStyle(() => ({ opacity: interpolate(flip.value, [0, 0.15, 0.85], [0, 0.45, 0], 'clamp') }));

  if (reduced) return <>{fallback}</>;

  const s = size / 36;
  const pageTop = 13 * s;
  const numberSize = 15 * s;
  return <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
    <View style={[styles.body, { top: 4 * s, left: 3 * s, right: 3 * s, bottom: 2 * s, borderRadius: 6 * s }]}>
      <LinearGradient colors={brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 9 * s, borderTopLeftRadius: 6 * s, borderTopRightRadius: 6 * s }} />
    </View>
    {/* Page stack under the header: the next date waits underneath, the current one flips. */}
    <View style={[styles.pages, { top: pageTop, left: 4 * s, right: 4 * s, bottom: 3 * s, borderBottomLeftRadius: 5 * s, borderBottomRightRadius: 5 * s }]}>
      <Page day={under} size={numberSize} />
      <Motion.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.shade, underShade]} />
    </View>
    <Motion.View style={[styles.pages, { top: pageTop, left: 4 * s, right: 4 * s, bottom: 3 * s, borderBottomLeftRadius: 5 * s, borderBottomRightRadius: 5 * s, transformOrigin: 'top' }, topPage]}>
      <Page day={day} size={numberSize} />
      <Motion.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.shade, topShade]} />
    </Motion.View>
    {/* Binding rings sit over everything, so the page visibly hinges beneath them. */}
    <View style={[styles.ring, { left: 11 * s, top: 1.5 * s, width: 3 * s, height: 6 * s, borderRadius: 1.5 * s }]} />
    <View style={[styles.ring, { right: 11 * s, top: 1.5 * s, width: 3 * s, height: 6 * s, borderRadius: 1.5 * s }]} />
  </View>;
}

function Page({ day, size }: { day: number; size: number }) {
  return <View style={[StyleSheet.absoluteFill, styles.page]}>
    <Text allowFontScaling={false} style={[styles.number, { fontSize: size, lineHeight: size * 1.15 }]}>{day}</Text>
  </View>;
}

const styles = StyleSheet.create({
  body: {
    position: 'absolute', backgroundColor: BODY, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.14)', overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.45, shadowRadius: 3 }, android: { elevation: 3 }, default: {} }),
  },
  pages: { position: 'absolute', overflow: 'hidden', backgroundColor: PAGE },
  page: { alignItems: 'center', justifyContent: 'center', backgroundColor: PAGE },
  number: { fontFamily: fonts.extrabold, color: '#FFFFFF', letterSpacing: -0.3, includeFontPadding: false, textAlign: 'center' },
  shade: { backgroundColor: '#000' },
  ring: { position: 'absolute', backgroundColor: '#EDE7E1', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.35)' },
});

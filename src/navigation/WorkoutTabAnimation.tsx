import React, { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Motion, { cancelAnimation, Easing, interpolate, ReduceMotion, runOnJS, useAnimatedProps, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import { workoutTabCharacter as T } from '@/theme';
import { useReducedMotion } from '@/utils/motion';
import { poseFor, repDepth, WORKOUT_MOVES, type Pose, type WorkoutMove } from './workoutPoses';

const AnimatedLine = Motion.createAnimatedComponent(Line);
const AnimatedCircle = Motion.createAnimatedComponent(Circle);

const gap = () => T.minGapMs + Math.random() * (T.maxGapMs - T.minGapMs);
// Decorative and only ever started when Reduce Motion is off, so it always plays as designed.
const fade = { duration: T.fadeMs, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.Never };

/**
 * The centre tab's icon, which now and then hands over to a tiny character doing one exercise
 * (push-up → curl → squat, in turn) and then cross-fades back. Purely decorative:
 *  - never plays with Reduce Motion on, while the app is in the background, or while `enabled` is false
 *    (e.g. a full-screen screen covers the tabs); `canPlay` lets the dock postpone it while hidden by scrolling;
 *  - one timer at a time, cleared on every state change and on unmount;
 *  - the character only exists while it's on screen, and animates on the UI thread (no React renders per frame);
 *  - touch-transparent and hidden from screen readers — the button's own label and tap are untouched.
 */
export function WorkoutTabAnimation({ children, size, color, enabled, canPlay }: { children: React.ReactNode; size: number; color: string; enabled: boolean; canPlay?: () => boolean }) {
  const reduced = useReducedMotion();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [move, setMove] = useState<WorkoutMove | null>(null);
  const show = useSharedValue(0);
  const nextMove = useRef(0);
  const canPlayRef = useRef(canPlay);
  canPlayRef.current = canPlay;
  const active = enabled && appActive && !reduced;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (ms: number) => { clearTimeout(timer); timer = setTimeout(appear, ms); };
    const finished = () => { if (cancelled) return; setMove(null); schedule(gap()); };
    function appear() {
      if (cancelled) return;
      if (canPlayRef.current && !canPlayRef.current()) { schedule(T.retryMs); return; }
      const m = WORKOUT_MOVES[nextMove.current++ % WORKOUT_MOVES.length];
      setMove(m);
      // Fade in while the first rep starts, hold for the reps, fade out once the last rep is back at rest.
      show.value = withSequence(
        withTiming(1, fade),
        withDelay(T.reps * T.repMs[m] - T.fadeMs, withTiming(0, fade, (done) => { if (done) runOnJS(finished)(); })),
      );
    }
    schedule(gap());
    return () => {
      cancelled = true;
      clearTimeout(timer);
      cancelAnimation(show);
      show.value = 0;
      setMove(null);
    };
  }, [active, show]);

  const iconStyle = useAnimatedStyle(() => ({ opacity: 1 - show.value, transform: [{ scale: interpolate(show.value, [0, 1], [1, 0.8]) }] }));
  const characterStyle = useAnimatedStyle(() => ({ opacity: show.value, transform: [{ scale: interpolate(show.value, [0, 1], [0.86, 1]) }] }));

  return <View pointerEvents="none" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Motion.View style={[styles.layer, iconStyle]}>{children}</Motion.View>
    {move ? <Motion.View style={[styles.layer, characterStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Character move={move} size={size} color={color} />
    </Motion.View> : null}
  </View>;
}

function Character({ move, size, color }: { move: WorkoutMove; size: number; color: string }) {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration: T.repMs[move], easing: Easing.linear, reduceMotion: ReduceMotion.Never }), T.reps, false);
    return () => cancelAnimation(phase);
  }, [move, phase]);
  const pose = useDerivedValue(() => poseFor(move, repDepth(phase.value)));
  const head = useAnimatedProps(() => ({ cx: pose.value.head.x, cy: pose.value.head.y }));
  const weight = useAnimatedProps(() => {
    const w = pose.value.weight;
    return w ? { cx: w.x, cy: w.y, opacity: 1 } : { cx: 16, cy: 16, opacity: 0 };
  });
  return <Svg width={size} height={size} viewBox="0 0 32 32">
    <Line x1={3} y1={28.6} x2={29} y2={28.6} stroke={color} strokeOpacity={0.35} strokeWidth={1.2} strokeLinecap="round" />
    {[0, 1, 2, 3, 4, 5].map((i) => <Limb key={i} pose={pose} index={i} color={color} />)}
    <AnimatedCircle animatedProps={head} r={2.5} fill={color} />
    <AnimatedCircle animatedProps={weight} r={2.1} fill={color} />
  </Svg>;
}

function Limb({ pose, index, color }: { pose: SharedValue<Pose>; index: number; color: string }) {
  const props = useAnimatedProps(() => pose.value.segs[index]);
  return <AnimatedLine animatedProps={props} stroke={color} strokeWidth={2.4} strokeLinecap="round" />;
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});

import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { GlyphIcon, GradientButton, mdi, OutlineButton, Txt } from '@/components';
import { useLabels } from '@/components/cards';
import { format, useI18n } from '@/i18n';
import { cancelScheduled, scheduleRestEnd } from '@/services/notifications';
import { palette, radius, shadow } from '@/theme';
import { ExerciseMedia } from '@/components/media';
import { Media } from '@/types/domain';
import { formatClock } from '@/utils/dates';
import { haptics } from '@/utils/haptics';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 236;
const STROKE = 12;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/**
 * Rest between sets. Time is derived from an absolute end timestamp, so it stays correct
 * if the app is backgrounded; a local notification covers that case.
 */
export function RestOverlay({ seconds, upNext, nextDetail, nextMedia, nextMuscle, nextPosition, nextSet, onDone, onCue }: { seconds: number; upNext: string; nextDetail?: string; nextMedia?: Media; nextMuscle?: string; nextPosition?: string; nextSet?: string; onDone: () => void; onCue?: () => void }) {
  const { dictionary } = useI18n();
  const { muscle } = useLabels();
  const copy = dictionary.player;
  const insets = useSafeAreaInsets();
  const endsAt = useRef(Date.now() + seconds * 1000);
  const total = useRef(seconds);
  const [remaining, setRemaining] = useState(seconds);
  const progress = useRef(new Animated.Value(0)).current;
  const notification = useRef<string | null>(null);
  const finished = useRef(false);
  const enter = useRef(new Animated.Value(0)).current;

  const end = (cue: boolean) => {
    if (finished.current) return;
    finished.current = true;
    progress.stopAnimation();
    cancelScheduled(notification.current);
    if (cue) { haptics.success(); onCue?.(); }
    onDone();
  };

  /** Sweeps the ring continuously (linear) from where it is now to empty at `endsAt`. */
  const sweep = () => {
    const left = Math.max(0, endsAt.current - Date.now());
    progress.stopAnimation();
    progress.setValue(1 - left / (total.current * 1000));
    Animated.timing(progress, { toValue: 1, duration: left, easing: Easing.linear, useNativeDriver: false }).start();
  };

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    sweep();
    const tick = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000));
      setRemaining((prev) => { if (left !== prev && left > 0 && left <= 3) haptics.tap(); return left; });
      if (left <= 0) end(true);
    }, 200);
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'background' && !finished.current) notification.current = await scheduleRestEnd((endsAt.current - Date.now()) / 1000, copy.restNotification);
      if (state === 'active') { cancelScheduled(notification.current); notification.current = null; sweep(); }
    });
    return () => { clearInterval(tick); sub.remove(); progress.stopAnimation(); cancelScheduled(notification.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTime = () => { endsAt.current += 15000; total.current += 15; haptics.tap(); setRemaining(Math.ceil((endsAt.current - Date.now()) / 1000)); sweep(); };
  const rise = (from: number) => ({ opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] });
  const meta = [nextMuscle ? muscle(nextMuscle) : null, nextDetail].filter(Boolean).join(' · ');

  return <View style={[StyleSheet.absoluteFill, styles.root, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 16) + 8 }]} accessibilityViewIsModal>
    <Animated.View style={[styles.header, { opacity: enter }]}>
      <View style={styles.restChip}><GlyphIcon glyph={mdi('timer-sand')} size={14} color={palette.violet} /><Txt variant="overline" color={palette.violet}>{copy.restLabel}</Txt></View>
      <Txt variant="small" color={palette.inkMuted} align="center">{copy.restHint}</Txt>
    </Animated.View>

    <Animated.View style={[styles.dial, rise(8)]} accessible accessibilityRole="timer" accessibilityLabel={`${copy.restLabel} ${formatClock(remaining)}`}>
      <View style={[styles.dialFace, shadow(palette.violet, 0.5)]} />
      <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs><SvgGradient id="restGrad" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#63D8FF" /><Stop offset="1" stopColor="#1D8FEA" /></SvgGradient></Defs>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE} fill="none" />
        <AnimatedCircle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="url(#restGrad)" strokeWidth={STROKE} strokeLinecap="round" fill="none" strokeDasharray={`${C} ${C}`} strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [0, C], extrapolate: 'clamp' })} />
      </Svg>
      <View style={styles.clock}>
        <Txt variant="number" color={palette.ink} style={styles.timer}>{formatClock(remaining)}</Txt>
        <Txt variant="label" color={palette.inkMuted}>{format(copy.restOf, { time: formatClock(total.current) })}</Txt>
      </View>
    </Animated.View>

    <Animated.View style={[styles.next, shadow(undefined, 0.5), rise(14)]}>
      <ExerciseMedia media={nextMedia ?? {}} muscle={nextMuscle} height={72} rounded={14} style={{ width: 72 }} autoPlay={false} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={styles.nextTop}>
          <Txt variant="overline" color={palette.violet}>{copy.nextLabel}</Txt>
          {nextPosition ? <Txt variant="label" color={palette.inkMuted} numberOfLines={1} style={{ flexShrink: 1 }}>{nextPosition}</Txt> : null}
        </View>
        <Txt variant="h3" numberOfLines={1}>{upNext}</Txt>
        {meta ? <Txt variant="small" color={palette.inkMuted} numberOfLines={1}>{meta}</Txt> : null}
        {nextSet ? <Txt variant="label" color={palette.ink}>{nextSet}</Txt> : null}
      </View>
    </Animated.View>

    <Animated.View style={[styles.actions, rise(18)]}>
      <OutlineButton label={copy.addTime} icon="add" iconFirst onPress={addTime} style={{ flex: 1 }} />
      <GradientButton label={copy.skipRest} icon="play-skip-forward" onPress={() => end(false)} style={{ flex: 1.4 }} />
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 20, backgroundColor: palette.background },
  header: { alignItems: 'center', gap: 8, maxWidth: 320 },
  restChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(34,184,245,0.12)' },
  dial: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  dialFace: { position: 'absolute', width: SIZE - STROKE * 2 - 16, height: SIZE - STROKE * 2 - 16, borderRadius: SIZE, backgroundColor: palette.surface },
  clock: { position: 'absolute', alignItems: 'center', gap: 2 },
  /** The rest clock is the one focal figure here, so it stays larger than the shared `number` role. */
  timer: { fontSize: 52, lineHeight: 58, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  next: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: palette.surface, borderRadius: radius.lg, padding: 12 },
  nextTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  actions: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
});

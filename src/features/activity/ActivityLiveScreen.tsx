import React, { useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { cancelAnimation, Easing, FadeIn, FadeOut, ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { GlyphIcon, mdi, PressableScale, Txt } from '@/components';
import { format, useI18n } from '@/i18n';
import { RootScreenProps } from '@/navigation/types';
import { durations, palette, radius, shadow, springs, typography, useLayout } from '@/theme';
import { haptics } from '@/utils/haptics';
import { clock, distanceUnit, distanceValue, formatElevation, paceSecPerKm, paceUnit, paceValue } from '@/utils/units';
import { ACTIVITY_TYPES, isGpsActivity } from './activityTypes';
import { RouteMap } from './components';
import { activeMs, currentPace } from './engine';
import { ActivityInProgress, tracker, useActiveSession } from './tracker';
import { useSessionMeta } from './useSessionMeta';
import { activityTheme } from './theme/activityGlassTheme';
import { GlassSurface } from './theme/Glass';
import { LinearGradient } from 'expo-linear-gradient';
import { setVoiceLanguage, speak } from './voice';
import { useDialog } from '@/components/dialogs/DialogProvider';

const COUNT_FROM = 5;
const HOLD_MS = 1200;

/** Live activity: countdown → tracking. Leaving this screen never stops the session. */
export function ActivityLiveScreen({ navigation, route }: RootScreenProps<'ActivityLive'>) {
  const dialog = useDialog();
  const { dictionary, language } = useI18n();
  const copy = dictionary.activity;
  const session = useActiveSession();
  const meta = useSessionMeta();
  const insets = useSafeAreaInsets();
  const { height } = useLayout();
  const focused = useIsFocused();
  const [count, setCount] = useState<number | null>(route.params?.type && !tracker.current() ? COUNT_FROM : null);
  const [now, setNow] = useState(Date.now());
  const startedRef = useRef(false);

  // 5-4-3-2-1-GO with voice + haptics. Tracking starts only after GO.
  useEffect(() => {
    if (count === null) return;
    setVoiceLanguage(language);
    if (count > 0) {
      speak(String(count), { interrupt: true });
      haptics.tap();
      const id = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(id);
    }
    speak(copy.voice.go, { interrupt: true });
    haptics.success();
    const type = route.params?.type;
    if (!type || startedRef.current) return;
    startedRef.current = true;
    tracker.start(type, meta(type))
      .then(() => setTimeout(() => setCount(null), 450))
      .catch((error) => {
        if (error instanceof ActivityInProgress) { setCount(null); return; }
        void dialog.showError({ title: copy.startFailed, confirmLabel: dictionary.common.close, onConfirm: () => navigation.goBack() });
      });
  }, [count]); // eslint-disable-line react-hooks/exhaustive-deps

  // Repaint once a second while visible.
  useEffect(() => {
    if (!focused || count !== null) return;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 1000);
    const sub = AppState.addEventListener('change', tick);
    return () => { clearInterval(id); sub.remove(); };
  }, [focused, count]);

  // Android back just leaves the screen; the session keeps running.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (count !== null) return true; navigation.goBack(); return true; });
    return () => sub.remove();
  }, [count, navigation]);

  useEffect(() => {
    if (count === null && !session && !route.params?.type) navigation.goBack();
    if (session?.tracker.status === 'finished') navigation.replace('ActivitySummary');
  }, [session, count, navigation, route.params?.type]);

  if (count !== null) return <Countdown value={count} label={count > 0 ? copy.getReady : ''} goLabel={copy.go} type={route.params?.type ?? 'RUNNING'} />;
  if (!session) return <View style={{ flex: 1, backgroundColor: palette.background }} />;

  const t = session.tracker;
  const gps = isGpsActivity(t.type);
  const info = ACTIVITY_TYPES[t.type];
  const system = session.meta.unitSystem;
  const elapsed = activeMs(t, now);
  const avg = paceSecPerKm(t.distanceMeters, elapsed);
  const cur = currentPace(t);
  const kcal = tracker.calories(session, now);
  const paused = t.status === 'paused';
  const signalLost = gps && !paused && t.lastFixAt != null && now - t.lastFixAt > 15_000;
  const waiting = gps && t.lastFixAt == null;

  const finish = async () => { if (await dialog.showDestructiveConfirm({ title: copy.finishTitle, description: copy.finishBody, cancelLabel: copy.keepGoing, confirmLabel: copy.finish, onConfirm: async () => { haptics.press(); await tracker.finish(); } })) navigation.replace('ActivitySummary'); };

  return <View style={[styles.root, { paddingTop: insets.top }]}>
    <StatusBar style="light" />
    {/* Glass: one static warm glow behind everything (no animation, so no per-frame cost while tracking). */}
    {activityTheme.glass ? <LinearGradient pointerEvents="none" colors={['rgba(254,116,41,0.16)', 'rgba(254,116,41,0)']} start={{ x: 0.8, y: 0 }} end={{ x: 0.3, y: 0.55 }} style={StyleSheet.absoluteFill} /> : null}
    <View style={styles.topBar}>
      <Pressable accessibilityRole="button" accessibilityLabel={dictionary.common.back} hitSlop={12} onPress={() => navigation.goBack()} style={styles.iconBtn} testID="live-minimize"><GlyphIcon glyph={mdi('chevron-down')} size={26} color={palette.ink} /></Pressable>
      <View style={[styles.typePill, { backgroundColor: info.tint }, activityTheme.glass && styles.glassEdge]}><GlyphIcon glyph={mdi(info.icon)} size={16} color={info.color} /><Txt variant="label" color={info.color}>{copy.typeLong[t.type]}</Txt></View>
      <View style={{ width: 44 }} />
    </View>

    {gps ? <View style={{ paddingHorizontal: 16 }}>
      <RouteMap route={t.route} live height={Math.max(170, height * 0.28)} testID="live-map" />
      {paused || signalLost || waiting ? <Animated.View entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)} exiting={FadeOut.duration(180)} style={[styles.mapChip, activityTheme.glass ? styles.mapChipGlass : { backgroundColor: paused ? palette.ink : 'rgba(255,209,102,0.12)' }]}>
        {activityTheme.glass ? <GlassSurface blur strong padded={false} radius={radius.md} style={StyleSheet.absoluteFill} /> : null}
        <GlyphIcon glyph={mdi(paused ? 'pause' : 'crosshairs-question')} size={14} color={activityTheme.glass ? (paused ? palette.white : activityTheme.accentSoft) : paused ? palette.white : '#B86A00'} />
        <Txt variant="label" color={activityTheme.glass ? (paused ? palette.white : activityTheme.accentSoft) : paused ? palette.white : '#B86A00'} testID="live-status">{paused ? (t.autoPaused ? copy.autoPaused : copy.paused) : waiting ? copy.gpsSearching : copy.signalLost}</Txt>
      </Animated.View> : null}
    </View> : null}

    <View style={styles.metrics}>
      <MetricsPanel>
      {gps ? <View style={styles.hero} accessible accessibilityLabel={`${copy.distance} ${distanceValue(t.distanceMeters, system)} ${distanceUnit(system)}`}>
        <Text style={[styles.heroValue, styles.heroFit]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} testID="live-distance">{distanceValue(t.distanceMeters, system)}</Text>
        <Txt variant="title" color={palette.inkMuted}>{distanceUnit(system)}</Txt>
      </View> : <View style={styles.hero} accessible accessibilityLabel={`${copy.time} ${clock(elapsed / 1000, true)}`}>
        <Text style={[styles.heroValue, styles.heroFit]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} testID="live-time">{clock(elapsed / 1000, true)}</Text>
      </View>}
      {!gps && paused ? <Txt variant="label" color={palette.inkMuted} align="center" testID="live-status">{copy.paused}</Txt> : null}

      <View style={styles.grid}>
        {gps ? <Stat label={copy.time} value={clock(elapsed / 1000, true)} testID="live-time" /> : null}
        {gps ? <Stat label={copy.currentPace} value={paceValue(cur, system)} unit={paceUnit(system)} testID="live-current-pace" /> : null}
        {gps ? <Stat label={copy.avgPace} value={paceValue(avg, system)} unit={paceUnit(system)} testID="live-avg-pace" /> : null}
        <Stat label={copy.estCalories} value={String(kcal)} unit="kcal" testID="live-calories" />
        {gps && t.elevationGainM >= 1 ? <Stat label={copy.elevation} value={formatElevation(t.elevationGainM, system)} /> : null}
      </View>
      </MetricsPanel>
    </View>

    <View style={[styles.controls, { paddingBottom: insets.bottom + 18 }]}>
      {paused ? <>
        <HoldButton label={copy.holdToFinish} onComplete={finish} />
        <RoundButton testID="live-resume" label={copy.resume} glyph="play" color={activityTheme.resume} onPress={() => { haptics.press(); tracker.resume(); setNow(Date.now()); }} />
      </> : <RoundButton testID="live-pause" label={copy.pause} glyph="pause" color={activityTheme.pause} onPress={() => { haptics.press(); tracker.pause(); setNow(Date.now()); }} />}
    </View>
  </View>;
}

/** Live metrics: a glass panel in the experiment, the plain layout otherwise. */
function MetricsPanel({ children }: { children: React.ReactNode }) {
  if (!activityTheme.glass) return <>{children}</>;
  return <GlassSurface radius={radius.xl} style={styles.metricsPanel}>{children}</GlassSurface>;
}

function Stat({ label, value, unit, testID }: { label: string; value: string; unit?: string; testID?: string }) {
  return <View style={styles.stat} accessible accessibilityLabel={`${label} ${value} ${unit ?? ''}`}>
    <Txt variant="overline" color={palette.inkMuted}>{label.toUpperCase()}</Txt>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit testID={testID}>{value}</Text>
      {unit ? <Txt variant="label" color={palette.inkMuted}>{unit}</Txt> : null}
    </View>
  </View>;
}

/** Pause / resume: presses down with the shared spring and pops in when the controls swap (pause ↔ resume + finish). */
function RoundButton({ label, glyph, color, onPress, testID }: { label: string; glyph: string; color: string; onPress: () => void; testID?: string }) {
  return <Animated.View entering={ZoomIn.springify().damping(springs.snappy.damping).stiffness(springs.snappy.stiffness).reduceMotion(ReduceMotion.System)} style={{ alignItems: 'center', gap: 6 }}>
    <PressableScale testID={testID} haptic={null} scaleTo={0.93} accessibilityLabel={label} onPress={onPress} style={[styles.round, { backgroundColor: color }, shadow(color, 1.4)]}>
      <GlyphIcon glyph={mdi(glyph)} size={36} color={palette.white} />
    </PressableScale>
    <Txt variant="label" color={palette.inkSoft}>{label}</Txt>
  </Animated.View>;
}

/** Finish needs a deliberate 1.2 s hold (then a confirmation), so it can't be hit by accident. */
function HoldButton({ label, onComplete }: { label: string; onComplete: () => void }) {
  const progress = useSharedValue(0);
  const fill = useAnimatedStyle(() => ({ height: `${progress.value * 100}%` }));
  // A firm tick when the hold completes, so you feel the moment before the confirmation appears.
  const completeHold = () => { haptics.medium(); onComplete(); };
  const begin = () => {
    haptics.tap();
    progress.value = withTiming(1, { duration: HOLD_MS, easing: Easing.linear }, (done) => { if (done) runOnJS(completeHold)(); });
  };
  const cancel = () => { cancelAnimation(progress); progress.value = withTiming(0, { duration: 160 }); };
  return <Animated.View entering={FadeIn.duration(durations.standard).reduceMotion(ReduceMotion.System)} style={{ alignItems: 'center', gap: 6 }}>
    <Pressable testID="live-finish" accessibilityRole="button" accessibilityLabel={label} accessibilityHint={label} onPressIn={begin} onPressOut={cancel} onLongPress={() => undefined} delayLongPress={HOLD_MS + 500}
      style={[styles.round, styles.finish]}>
      <Animated.View style={[styles.finishFill, fill]} />
      <GlyphIcon glyph={mdi('stop')} size={34} color={palette.danger} />
    </Pressable>
    <Txt variant="label" color={palette.inkSoft}>{label}</Txt>
  </Animated.View>;
}

function Countdown({ value, label, goLabel, type }: { value: number; label: string; goLabel: string; type: keyof typeof ACTIVITY_TYPES }) {
  const scale = useSharedValue(1.25);
  const opacity = useSharedValue(0);
  useEffect(() => {
    scale.value = 1.25; opacity.value = 0;
    scale.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
    opacity.value = withTiming(1, { duration: 220, reduceMotion: ReduceMotion.System });
  }, [value, scale, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  const info = ACTIVITY_TYPES[type];
  return <View style={[styles.countdown, { backgroundColor: info.tint }]} accessibilityLiveRegion="assertive">
    <StatusBar style="light" />
    <GlyphIcon glyph={mdi(info.icon)} size={34} color={info.color} />
    <Txt variant="label" color={palette.inkSoft}>{label}</Txt>
    <Animated.Text testID="countdown-value" style={[styles.countValue, { color: info.color }, style]}>{value > 0 ? value : goLabel}</Animated.Text>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: activityTheme.liveBackground },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  mapChip: { position: 'absolute', top: 10, left: 26, right: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: radius.md },
  metrics: { flex: 1, paddingHorizontal: 20, justifyContent: 'center', gap: 12 },
  hero: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  heroFit: { flexShrink: 1, textAlign: 'center' },
  metricsPanel: { gap: 14, paddingVertical: 20 },
  mapChipGlass: { overflow: 'hidden' },
  glassEdge: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: activityTheme.border },
  /** Outdoor-readable: the one focal figure is very large and high contrast. */
  heroValue: { ...typography.number, fontSize: 84, lineHeight: 92, letterSpacing: -3, color: palette.ink, fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  stat: { width: '50%', paddingHorizontal: 6, gap: 2 },
  statValue: { ...typography.number, fontSize: 32, lineHeight: 38, letterSpacing: -0.8, color: palette.ink, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 40, paddingTop: 12 },
  round: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  finish: { backgroundColor: activityTheme.glass ? activityTheme.fillStrong : palette.surface, borderWidth: 3, borderColor: 'rgba(255,107,126,0.12)', overflow: 'hidden' },
  finishFill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,107,126,0.12)' },
  countdown: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  countValue: { ...typography.number, fontSize: 160, lineHeight: 176, letterSpacing: -4 },
});

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Motion, { FadeIn, ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';
import { Glyph, GlyphIcon, GradientButton, IconButton, mdi, PressableScale, Txt } from '@/components';
import { Ring, useLabels } from '@/components/cards';
import { ErrorState } from '@/components/feedback';
import { ExerciseMedia, prefetchMedia } from '@/components/media';
import { prescriptionText } from '@/components/cards';
import { Countdown } from './Countdown';
import { useShareExercise } from '@/features/exercises/useShareExercise';
import { useExercise, useInvalidateAfterWorkout, usePreferences, useWorkout } from '@/hooks/queries';
import { format, useI18n } from '@/i18n';
import { RootScreenProps } from '@/navigation/types';
import { Exercise } from '@/types/domain';
import { controls, durations, gradients, gutter, palette, pressScales, radius, scenes, shadow, springs, timings } from '@/theme';
import { formatClock, formatRelativeDay } from '@/utils/dates';
import { haptics } from '@/utils/haptics';
import { AddExerciseSheet } from './AddExerciseSheet';
import { RestOverlay } from './RestOverlay';
import { ReplaceSheet } from './ReplaceSheet';
import { useWorkoutRunner } from './useWorkoutRunner';
import { useDialog } from '@/components/dialogs/DialogProvider';

const scene = scenes.violet;

export function WorkoutPlayerScreen({ route, navigation }: RootScreenProps<'WorkoutPlayer'>) {
  const dialog = useDialog();
  useKeepAwake();
  const { workoutId } = route.params;
  const { dictionary, language } = useI18n();
  const { muscle } = useLabels();
  const copy = dictionary.player;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const invalidate = useInvalidateAfterWorkout();
  const workout = useWorkout(workoutId);
  const prefs = usePreferences();
  const runner = useWorkoutRunner(workout.data);
  const [reps, setReps] = useState(0);
  const [weight, setWeight] = useState(0);
  const [replacing, setReplacing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string>();
  // 3-2-1-GO before the first set of a fresh session (not when resuming one with sets already done).
  const [countdown, setCountdown] = useState<'pending' | 'running' | 'done'>('pending');
  useEffect(() => {
    if (countdown !== 'pending' || runner.phase !== 'work') return;
    setCountdown(runner.completedSets === 0 ? 'running' : 'done');
  }, [countdown, runner.phase, runner.completedSets]);

  const { current, templateExercise, cursor, exercises } = runner;
  // Replaced or added exercises aren't in the workout template: load them from the catalog.
  const fetched = useExercise(current?.exerciseId, !!current?.exerciseId && !templateExercise);
  const catalogExercise = templateExercise ?? fetched.data?.exercise;
  const shareExercise = useShareExercise();
  const prescription = current?.prescription;
  const set = current?.sets[cursor.set];
  const timed = prescription?.mode === 'timed' || !!prescription?.durationSeconds;
  const audio = prefs.data?.audioCues ?? true;
  const restEnabled = prefs.data?.restTimerEnabled ?? true;
  const next = exercises[cursor.exercise + 1];
  const speak = (text: string) => { if (audio) Speech.speak(text, { language, rate: 1.02 }); };

  // Reset steppers to the prescription whenever the set changes.
  useEffect(() => { setReps(set?.reps ?? prescription?.repMax ?? prescription?.repMin ?? 10); setWeight(set?.weightKg ?? 0); }, [cursor.exercise, cursor.set]); // eslint-disable-line react-hooks/exhaustive-deps
  // Warm the cache for the next exercise's media.
  useEffect(() => { const upcoming = workout.data?.exercises[cursor.exercise + 1]?.exercise.media; if (upcoming) prefetchMedia([upcoming]); }, [cursor.exercise, workout.data]);

  const exitConfirm = async () => { if (await dialog.showDestructiveConfirm({ title: copy.quitTitle, description: copy.quitBody, cancelLabel: copy.keepGoing, confirmLabel: copy.quit, onConfirm: async () => { await runner.quit(); await invalidate(); } })) navigation.goBack(); };

  const finish = async () => {
    try {
      const done = await runner.finish();
      if (!done) return;
      haptics.success();
      speak(copy.speechDone);
      await invalidate();
      // The server reports exactly what this workout unlocked.
      const unlocked = (done.newAchievements ?? []).map((a) => a.title);
      const sets = done.exercises.reduce((t, e) => t + e.sets.filter((s) => s.completed).length, 0);
      navigation.replace('WorkoutComplete', { sessionId: done.id, name: done.name, minutes: Math.max(1, Math.round(done.activeDurationMs / 60000)), sets, exercises: done.exercises.filter((e) => e.sets.some((s) => s.completed)).length, newAchievements: unlocked });
    } catch {
      void dialog.showError({ title: dictionary.states.errorTitle, description: dictionary.states.generic });
    }
  };

  const completeSet = () => {
    if (!set || !prescription) return;
    const exerciseBefore = cursor.exercise;
    const hasNext = runner.completeSet(timed ? { durationSeconds: prescription.durationSeconds } : { reps, weightKg: weight || undefined });
    // The last set's cue is the workout-complete success (once the save lands), not a second buzz here.
    if (!hasNext) { finish(); return; }
    haptics.success();
    if (restEnabled && prescription.restSeconds > 0) runner.setPhase('rest');
    else if (runner.exercises[exerciseBefore + 1] && cursor.set === current!.sets.length - 1) speak(format(copy.speechNext, { name: runner.exercises[exerciseBefore + 1].name }));
  };

  const edit = async (change: () => Promise<unknown>, success: string) => {
    try { await change(); haptics.success(); setNotice(success); setTimeout(() => setNotice(undefined), 2500); }
    catch { void dialog.showError({ title: dictionary.states.errorTitle, description: copy.editFailed }); }
  };
  const pickReplacement = (e: Exercise) => { setReplacing(false); edit(() => runner.replace(e), format(copy.replaced, { name: e.name })); };
  const pickAddition = (e: Exercise) => { setAdding(false); edit(() => runner.add(e), format(copy.added, { name: e.name })); };

  if (runner.phase === 'conflict' && runner.conflict) {
    const other = runner.conflict;
    return <View style={[styles.root, styles.centered, { backgroundColor: scene.background, gap: 12 }]}>
      <StatusBar style="light" />
      <GlyphIcon glyph={mdi('progress-clock')} size={56} color={palette.violet} />
      <Txt variant="title" align="center">{copy.conflictTitle}</Txt>
      <Txt variant="body" color={palette.inkMuted} align="center">{format(copy.conflictBody, { name: other.name, when: formatRelativeDay(other.startedAt, language) })}</Txt>
      {other.workoutId ? <GradientButton label={copy.resumeOther} icon="play" gradient={gradients.primary} onPress={() => navigation.replace('WorkoutPlayer', { workoutId: other.workoutId! })} style={{ alignSelf: 'stretch', marginTop: 8 }} /> : null}
      <Pressable onPress={() => runner.discardAndStart()} style={{ padding: 12 }} accessibilityRole="button"><Txt variant="label" color={palette.coral}>{copy.discardStart}</Txt></Pressable>
      <Pressable onPress={() => navigation.goBack()} style={{ padding: 8 }} accessibilityRole="button"><Txt variant="label" color={palette.inkMuted}>{dictionary.common.close}</Txt></Pressable>
    </View>;
  }
  if (workout.error || runner.phase === 'error') return <View style={[styles.root, styles.centered, { backgroundColor: scene.background }]}><ErrorState error={workout.error ?? runner.error} onRetry={() => (workout.error ? workout.refetch() : runner.retry())} /><Pressable onPress={() => navigation.goBack()} style={{ padding: 16 }}><Txt variant="label" color={palette.inkMuted}>{dictionary.common.close}</Txt></Pressable></View>;
  if (runner.phase === 'starting' || !current || !prescription || !set) return <View style={[styles.root, styles.centered, { backgroundColor: scene.background }]}><StatusBar style="light" /><Ring size={90} stroke={8} progress={0.3} gradient={gradients.primary} /><Txt variant="h3" style={{ marginTop: 18 }}>{copy.starting}</Txt></View>;

  const mediaH = Math.min(360, height * 0.38);
  const target = timed ? format(copy.secondsTarget, { count: prescription.durationSeconds ?? 30 }) : format(copy.repsTarget, { count: prescription.repMin && prescription.repMax && prescription.repMin !== prescription.repMax ? `${prescription.repMin}–${prescription.repMax}` : prescription.repMax ?? prescription.repMin ?? 10 });
  const lastSetOfExercise = cursor.set === current.sets.length - 1;
  const restingAfter = runner.phase === 'rest';
  // During rest the cursor already points at the next set; "up next" names what follows the rest.

  return <View style={[styles.root, { backgroundColor: scene.background }]}>
    <StatusBar style="light" />
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <IconButton glyph={mdi('close')} size="lg" label={copy.quit} onPress={exitConfirm} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="label" color={palette.violet}>{format(copy.exerciseOf, { current: cursor.exercise + 1, total: exercises.length })}</Txt>
          <Txt variant="small" color={palette.inkMuted} numberOfLines={1}>{runner.session?.name}</Txt>
        </View>
        <ElapsedClock activeMs={runner.activeMs} />
      </View>
      <View style={styles.segments}>{exercises.map((e, i) => <SegmentFill key={e.id} fraction={e.sets.filter((s) => s.completed).length / e.sets.length} color={i === cursor.exercise ? palette.violet : '#22C38E'} />)}</View>

      <View style={{ paddingHorizontal: gutter, marginTop: 14 }}>
        {/* A new exercise fades in (keyed by exercise) instead of snapping; set changes within it don't remount anything. */}
        <Motion.View key={current.id} entering={FadeIn.duration(durations.large).reduceMotion(ReduceMotion.System)}>
        <View style={shadow(palette.violet, 0.9)}><ExerciseMedia key={catalogExercise?.id ?? current.id} media={catalogExercise?.media ?? {}} muscle={catalogExercise?.primaryMuscle} height={mediaH} rounded={28} /></View>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Txt variant="display" numberOfLines={2}>{catalogExercise?.name ?? current.name}</Txt>
            {current.origin === 'added' || current.origin === 'replacement' ? <View style={styles.originBadge}><Txt variant="tab" color={palette.violet}>{current.origin === 'added' ? copy.addedBadge : copy.swappedBadge}</Txt></View> : null}
            {catalogExercise ? <Txt variant="small" color={palette.inkMuted}>{muscle(catalogExercise.primaryMuscle)}</Txt> : null}
          </View>
          {catalogExercise ? <IconButton glyph={mdi('share-variant-outline')} size="md" label={dictionary.share.shareExercise} onPress={() => shareExercise(catalogExercise)} /> : null}
          {lastSetOfExercise && cursor.exercise === exercises.length - 1 ? <View style={styles.lastSet}><Txt variant="label" color={palette.coral}>{copy.lastSet}</Txt></View> : null}
        </View>
        </Motion.View>

        <View style={[styles.setCard, shadow(undefined, 0.5)]}>
          <View style={styles.setHeader}>
            <Txt variant="title">{format(copy.setOf, { current: cursor.set + 1, total: current.sets.length })}</Txt>
            <View style={styles.setDots}>{current.sets.map((s, i) => <SetDot key={s.id} completed={s.completed} current={i === cursor.set && !s.completed} />)}</View>
          </View>
          <View style={styles.targetRow}><GlyphIcon glyph={mdi('bullseye-arrow')} size={18} color={palette.orange} /><Txt variant="label" color={palette.inkMuted}>{copy.target.toUpperCase()}</Txt><Txt variant="h3">{target}</Txt></View>
          {timed ? <TimedSet key={`${cursor.exercise}-${cursor.set}`} seconds={prescription.durationSeconds ?? 30} onDone={completeSet} copy={copy} />
            : <View style={styles.steppers}>
              <Stepper label={dictionary.exercise.reps} value={reps} onChange={setReps} min={1} max={100} step={1} />
              {prescription.mode === 'strength' ? <Stepper label="kg" value={weight} onChange={setWeight} min={0} max={500} step={2.5} /> : null}
            </View>}
        </View>

        {!timed ? <GradientButton label={copy.completeSet} icon="checkmark" gradient={gradients.primary} loading={runner.phase === 'finishing'} haptic={null} onPress={completeSet} style={{ marginTop: 16 }} /> : null}
        {runner.syncFailed ? <Txt variant="small" color={palette.orange} align="center" style={{ marginTop: 8 }}>{copy.saveFailed}</Txt> : null}

        <View style={styles.controls}>
          <Control glyph={mdi('skip-previous')} label={copy.previous} disabled={cursor.exercise === 0} onPress={() => runner.goToExercise(cursor.exercise - 1)} />
          <Control glyph={mdi('swap-horizontal')} label={copy.replace} disabled={runner.changing || current.sets.every((x) => x.completed)} onPress={() => setReplacing(true)} />
          <Control glyph={mdi('information-outline')} label={copy.info} onPress={() => catalogExercise && navigation.navigate('ExerciseDetail', { exerciseId: catalogExercise.id })} />
          <Control glyph={mdi('debug-step-over')} label={copy.skip} onPress={() => (cursor.exercise < exercises.length - 1 ? runner.goToExercise(cursor.exercise + 1) : finish())} />
          <Control glyph={mdi('skip-next')} label={copy.next} disabled={cursor.exercise >= exercises.length - 1} onPress={() => runner.goToExercise(cursor.exercise + 1)} />
        </View>

        {notice ? <Txt variant="small" color={palette.success} align="center" style={{ marginTop: 10 }}>{notice}</Txt> : null}
        <Pressable onPress={() => setAdding(true)} disabled={runner.changing} style={styles.finish} accessibilityRole="button"><GlyphIcon glyph={mdi('playlist-plus')} size={18} color={palette.violet} /><Txt variant="label" color={palette.violet}>{copy.addExercise}</Txt></Pressable>
        <Pressable onPress={finish} style={[styles.finish, { marginTop: 0 }]} accessibilityRole="button"><GlyphIcon glyph={mdi('flag-checkered')} size={18} color={palette.inkMuted} /><Txt variant="label" color={palette.inkMuted}>{copy.finish} · {runner.completedSets}/{runner.totalSets}</Txt></Pressable>
      </View>
    </ScrollView>

    {restingAfter ? <RestOverlay nextDetail={prescriptionText(current.prescription, dictionary.common)} nextPosition={format(copy.exerciseOf, { current: cursor.exercise + 1, total: exercises.length })} nextSet={format(copy.setOf, { current: cursor.set + 1, total: current.sets.length })} nextMuscle={catalogExercise?.primaryMuscle} nextMedia={catalogExercise?.media} seconds={exercises[cursor.set === 0 ? cursor.exercise - 1 : cursor.exercise]?.prescription.restSeconds ?? prescription.restSeconds} upNext={catalogExercise?.name ?? current.name} onCue={() => speak(cursor.set === 0 ? format(copy.speechNext, { name: current.name }) : copy.speechRestOver)} onDone={() => runner.setPhase('work')} /> : null}
    {countdown === 'running' && runner.phase === 'work' ? <Countdown speak={speak} onDone={() => setCountdown('done')} /> : null}
    {runner.phase === 'finishing' ? <View style={[StyleSheet.absoluteFill, styles.centered, { backgroundColor: 'rgba(243,240,255,0.92)' }]}><Ring size={90} stroke={8} progress={0.7} gradient={gradients.primary} /><Txt variant="h3" style={{ marginTop: 16 }}>{copy.saving}</Txt></View> : null}
    <ReplaceSheet visible={replacing} onClose={() => setReplacing(false)} exercise={catalogExercise} onPick={pickReplacement} />
    <AddExerciseSheet visible={adding} onClose={() => setAdding(false)} exclude={exercises.map((e) => e.exerciseId ?? '')} onPick={pickAddition} />
    {runner.changing ? <View style={[StyleSheet.absoluteFill, styles.centered, { backgroundColor: 'rgba(243,240,255,0.7)' }]}><Ring size={70} stroke={7} progress={0.5} gradient={gradients.primary} /></View> : null}
  </View>;
}

function ElapsedClock({ activeMs }: { activeMs: () => number }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  return <View style={styles.elapsed}><GlyphIcon glyph={mdi('timer-outline')} size={16} color={palette.violet} /><Txt variant="label" color={palette.ink}>{formatClock(activeMs() / 1000)}</Txt></View>;
}

function Stepper({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number }) {
  const change = (delta: number) => { haptics.select(); onChange(Math.min(max, Math.max(min, Math.round((value + delta) * 10) / 10))); };
  return <View style={styles.stepper}>
    <PressableScale onPress={() => change(-step)} haptic={null} scaleTo={pressScales.icon} style={styles.stepButton} accessibilityLabel={`- ${label}`}><GlyphIcon glyph={mdi('minus')} size={22} color={palette.violet} /></PressableScale>
    <View style={{ alignItems: 'center', minWidth: 64 }}><Txt variant="metricLg">{value}</Txt><Txt variant="label" color={palette.inkMuted}>{label}</Txt></View>
    <PressableScale onPress={() => change(step)} haptic={null} scaleTo={pressScales.icon} style={styles.stepButton} accessibilityLabel={`+ ${label}`}><GlyphIcon glyph={mdi('plus')} size={22} color={palette.violet} /></PressableScale>
  </View>;
}

function TimedSet({ seconds, onDone, copy }: { seconds: number; onDone: () => void; copy: ReturnType<typeof useI18n>['dictionary']['player'] }) {
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(seconds);
  const endsAt = useRef(0);
  useEffect(() => {
    if (!running) return;
    endsAt.current = Date.now() + left * 1000;
    const t = setInterval(() => {
      const remaining = Math.max(0, (endsAt.current - Date.now()) / 1000);
      setLeft(remaining);
      if (Math.ceil(remaining) <= 3 && remaining > 0 && Math.abs(remaining - Math.round(remaining)) < 0.13) haptics.tap();
      if (remaining <= 0) { clearInterval(t); setRunning(false); onDone(); }
    }, 125);
    return () => clearInterval(t);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps
  return <View style={{ alignItems: 'center', gap: 14, marginTop: 6 }}>
    <Ring size={150} stroke={12} progress={1 - left / seconds} gradient={gradients.ocean} id="timedRing"><Txt variant="number">{formatClock(Math.ceil(left))}</Txt></Ring>
    <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
      <GradientButton label={running ? copy.pauseTimer : copy.startTimer} icon={running ? 'pause' : 'play'} gradient={gradients.ocean} onPress={() => setRunning(!running)} style={{ flex: 1 }} />
      <GradientButton label={copy.timerDone} icon="checkmark" gradient={gradients.primary} haptic={null} onPress={() => { setRunning(false); onDone(); }} style={{ flex: 1 }} />
    </View>
  </View>;
}

/** Exercise progress segment: the fill grows to its new share instead of jumping. */
function SegmentFill({ fraction, color }: { fraction: number; color: string }) {
  const fill = useSharedValue(fraction);
  useEffect(() => { fill.value = withSpring(fraction, springs.gentle); }, [fill, fraction]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, fill.value)) * 100}%` as `${number}%` }));
  return <View style={styles.segment}><Motion.View style={[styles.segmentFill, { backgroundColor: color }, fillStyle]} /></View>;
}

/** Set dot: stretches into the current-set pill, and pops once when its set is completed. */
function SetDot({ completed, current }: { completed: boolean; current: boolean }) {
  const width = useSharedValue(current ? 22 : 10);
  const pop = useSharedValue(1);
  const wasCompleted = useRef(completed);
  useEffect(() => { width.value = withTiming(current ? 22 : 10, timings.standard); }, [current, width]);
  useEffect(() => {
    if (completed && !wasCompleted.current) pop.value = withSequence(withTiming(1.45, timings.press), withSpring(1, springs.snappy));
    wasCompleted.current = completed;
  }, [completed, pop]);
  const dotStyle = useAnimatedStyle(() => ({ width: width.value, transform: [{ scale: pop.value }] }));
  return <Motion.View style={[styles.setDot, completed && { backgroundColor: '#22C38E' }, current && { backgroundColor: palette.violet }, dotStyle]} />;
}

function Control({ glyph, label, onPress, disabled }: { glyph: Glyph; label: string; onPress: () => void; disabled?: boolean }) {
  return <PressableScale onPress={onPress} disabled={disabled} containerStyle={{ flex: 1 }} accessibilityLabel={label} haptic="tap">
    <View style={[styles.control, disabled && { opacity: 0.4 }]}><View style={[styles.controlIcon, shadow(undefined, 0.35)]}><GlyphIcon glyph={glyph} size={22} color={palette.ink} /></View><Txt variant="tab" color={palette.inkMuted} numberOfLines={1}>{label}</Txt></View>
  </PressableScale>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: gutter, gap: 10 },
  elapsed: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: palette.surface, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  segments: { flexDirection: 'row', gap: 4, paddingHorizontal: gutter, marginTop: 12 },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(23,20,61,0.09)', overflow: 'hidden' },
  segmentFill: { height: 5, borderRadius: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16 },
  lastSet: { backgroundColor: 'rgba(255,107,126,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginTop: 6 },
  setCard: { backgroundColor: palette.surface, borderRadius: radius.lg, padding: 16, marginTop: 14, gap: 12 },
  setHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  setDots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  setDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.lineStrong },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  steppers: { flexDirection: 'row', gap: 10 },
  stepper: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: palette.lavenderBg, borderRadius: radius.md, padding: 8 },
  stepButton: { width: controls.iconButton.md, height: controls.iconButton.md, borderRadius: 13, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', marginTop: 18, gap: 4 },
  control: { alignItems: 'center', gap: 6 },
  controlIcon: { width: controls.iconButton.lg, height: controls.iconButton.lg, borderRadius: 14, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' },
  finish: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, padding: 10 },
  originBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(34,184,245,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 4 },
});

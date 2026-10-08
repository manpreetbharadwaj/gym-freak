import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlyphIcon, GradientButton, mdi, PressableScale, Txt } from '@/components';
import { LockBadge, prescriptionText, Ring, useLabels } from '@/components/cards';
import { PhotoWorkoutCard, WeekStrip, estimateKcal } from '@/components/dashboard';
import { EmptyState, ErrorState, Skeleton, SkeletonList } from '@/components/feedback';
import { AnimatedCard } from '@/components/firstRun';
import { Screen, Section } from '@/components/layout';
import { AssetImage } from '@/components/AssetImage';
import { ExerciseMedia } from '@/components/media';
import { AppImages, workoutImage } from '@/assets';
import { useFavorites, useToggleFavorite, useWeekPlan, useWorkouts } from '@/hooks/queries';
import { format } from '@/i18n';
import { RootStackParamList } from '@/navigation/types';
import { gradients, palette, radius, scenes, shadow } from '@/theme';
import { PlanDay, Workout } from '@/types/domain';
import { dayKey, parseDay } from '@/utils/dates';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function WorkoutPlanScreen() {
  const navigation = useNavigation<Nav>();
  const { dictionary, difficulty } = useLabels();
  const copy = dictionary.plan;
  const week = useWeekPlan();
  const workouts = useWorkouts();
  const favorites = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const plan = week.data?.plan;
  const saved = new Set((favorites.data ?? []).filter((f) => f.type === 'workout').map((f) => f.id));
  const todayKey = dayKey(new Date());
  const days = week.data?.days ?? [];
  const focus = week.data?.today;
  const upcoming = days.filter((d) => d.workout && d.status === 'upcoming' && d.date !== focus?.date);
  const completed = days.filter((d) => d.workout && d.status === 'completed');
  const open = (id: string) => navigation.navigate('WorkoutDetail', { workoutId: id });

  return <Screen scene={scenes.blue} tabBar refreshing={week.isRefetching || workouts.isRefetching} onRefresh={() => { week.refetch(); workouts.refetch(); }}>
    <Txt variant="overline" color={palette.accent}>{dictionary.nav.Workout.toUpperCase()}</Txt>
    <Txt variant="display" style={{ marginTop: 4 }}>{copy.title}</Txt>
    <Txt variant="body" color={palette.inkMuted} style={{ marginTop: 4 }}>{copy.subtitle}</Txt>

    {week.isLoading ? <View style={{ marginTop: 22, gap: 12 }}><Skeleton height={150} round={radius.xl} /><Skeleton height={86} round={radius.lg} /><SkeletonList rows={3} height={68} /></View>
      : week.error ? <View style={{ marginTop: 22 }}><ErrorState error={week.error} onRetry={() => week.refetch()} /></View>
      : <>
        {plan ? <AnimatedCard style={{ marginTop: 22 }}>
          <View style={[styles.planCard, shadow(undefined, 1)]}>
            <View style={styles.planPhoto}>
              <AssetImage asset={AppImages.gymFloor} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['rgba(8,16,27,1)', 'rgba(8,16,27,0.6)', 'rgba(8,16,27,0.15)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
            </View>
            <View style={styles.planBody}>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.planLevel}><View style={styles.levelDot} /><Txt variant="tab" color={palette.inkSoft}>{difficulty(plan.difficulty).toUpperCase()}</Txt></View>
                <Txt variant="display" color={palette.white} numberOfLines={2}>{plan.name}</Txt>
                {plan.description ? <Txt variant="small" color={palette.inkSoft} numberOfLines={2}>{plan.description}</Txt> : null}
                <View style={styles.planMetaRow}>
                  <View style={styles.planMeta}><GlyphIcon glyph={mdi('calendar-week')} size={14} color={palette.accentSoft} /><Txt variant="label" color={palette.inkSoft}>{format(dictionary.profile.perWeek, { count: plan.days.length })}</Txt></View>
                  {week.data?.assignment?.source === 'ADMIN' ? <View style={styles.planMeta}><GlyphIcon glyph={mdi('account-star-outline')} size={14} color={palette.accentSoft} /><Txt variant="label" color={palette.inkSoft}>{copy.assignedByCoach}</Txt></View> : null}
                </View>
              </View>
              <WeekRing done={completed.length} total={days.filter((d) => d.workout).length} label={copy.completed} />
            </View>
          </View>
        </AnimatedCard> : <View style={{ marginTop: 22 }}><EmptyState title={copy.noPlan} body={copy.noPlanBody} glyph={mdi('calendar-blank')} /></View>}

        {plan ? <>
          <AnimatedCard delay={60} style={{ marginTop: 16 }}><WeekStrip days={days} onPressDay={(day) => open(day.workout!.id)} /></AnimatedCard>

          <Section title={focus?.date === todayKey ? copy.todayWorkout : dictionary.home.nextUp}>
            {focus?.workout ? <AnimatedCard delay={90}><FocusWorkout day={focus} onOpen={() => open(focus.workout!.id)} onStart={() => navigation.navigate('WorkoutPlayer', { workoutId: focus.workout!.id })} /></AnimatedCard>
              : completed.length
                ? <EmptyState title={copy.weekDone} body={copy.weekDoneBody} glyph={mdi('check-decagram-outline')} />
                : <EmptyState title={copy.nextWeek} body={copy.nextWeekBody} glyph={mdi('calendar-arrow-right')} />}
          </Section>

          {upcoming.length ? <Section title={copy.upcoming}><View style={{ gap: 10 }}>{upcoming.map((day) => <DayRow key={day.date} day={day} onPress={() => open(day.workout!.id)} />)}</View></Section> : null}
          {completed.length ? <Section title={copy.completedThisWeek}><View style={{ gap: 10 }}>{completed.map((day) => <DayRow key={day.date} day={day} onPress={() => open(day.workout!.id)} />)}</View></Section> : null}
        </> : null}
      </>}

    <Section title={copy.allWorkouts}>
      {workouts.isLoading ? <SkeletonList rows={3} height={200} /> : workouts.error ? <ErrorState compact error={workouts.error} onRetry={() => workouts.refetch()} />
        : <View style={styles.grid}>{(workouts.data ?? []).map((workout) => <PhotoWorkoutCard key={workout.id} workout={workout} width="48.5%" height={196} saved={saved.has(workout.id)}
          onToggleSave={() => toggleFavorite.mutate({ type: 'workout', id: workout.id, favorite: !saved.has(workout.id) })} onPress={() => open(workout.id)} />)}</View>}
    </Section>
  </Screen>;
}

/** Today's (or the next) workout: the core card of the app — media, meta, the exercise list and a big start. */
function FocusWorkout({ day, onOpen, onStart }: { day: PlanDay; onOpen: () => void; onStart: () => void }) {
  const { dictionary, muscle, difficulty } = useLabels();
  const workout = day.workout as Workout;
  return <View style={[styles.focus, shadow(palette.accent, 0.45)]}>
    <PressableScale onPress={onOpen} scaleTo={0.99} accessibilityLabel={workout.name}>
      <View style={{ height: 176 }}>
        <ExerciseMedia media={workout.media} muscle={workout.muscleGroups[0]} fallback={workout.media.thumbnailUrl ? undefined : workoutImage(workout)} height={176} rounded={0} autoPlay={false} />
        <LinearGradient colors={['rgba(11,18,32,0)', 'rgba(11,18,32,0.55)', 'rgba(11,18,32,1)']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.focusTitle}>
          <Txt variant="overline" color={palette.accentSoft}>{workout.muscleGroups.map((m) => muscle(m).toUpperCase()).join(' · ')}</Txt>
          <Txt variant="display" color={palette.white} numberOfLines={1} style={{ marginTop: 4 }}>{workout.name}</Txt>
        </View>
        {workout.locked ? <View style={{ position: 'absolute', top: 12, right: 12 }}><LockBadge small /></View> : null}
      </View>
    </PressableScale>
    <View style={styles.focusStats}>
      <Stat glyph="timer-outline" value={`${workout.estimatedMinutes} ${dictionary.common.min}`} />
      <Stat glyph="format-list-numbered" value={format(dictionary.home.exercises, { count: workout.exercises.length })} />
      <Stat glyph="signal-cellular-2" value={difficulty(workout.difficulty)} />
      <Stat glyph="fire" value={format(dictionary.home.kcalEst, { count: estimateKcal(workout.estimatedMinutes, workout.difficulty) })} />
    </View>
    <View style={styles.exerciseList}>
      {workout.exercises.map((item, index) => <View key={item.id} style={[styles.exerciseLine, index > 0 && styles.exerciseDivider]}>
        <View style={styles.exerciseIndex}><Txt variant="label" color={palette.accent}>{index + 1}</Txt></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt variant="row" numberOfLines={1}>{item.exercise.name}</Txt>
          <Txt variant="tab" color={palette.inkMuted} numberOfLines={1}>{muscle(item.exercise.primaryMuscle)}</Txt>
        </View>
        <View style={styles.prescription}><Txt variant="label" color={palette.ink}>{prescriptionText(item, dictionary.common)}</Txt></View>
      </View>)}
      <View style={styles.restNote}><GlyphIcon glyph={mdi('timer-sand')} size={14} color={palette.inkFaint} /><Txt variant="small" color={palette.inkFaint}>{format(dictionary.plan.restBetween, { count: workout.exercises[0]?.restSeconds ?? 60 })}</Txt></View>
    </View>
    <View style={styles.focusActions}>
      {workout.locked ? <GradientButton label={dictionary.workout.locked} icon="lock-open" gradient={gradients.citrus} onPress={onOpen} style={{ flex: 1 }} />
        : <GradientButton label={dictionary.workout.start} icon="play" onPress={onStart} style={{ flex: 1 }} />}
      <PressableScale onPress={onOpen} accessibilityLabel={workout.name} containerStyle={styles.detailButton}><GlyphIcon glyph={mdi('format-list-bulleted')} size={22} color={palette.white} /></PressableScale>
    </View>
  </View>;
}

/** Sessions completed vs planned this week, as a compact ring. */
function WeekRing({ done, total, label }: { done: number; total: number; label: string }) {
  const size = 78;
  return <View style={styles.ringWrap} accessible accessibilityLabel={`${done} / ${total} ${label}`}>
    <Ring size={size} stroke={7} progress={total ? done / total : 0} gradient={gradients.primary} id="plan-ring">
      <Txt variant="metric">{done}<Txt variant="label" color={palette.inkMuted}>/{total}</Txt></Txt>
    </Ring>
    <Txt variant="tab" color={palette.inkMuted}>{label}</Txt>
  </View>;
}

function Stat({ glyph, value }: { glyph: string; value: string }) {
  return <View style={styles.stat}><GlyphIcon glyph={mdi(glyph)} size={14} color={palette.accentSoft} /><Txt variant="label" color={palette.inkSoft} numberOfLines={1}>{value}</Txt></View>;
}

function DayRow({ day, onPress }: { day: PlanDay; onPress: () => void }) {
  const { dictionary, muscle } = useLabels();
  const done = day.status === 'completed';
  const workout = day.workout!;
  const date = parseDay(day.date);
  const tone = done ? palette.success : palette.accent;
  return <PressableScale onPress={onPress} scaleTo={0.98} accessibilityLabel={`${date.toLocaleDateString(undefined, { weekday: 'long' })} ${workout.name}`}>
    <View style={styles.day}>
      <View style={styles.dayDate}>
        <Txt variant="tab" color={palette.inkMuted}>{date.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()}</Txt>
        <Txt variant="metric">{date.getDate()}</Txt>
      </View>
      <ExerciseMedia media={workout.media} muscle={workout.muscleGroups[0]} fallback={workout.media.thumbnailUrl ? undefined : workoutImage(workout)} height={52} rounded={14} style={{ width: 52 }} autoPlay={false} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="h3" numberOfLines={1}>{workout.name}</Txt>
        <Txt variant="small" color={palette.inkMuted} numberOfLines={1}>{workout.muscleGroups.map(muscle).join(' · ')} · {workout.estimatedMinutes} {dictionary.common.min}</Txt>
      </View>
      <View style={[styles.badge, { backgroundColor: `${tone}1F`, borderColor: `${tone}55` }]}>
        <GlyphIcon glyph={mdi(done ? 'check-bold' : 'clock-outline')} size={13} color={tone} />
      </View>
    </View>
  </PressableScale>;
}

const styles = StyleSheet.create({
  planCard: { borderRadius: radius.xl, overflow: 'hidden', backgroundColor: '#08101B', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  planPhoto: { position: 'absolute', top: 0, right: 0, bottom: 0, left: '35%' },
  planBody: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
  planLevel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.accent },
  planMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: palette.glass, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  focus: { backgroundColor: palette.surface, borderRadius: radius.xl, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(99,216,255,0.22)' },
  focusTitle: { position: 'absolute', left: 18, right: 18, bottom: 12 },
  focusStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: palette.glass, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  exerciseList: { marginHorizontal: 16, marginTop: 8, borderRadius: radius.md, backgroundColor: palette.canvasMid, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line, paddingHorizontal: 12 },
  exerciseLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  exerciseDivider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: palette.line },
  exerciseIndex: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(34,184,245,0.12)' },
  prescription: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: palette.surfaceRaised },
  restNote: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: palette.line },
  focusActions: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  detailButton: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.lineStrong },
  day: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: palette.surface, borderRadius: radius.lg, padding: 10, paddingRight: 14, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  dayDate: { width: 40, alignItems: 'center' },
  badge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  ringWrap: { alignItems: 'center', gap: 6, padding: 10, borderRadius: radius.lg, backgroundColor: 'rgba(8,16,27,0.78)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
});

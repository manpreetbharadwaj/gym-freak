import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomBar, GradientButton, mdi, Txt } from '@/components';
import { ExerciseRow, LockBadge, MetaPill, useLabels } from '@/components/cards';
import { ErrorState, Skeleton, SkeletonList } from '@/components/feedback';
import { Header, IconCircle } from '@/components/layout';
import { ExerciseMedia } from '@/components/media';
import { useActiveSession, useFavorites, useToggleFavorite, useWorkout } from '@/hooks/queries';
import { estimateKcal } from '@/components/dashboard';
import { GlyphIcon, PressableScale } from '@/components';
import { prescriptionText } from '@/components/cards';
import { shadow } from '@/theme';
import { format } from '@/i18n';
import { RootScreenProps } from '@/navigation/types';
import { gradients, gutter, palette, radius, scenes } from '@/theme';

const scene = scenes.violet;

export function WorkoutDetailScreen({ route, navigation }: RootScreenProps<'WorkoutDetail'>) {
  const { workoutId } = route.params;
  const { dictionary, muscle, difficulty, equipment } = useLabels();
  const copy = dictionary.workout;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const workout = useWorkout(workoutId);
  const favorites = useFavorites();
  const toggle = useToggleFavorite();
  const isFavorite = !!favorites.data?.some((f) => f.type === 'workout' && f.id === workoutId);
  const active = useActiveSession();
  const session = active.data && active.data.workoutId === workoutId ? active.data : undefined;
  const heroH = Math.min(380, height * 0.42);
  const data = workout.data;
  const gear = data ? [...new Set(data.exercises.flatMap((e) => e.exercise.equipment))] : [];

  return <View style={[styles.root, { backgroundColor: scene.background }]}>
    <StatusBar style="light" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
      <View style={{ height: heroH }}>
        {data ? <ExerciseMedia media={data.media.thumbnailUrl ? data.media : data.exercises[0]?.exercise.media ?? {}} muscle={data.muscleGroups[0]} height={heroH} rounded={0} /> : <Skeleton height={heroH} round={0} />}
        <LinearGradient colors={['rgba(23,20,61,0.35)', 'rgba(23,20,61,0)', `${scene.background}00`, scene.background]} locations={[0, 0.3, 0.75, 1]} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.body}>
        {workout.isLoading ? <View style={{ gap: 12 }}><Skeleton width="70%" height={34} /><Skeleton width="50%" /><SkeletonList rows={5} /></View>
          : workout.error || !data ? <ErrorState error={workout.error} onRetry={() => workout.refetch()} />
          : <>
            {data.locked ? <LockBadge /> : null}
            <Txt variant="display" style={{ marginTop: 6 }}>{data.name}</Txt>
            <Txt variant="body" color={palette.violet} style={{ marginTop: 4 }}>{data.muscleGroups.map(muscle).join(' • ')}</Txt>
            <View style={styles.meta}>
              <MetaPill glyph={mdi('timer-outline')} label={format(copy.minutes, { count: data.estimatedMinutes })} />
              <MetaPill glyph={mdi('format-list-numbered')} label={format(copy.exerciseCount, { count: data.exercises.length })} />
              <MetaPill glyph={mdi('signal-cellular-2')} label={difficulty(data.difficulty)} />
              <MetaPill glyph={mdi('fire')} label={format(dictionary.home.kcalEst, { count: estimateKcal(data.estimatedMinutes, data.difficulty) })} />
            </View>
            {data.description ? <Txt variant="body" color={palette.inkMuted} style={{ marginTop: 16 }}>{data.description}</Txt> : null}
            {gear.length ? <View style={{ marginTop: 18 }}><Txt variant="label" color={palette.inkMuted}>{copy.equipment.toUpperCase()}</Txt><View style={[styles.meta, { marginTop: 8 }]}>{gear.map((g) => <MetaPill key={g} glyph={mdi('dumbbell')} label={equipment(g)} />)}</View></View> : null}

            <Txt variant="title" style={{ marginTop: 28, marginBottom: 12 }}>{copy.exercises}</Txt>
            <View style={{ gap: 10 }}>{data.exercises.map((item, index) => {
              const performed = session?.exercises.find((e) => e.exerciseId === item.exerciseId);
              const state = !performed ? undefined : performed.sets.every((s) => s.completed) ? 'done' : performed.sets.some((s) => s.completed) ? 'current' : undefined;
              return <PressableScale key={item.id} onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.exerciseId, workoutId })} scaleTo={0.98} accessibilityLabel={item.exercise.name}>
                <View style={[styles.exercise, shadow(undefined, 0.45), state === 'done' && { borderColor: 'rgba(52,211,153,0.12)' }]}>
                  <ExerciseMedia media={item.exercise.media} muscle={item.exercise.primaryMuscle} height={72} rounded={16} style={{ width: 72 }} autoPlay={false} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Txt variant="label" color={palette.inkFaint}>{String(index + 1).padStart(2, '0')}</Txt>
                    <Txt variant="h3" numberOfLines={1}>{item.exercise.name}</Txt>
                    <Txt variant="small" color={palette.ink}>{prescriptionText(item, dictionary.common)}</Txt>
                    <Txt variant="small" color={palette.inkMuted}>{format(dictionary.exercise.restSec, { count: item.restSeconds })}</Txt>
                  </View>
                  {item.exercise.locked ? <LockBadge small />
                    : state ? <View style={[styles.status, { backgroundColor: state === 'done' ? 'rgba(52,211,153,0.12)' : 'rgba(34,184,245,0.12)' }]}><GlyphIcon glyph={mdi(state === 'done' ? 'check-bold' : 'progress-clock')} size={15} color={state === 'done' ? '#138A55' : palette.violet} /></View>
                    : <GlyphIcon glyph={mdi('chevron-right')} size={22} color={palette.inkFaint} />}
                </View>
              </PressableScale>;
            })}</View>
            {data.locked ? <Txt variant="small" color={palette.inkMuted} align="center" style={{ marginTop: 16 }}>{copy.lockedBody}</Txt> : null}
          </>}
      </View>
    </ScrollView>
    <View style={{ position: 'absolute', top: insets.top, left: 0, right: 0 }}>
      <Header onBack={() => navigation.goBack()} right={data ? <IconCircle glyph={mdi(isFavorite ? 'heart' : 'heart-outline')} color={isFavorite ? palette.coral : palette.ink} active={isFavorite} label={dictionary.exercise.favorite} onPress={() => toggle.mutate({ type: 'workout', id: workoutId, favorite: !isFavorite })} /> : null} />
    </View>
    {data ? <BottomBar background={scene.background}>
      {data.locked ? <GradientButton label={copy.locked} icon="lock-open" gradient={gradients.citrus} onPress={() => navigation.navigate('Upgrade')} />
        : <GradientButton label={session ? copy.resume : copy.start} icon="play" gradient={gradients.primary} onPress={() => navigation.navigate('WorkoutPlayer', { workoutId })} />}
    </BottomBar> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: gutter, marginTop: -36, maxWidth: 640, width: '100%', alignSelf: 'center', borderRadius: radius.xl },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  exercise: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: palette.surface, borderRadius: radius.lg, padding: 10, paddingRight: 14, borderWidth: 1, borderColor: palette.line },
  status: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});

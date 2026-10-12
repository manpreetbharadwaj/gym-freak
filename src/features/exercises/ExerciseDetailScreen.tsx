import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomBar, Glyph, GlyphIcon, GradientButton, IconButton, mdi, PressableScale, SecondaryButton, Txt } from '@/components';
import { LockBadge, MetaPill, useLabels } from '@/components/cards';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Card, Header, IconCircle } from '@/components/layout';
import { ExerciseMedia, visualFor } from '@/components/media';
import { useExercise, useFavorites, useToggleFavorite, useWorkout, useWorkouts } from '@/hooks/queries';
import { format } from '@/i18n';
import { RootScreenProps } from '@/navigation/types';
import { useRepos } from '@/store/session';
import { ApiError } from '@/api/client';
import { EmptyState } from '@/components/feedback';
import { useShareExercise } from './useShareExercise';
import { gradients, gutter, palette, radius, scenes, shadow } from '@/theme';
import { useDialog } from '@/components/dialogs/DialogProvider';

const scene = scenes.violet;

export function ExerciseDetailScreen({ route, navigation }: RootScreenProps<'ExerciseDetail'>) {
  const dialog = useDialog();
  const { exerciseId: routeId, workoutId, shared } = route.params;
  const { dictionary, muscle, difficulty, equipment } = useLabels();
  const copy = dictionary.exercise;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const query = useExercise(routeId);
  const workouts = useWorkouts();
  const favorites = useFavorites();
  const toggle = useToggleFavorite();
  const exercise = query.data?.exercise;
  // Shared links may use the slug; everything stateful (favorites, workouts) uses the resolved id.
  const exerciseId = exercise?.id ?? routeId;
  const isFavorite = !!favorites.data?.some((f) => f.type === 'exercise' && f.id === exerciseId);
  // The server’s gate decides (never the link, never a guess); older servers only send `locked`.
  const hasAccess = query.data?.access ? query.data.access.userHasAccess : !!exercise && !exercise.locked;
  const locked = !!exercise && !hasAccess;
  const unavailable = query.error instanceof ApiError && query.error.kind === 'not-found';
  const share = useShareExercise();
  const { gym: repo } = useRepos();
  // Shared-link analytics: viewed / premium-locked once, and upgrade completed when access flips.
  const tracked = useRef(false);
  const wasLocked = useRef(false);
  // A second shared link reuses this screen with new params: track it as a new view.
  useEffect(() => { tracked.current = false; wasLocked.current = false; }, [routeId]);
  useEffect(() => {
    if (!shared || !exercise) return;
    if (!tracked.current) { tracked.current = true; repo.trackShare(locked ? 'shared_exercise_premium_locked' : 'shared_exercise_viewed', exercise.id); }
    if (locked) wasLocked.current = true;
    else if (wasLocked.current) { wasLocked.current = false; repo.trackShare('shared_exercise_upgrade_completed', exercise.id); }
  }, [exercise, locked, repo, shared]);
  const unlock = () => { if (shared && exercise) repo.trackShare('shared_exercise_upgrade_started', exercise.id); navigation.navigate('Upgrade'); };
  const mediaH = Math.min(440, height * 0.48);
  // Opened from a workout: that workout's prescription and its exercise order (Previous / Next).
  const context = useWorkout(workoutId ?? '', !!workoutId);
  const items = context.data?.exercises ?? [];
  const position = items.findIndex((e) => e.exerciseId === exerciseId);
  const go = (offset: number) => { const target = items[position + offset]; if (target) navigation.replace('ExerciseDetail', { exerciseId: target.exerciseId, workoutId }); };
  // Otherwise: how the exercise is programmed in the first workout that uses it.
  const prescription = (position >= 0 ? items[position] : undefined) ?? workouts.data?.flatMap((w) => w.exercises).find((e) => e.exerciseId === exerciseId);
  const visual = visualFor(exercise?.primaryMuscle);
  const { gym } = useRepos();
  const [adding, setAdding] = useState(false);
  /** Adds the exercise to the workout in progress, for that session only (the template is untouched). */
  const addToWorkout = async () => {
    if (!exercise) return;
    setAdding(true);
    try {
      const active = await gym.getActiveSession();
      if (!active) { await dialog.showWarning({ title: copy.addToWorkout, description: copy.noActiveWorkout }); return; }
      await gym.addSessionExercise(active.id, exercise.id);
      if (active.workoutId) {
        const open = await dialog.showSuccess({ title: format(dictionary.player.added, { name: exercise.name }), description: format(copy.addedToSession, { name: active.name }), cancelLabel: dictionary.common.close, confirmLabel: copy.openWorkout });
        if (open) navigation.navigate('WorkoutPlayer', { workoutId: active.workoutId });
      } else await dialog.showSuccess({ title: format(dictionary.player.added, { name: exercise.name }), description: format(copy.addedToSession, { name: active.name }), confirmLabel: dictionary.common.close });
    } catch {
      void dialog.showError({ title: dictionary.states.errorTitle, description: dictionary.player.editFailed });
    } finally { setAdding(false); }
  };

  if (unavailable) return <View style={[styles.root, { backgroundColor: scene.background, paddingTop: insets.top }]}>
    <StatusBar style="light" />
    <Header onBack={() => navigation.goBack()} />
    <View style={styles.unavailable}>
      <EmptyState glyph={mdi('dumbbell')} title={dictionary.share.unavailableTitle} body={dictionary.share.unavailableBody} />
      <GradientButton label={dictionary.share.explore} icon="search" onPress={() => navigation.navigate('Tabs', { screen: 'Explore' })} style={{ alignSelf: 'stretch' }} />
      <SecondaryButton label={dictionary.share.home} icon="home-outline" iconFirst color={palette.ink} onPress={() => navigation.navigate('Tabs', { screen: 'Home' })} style={{ alignSelf: 'stretch' }} />
    </View>
  </View>;

  return <View style={[styles.root, { backgroundColor: scene.background }]}>
    <StatusBar style="light" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
      {exercise ? (locked ? <ExerciseMedia media={{}} muscle={exercise.primaryMuscle} height={mediaH} rounded={0} /> : <ExerciseMedia media={exercise.media} muscle={exercise.primaryMuscle} height={mediaH} rounded={0} />) : <Skeleton height={mediaH} round={0} />}
      <View style={styles.sheet}>
        {query.isLoading ? <View style={{ gap: 12 }}><Skeleton width="75%" height={34} /><Skeleton height={90} round={radius.lg} /><Skeleton height={160} round={radius.lg} /></View>
          : query.error || !exercise ? <ErrorState error={query.error} onRetry={() => query.refetch()} />
          : <>
            {position >= 0 && context.data ? <Txt variant="label" color={palette.violet}>{context.data.name.toUpperCase()} · {format(copy.ofWorkout, { current: position + 1, total: items.length })}</Txt> : null}
            <View style={styles.titleRow}><Txt variant="display" style={{ flex: 1 }}>{exercise.name}</Txt>{locked ? <LockBadge /> : null}</View>
            <View style={styles.facts}>
              <Fact label={copy.target} value={muscle(exercise.primaryMuscle)} glyph={visual.glyph} color={visual.color} />
              <Fact label={copy.difficulty} value={difficulty(exercise.difficulty)} glyph={mdi('signal-cellular-2')} color={palette.orange} />
            </View>
            <View style={styles.chips}>
              {exercise.secondaryMuscles.length ? <ChipGroup label={copy.secondary} items={exercise.secondaryMuscles.map(muscle)} /> : null}
              <ChipGroup label={copy.equipment} items={exercise.equipment.length ? exercise.equipment.map(equipment) : [copy.none]} />
            </View>

            {prescription ? <Card style={styles.prescription}>
              <Txt variant="label" color={palette.inkMuted}>{copy.prescription.toUpperCase()}</Txt>
              <View style={styles.prescriptionRow}>
                <Big value={String(prescription.sets)} label={copy.sets} />
                <Divider />
                {prescription.durationSeconds ? <Big value={`${prescription.durationSeconds}s`} label={copy.duration} /> : <Big value={prescription.repMin && prescription.repMax && prescription.repMin !== prescription.repMax ? `${prescription.repMin}–${prescription.repMax}` : String(prescription.repMax ?? prescription.repMin ?? '—')} label={copy.reps} />}
                <Divider />
                <Big value={`${prescription.restSeconds}s`} label={copy.rest} />
              </View>
            </Card> : null}

            {locked ? <Card style={styles.premium}>
              <View style={styles.premiumIcon}><GlyphIcon glyph={mdi('crown')} size={26} color={palette.white} /></View>
              <Txt variant="title" align="center">{dictionary.share.premiumTitle}</Txt>
              <Txt variant="small" color={palette.inkMuted} align="center">{dictionary.share.premiumBody}</Txt>
              <GradientButton label={dictionary.share.unlock} icon="lock-open" onPress={unlock} style={{ alignSelf: 'stretch', marginTop: 6 }} />
              <SecondaryButton label={dictionary.share.maybeLater} color={palette.inkSoft} onPress={() => navigation.goBack()} style={{ alignSelf: 'stretch' }} />
            </Card> : <>
              {exercise.instructions.length ? <Block title={copy.howTo} glyph={mdi('format-list-numbered')} color={palette.violet}>
                {exercise.instructions.map((step, i) => <View key={i} style={styles.step}><View style={styles.stepNumber}><Txt variant="label" color={palette.white}>{i + 1}</Txt></View><Txt variant="body" style={{ flex: 1 }}>{step}</Txt></View>)}
              </Block> : null}
              {exercise.formTips.length ? <Block title={copy.formTips} glyph={mdi('lightbulb-on-outline')} color="#22A35A">{exercise.formTips.map((tip, i) => <Bullet key={i} text={tip} glyph={mdi('check-circle')} color="#22A35A" />)}</Block> : null}
              {exercise.commonMistakes.length ? <Block title={copy.mistakes} glyph={mdi('alert-circle-outline')} color={palette.coral}>{exercise.commonMistakes.map((tip, i) => <Bullet key={i} text={tip} glyph={mdi('close-circle')} color={palette.coral} />)}</Block> : null}
              {exercise.breathing ? <Block title={copy.breathing} glyph={mdi('weather-windy')} color={palette.sky}><Txt variant="body">{exercise.breathing}</Txt></Block> : null}
            </>}

            {query.data?.workouts.length ? <View style={{ marginTop: 24 }}>
              <Txt variant="label" color={palette.inkMuted}>{copy.usedIn.toUpperCase()}</Txt>
              <View style={styles.usedIn}>{query.data.workouts.map((w) => <PressableScale key={w.id} onPress={() => navigation.push('WorkoutDetail', { workoutId: w.id })}><MetaPill glyph={mdi('dumbbell')} label={w.name} /></PressableScale>)}</View>
            </View> : null}
          </>}
      </View>
    </ScrollView>
    <View style={{ position: 'absolute', top: insets.top, left: 0, right: 0 }}>
      <Header onBack={() => navigation.goBack()} right={exercise ? <View style={{ flexDirection: 'row', gap: 10 }}>
        <IconCircle glyph={mdi('share-variant-outline')} label={dictionary.share.shareExercise} onPress={() => share(exercise)} />
        {!locked ? <IconCircle glyph={mdi(isFavorite ? 'heart' : 'heart-outline')} color={isFavorite ? palette.coral : palette.ink} active={isFavorite} label={isFavorite ? copy.favorited : copy.favorite} onPress={() => toggle.mutate({ type: 'exercise', id: exerciseId, favorite: !isFavorite })} /> : null}
      </View> : null} />
    </View>
    {exercise && !locked && workoutId && position >= 0 ? <BottomBar background={scene.background}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <IconButton glyph={mdi('chevron-left')} size="cta" label={dictionary.player.previous} disabled={position <= 0} onPress={() => go(-1)} />
        <GradientButton label={copy.startSet} icon="play" onPress={() => navigation.navigate('WorkoutPlayer', { workoutId })} style={{ flex: 1 }} />
        <IconButton glyph={mdi('chevron-right')} size="cta" label={dictionary.player.next} disabled={position >= items.length - 1} onPress={() => go(1)} />
      </View>
    </BottomBar> : exercise && !locked ? <BottomBar background={scene.background}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <SecondaryButton label={isFavorite ? copy.favorited : copy.favorite} icon={isFavorite ? 'heart' : 'heart-outline'} iconColor={palette.coral} iconFirst color={palette.ink} onPress={() => toggle.mutate({ type: 'exercise', id: exerciseId, favorite: !isFavorite })} style={{ flex: 1 }} />
        <GradientButton label={copy.addToWorkout} icon={null} loading={adding} onPress={addToWorkout} style={{ flex: 1.4 }} />
      </View>
    </BottomBar> : null}
  </View>;
}

function Fact({ label, value, glyph, color }: { label: string; value: string; glyph: Glyph; color: string }) {
  return <View style={[styles.fact, shadow(undefined, 0.4)]}>
    <LinearGradient colors={[`${color}`, `${color}CC`]} style={styles.factIcon}><GlyphIcon glyph={glyph} size={20} color={palette.white} /></LinearGradient>
    <View style={{ flex: 1 }}><Txt variant="label" color={palette.inkMuted}>{label}</Txt><Txt variant="h3" numberOfLines={1}>{value}</Txt></View>
  </View>;
}

function ChipGroup({ label, items }: { label: string; items: string[] }) {
  return <View style={{ gap: 8 }}><Txt variant="label" color={palette.inkMuted}>{label.toUpperCase()}</Txt><View style={styles.usedIn}>{items.map((item) => <View key={item} style={styles.chip}><Txt variant="label" color={palette.inkSoft}>{item}</Txt></View>)}</View></View>;
}

function Block({ title, glyph, color, children }: { title: string; glyph: Glyph; color: string; children: React.ReactNode }) {
  return <Card style={{ marginTop: 16, gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={[styles.blockIcon, { backgroundColor: `${color}1A` }]}><GlyphIcon glyph={glyph} size={18} color={color} /></View><Txt variant="h3">{title}</Txt></View>
    {children}
  </Card>;
}

const Bullet = ({ text, glyph, color }: { text: string; glyph: Glyph; color: string }) => <View style={styles.step}><GlyphIcon glyph={glyph} size={18} color={color} style={{ marginTop: 2 }} /><Txt variant="body" style={{ flex: 1 }}>{text}</Txt></View>;
const Big = ({ value, label }: { value: string; label: string }) => <View style={{ flex: 1, alignItems: 'center' }}><Txt variant="metric">{value}</Txt><Txt variant="small" color={palette.inkMuted}>{label}</Txt></View>;
const Divider = () => <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: palette.line }} />;

const styles = StyleSheet.create({
  root: { flex: 1 },
  sheet: { marginTop: -28, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: scene.background, paddingHorizontal: gutter, paddingTop: 22, maxWidth: 640, width: '100%', alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  facts: { flexDirection: 'row', gap: 10, marginTop: 16 },
  fact: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.surface, borderRadius: radius.md, padding: 10 },
  factIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: 14, marginTop: 16 },
  chip: { backgroundColor: palette.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: palette.line },
  prescription: { marginTop: 18, gap: 12 },
  prescriptionRow: { flexDirection: 'row', alignItems: 'center' },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNumber: { width: 26, height: 26, borderRadius: 9, backgroundColor: palette.violet, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  blockIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  usedIn: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  premium: { marginTop: 18, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(34,184,245,0.12)' },
  premiumIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.violet },
  unavailable: { flex: 1, justifyContent: 'center', paddingHorizontal: gutter, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
});

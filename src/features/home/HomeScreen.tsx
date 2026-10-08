import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlyphIcon, GradientButton, IconButton, mdi, PressableScale, Txt } from '@/components';
import { useLabels } from '@/components/cards';
import { MetricStrip, MetricTile, PhotoHeroCard, PhotoWorkoutCard, QuickAccessRail, QuickAccessSkeleton, QuickItem, WaterCard, WeekStrip, estimateKcal } from '@/components/dashboard';
import { ErrorState, Skeleton } from '@/components/feedback';
import { AnimatedCard } from '@/components/firstRun';
import { HorizontalRail, Screen, Section } from '@/components/layout';
import { AppImages } from '@/assets';
import { StoryRail } from '@/features/stories/StoryRail';
import { useAccess, useActiveSession, useFavorites, useHome, useProfile, useProgress, useQuickStart, useToggleFavorite, useWeekPlan } from '@/hooks/queries';
import { format } from '@/i18n';
import { useUnitSystem } from '@/hooks/useUnits';
import { formatWeight } from '@/utils/units';
import { RootStackParamList } from '@/navigation/types';
import { useWaterToday } from '@/services/storage/water';
import { useSession } from '@/store/session';
import { gradients, palette, radius, scenes, shadow } from '@/theme';
import { HomeData, PlanDay, QuickStartTarget, WeekPlan, WorkoutSession } from '@/types/domain';
import { dayKey, parseDay } from '@/utils/dates';
import { LinearGradient } from 'expo-linear-gradient';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { account } = useSession();
  const { dictionary } = useLabels();
  const copy = dictionary.home;
  const home = useHome();
  const quickStart = useQuickStart();
  const access = useAccess();
  const profile = useProfile();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? copy.goodMorning : hour < 18 ? copy.goodAfternoon : copy.goodEvening;
  const name = home.data?.greetingName || account?.firstName || '';
  const goal = profile.data?.goal ? dictionary.onboarding.goal.options[profile.data.goal]?.title : undefined;
  const trialDays = access.data?.status === 'trial' && access.data.trialEndsAt ? Math.max(0, Math.ceil((Date.parse(access.data.trialEndsAt) - Date.now()) / 86_400_000)) : null;

  return <Screen scene={scenes.violet} tabBar refreshing={home.isRefetching} onRefresh={() => { home.refetch(); access.refetch(); profile.refetch(); quickStart.refetch(); }}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={dictionary.nav.Profile} onPress={() => navigation.navigate('Profile')} style={({ pressed }) => [styles.avatarRing, pressed && { transform: [{ scale: 0.95 }] }]}>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}><Txt variant="h3" color={palette.onAccent}>{(name || account?.email || '?').slice(0, 1).toUpperCase()}</Txt></LinearGradient>
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="small" color={palette.inkMuted} numberOfLines={1}>{greeting}</Txt>
        <Txt variant="display" numberOfLines={1}>{name || copy.ready}</Txt>
      </View>
      <IconButton glyph={mdi('bell-outline')} size="lg" tone="glass" label={dictionary.profile.notifications} onPress={() => navigation.navigate('NotificationSettings')} />
    </View>
    {goal || trialDays !== null ? <View style={styles.pills}>
      {goal ? <View style={styles.pill}><View style={styles.pillDot} /><Txt variant="label" color={palette.inkSoft}>{format(copy.goalLabel, { goal })}</Txt></View> : null}
      {trialDays !== null ? <Pressable onPress={() => navigation.navigate('Upgrade')} accessibilityRole="button" style={({ pressed }) => [styles.pill, styles.trialPill, pressed && { opacity: 0.7 }]}>
        <GlyphIcon glyph={mdi('crown-outline')} size={14} color={palette.yellow} />
        <Txt variant="label" color={palette.yellow}>{format(copy.trialBanner, { days: trialDays })}</Txt>
      </Pressable> : null}
    </View> : null}

    {home.isLoading ? <HomeSkeleton /> : home.error ? <View style={{ marginTop: 20 }}><ErrorState error={home.error} onRetry={() => home.refetch()} /></View> : home.data ? <HomeContent data={home.data} navigation={navigation} weightKg={profile.data?.weightKg} heightCm={profile.data?.heightCm} /> : null}
  </Screen>;
}

function HomeContent({ data, navigation, weightKg, heightCm }: { data: HomeData; navigation: Nav; weightKg?: number; heightCm?: number }) {
  const { dictionary } = useLabels();
  const copy = dictionary.home;
  const week = useWeekPlan();
  const active = useActiveSession();
  const progress = useProgress();
  const favorites = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const water = useWaterToday(weightKg);
  const resume = data.activeSession;
  const saved = new Set((favorites.data ?? []).filter((f) => f.type === 'workout').map((f) => f.id));
  const explore = (muscle: string) => navigation.navigate('Tabs', { screen: 'Explore', params: { muscle } });
  // Quick Start is admin-managed (Admin → Gym / Training → Quick Start). The bundled six below are only an
  // offline fallback for a first launch that can't reach the server; cached server tiles win otherwise.
  const quickStart = useQuickStart();
  const bundledQuick: QuickItem[] = [
    { key: 'warmup', label: copy.warmUp, asset: AppImages.stories.warmup, onPress: () => explore('cardio') },
    { key: 'chest', label: dictionary.catalog.muscles.chest, asset: AppImages.stories.chest, onPress: () => explore('chest') },
    { key: 'back', label: dictionary.catalog.muscles.back, asset: AppImages.stories.back, onPress: () => explore('back') },
    { key: 'legs', label: dictionary.catalog.muscles.legs, asset: AppImages.stories.legs, onPress: () => explore('legs') },
    { key: 'core', label: dictionary.catalog.muscles.core, asset: AppImages.stories.core, onPress: () => explore('core') },
    { key: 'mobility', label: dictionary.catalog.muscles.mobility, asset: AppImages.stories.mobility, onPress: () => explore('mobility') },
  ];
  const openQuick = (target: QuickStartTarget) => {
    if (target.type === 'muscle') explore(target.muscle);
    else if (target.type === 'workout') navigation.navigate('WorkoutDetail', { workoutId: target.id });
    else navigation.navigate('ExerciseDetail', { exerciseId: target.id });
  };
  const quick: QuickItem[] | null = quickStart.data
    ? quickStart.data.map((tile) => ({ key: tile.id, label: tile.title, uri: tile.imageUrl, onPress: () => openQuick(tile.target) }))
    : quickStart.isError ? bundledQuick : null;
  const todayKey = dayKey(new Date());
  const todayMinutes = progress.data?.weekDays.find((d) => d.date === todayKey)?.minutes ?? data.progress.weekDays.find((d) => d.date === todayKey)?.minutes ?? 0;
  const system = useUnitSystem();
  const bmi = weightKg && heightCm ? weightKg / (heightCm / 100) ** 2 : undefined;
  const adherence = adherenceOf(week.data);

  const todayDay = week.data?.days.find((d) => d.date === todayKey);
  const split = splitOf(data.today?.status === 'today' ? todayDay : undefined, active.data ?? undefined);

  return <>
    {resume?.workoutId ? <PressableScale onPress={() => navigation.navigate('WorkoutPlayer', { workoutId: resume.workoutId! })} scaleTo={0.98} containerStyle={{ marginTop: 18 }} accessibilityLabel={`${copy.resume} ${resume.name}`}>
      <View style={[styles.resume, shadow(palette.accent, 0.5)]}>
        <View style={styles.resumeIcon}><GlyphIcon glyph={mdi('progress-clock')} size={20} color={palette.accent} /></View>
        <View style={{ flex: 1 }}><Txt variant="overline" color={palette.accentSoft}>{copy.unfinished.toUpperCase()}</Txt><Txt variant="h3" numberOfLines={1}>{resume.name}</Txt></View>
        <View style={styles.resumeCta}><Txt variant="label" color={palette.onAccent}>{copy.resume}</Txt><GlyphIcon glyph={mdi('play')} size={14} color={palette.onAccent} /></View>
      </View>
    </PressableScale> : null}

    <AnimatedCard style={{ marginTop: 22 }}>
      <Txt variant="overline" color={palette.inkMuted} style={{ marginBottom: 10 }}>{(data.today?.status === 'today' || !data.today ? copy.todaysWorkout : copy.nextUp).toUpperCase()}</Txt>
      {data.today?.workout ? <PhotoHeroCard workout={data.today.workout} progress={split}
        eyebrow={data.today.status === 'today' ? dictionary.plan.today.toUpperCase() : parseDay(data.today.date).toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase()}
        onOpen={() => navigation.navigate('WorkoutDetail', { workoutId: data.today!.workout!.id })}
        onStart={() => navigation.navigate('WorkoutPlayer', { workoutId: data.today!.workout!.id })} />
        : <View style={styles.restCard}>
          <View style={styles.restIcon}><GlyphIcon glyph={mdi(data.planName ? 'weather-night' : 'calendar-blank')} size={26} color={palette.accent} /></View>
          <Txt variant="display" style={{ marginTop: 14 }}>{data.planName ? copy.restDay : copy.noPlan}</Txt>
          <Txt variant="body" color={palette.inkMuted} style={{ marginTop: 6 }}>{data.planName ? copy.restBody : copy.noPlanBody}</Txt>
          <GradientButton label={data.planName ? dictionary.plan.title : copy.browse} icon={data.planName ? 'calendar' : 'compass'} onPress={() => navigation.navigate('Tabs', { screen: data.planName ? 'Workout' : 'Explore' })} style={{ marginTop: 18 }} />
        </View>}
    </AnimatedCard>

    <AnimatedCard delay={40} style={{ marginTop: 14 }}>
      <MetricStrip items={[
        { label: copy.activeMinutes, value: todayMinutes > 0 ? String(todayMinutes) : null, unit: dictionary.common.min, glyph: mdi('timer-outline'), color: palette.accent },
        { label: copy.calories, value: todayMinutes > 0 ? String(estimateKcal(todayMinutes, 'intermediate')) : null, unit: 'kcal', glyph: mdi('fire'), color: palette.orange, note: copy.estimated },
        { label: copy.streak, value: String(data.progress.streak), unit: copy.days, glyph: mdi('lightning-bolt'), color: palette.yellow },
      ]} />
    </AnimatedCard>

    {week.data ? <Section title={copy.thisWeek} action={dictionary.plan.title} onAction={() => navigation.navigate('Tabs', { screen: 'Workout' })}>
      <AnimatedCard delay={60}>
        <WeekStrip days={week.data.days} onPressDay={(day) => navigation.navigate('WorkoutDetail', { workoutId: day.workout!.id })} />
        <View style={styles.weekFoot}>
          <Txt variant="small" color={palette.inkMuted}>{copy.workouts}: <Txt variant="small" color={palette.ink}>{data.progress.week.sessions}</Txt>  ·  {copy.weeklyTime}: <Txt variant="small" color={palette.ink}>{data.progress.week.minutes} {dictionary.common.min}</Txt></Txt>
          {adherence !== undefined ? <Txt variant="label" color={palette.accent}>{Math.round(adherence * 100)}%</Txt> : null}
        </View>
      </AnimatedCard>
    </Section> : null}

    {quick === null ? <Section title={copy.quickStart}><QuickAccessSkeleton /></Section>
      : quick.length ? <Section title={copy.quickStart}><AnimatedCard delay={90}><QuickAccessRail items={quick} /></AnimatedCard></Section> : null}

    <View style={{ marginTop: 22 }}><WaterCard ml={water.ml} goalMl={water.goalMl} onAdd={water.add} onRemove={water.remove} /></View>

    {data.stories.length ? <Section title={copy.storiesTitle}><StoryRail stories={data.stories} onOpen={(category) => navigation.navigate('StoryViewer', { category })} /></Section> : null}

    {data.recommendations.length ? <Section title={copy.recommended} action={dictionary.common.seeAll} onAction={() => navigation.navigate('Tabs', { screen: 'Explore' })}>
      <HorizontalRail gap={12}>{data.recommendations.map((workout) => <PhotoWorkoutCard key={workout.id} workout={workout} saved={saved.has(workout.id)} width={232} height={208}
        onToggleSave={() => toggleFavorite.mutate({ type: 'workout', id: workout.id, favorite: !saved.has(workout.id) })}
        onPress={() => navigation.navigate('WorkoutDetail', { workoutId: workout.id })} />)}</HorizontalRail>
    </Section> : null}

    <Section title={copy.metrics} action={dictionary.common.edit} onAction={() => navigation.navigate('Profile')}>
      <View style={styles.grid}>
        <MetricTile label={copy.weight} value={weightKg ? formatWeight(weightKg, system).split(' ')[0] : undefined} unit={system === 'imperial' ? 'lb' : 'kg'} note={weightKg ? copy.fromProfile : undefined} />
        <MetricTile label={copy.bmi} value={bmi ? bmi.toFixed(1) : undefined} note={bmi ? copy.fromProfile : undefined} />
      </View>
      <View style={[styles.grid, { marginTop: 10 }]}>
        <MetricTile label={copy.bodyFat} />
        <MetricTile label={copy.goalWeight} />
      </View>
    </Section>
  </>;
}

/** Today's exercises done (completed day = all; a live session counts finished exercises). */
function splitOf(day?: PlanDay, session?: WorkoutSession) {
  if (!day?.workout) return undefined;
  const total = day.workout.exercises.length;
  const done = day.status === 'completed' ? total
    : session && session.workoutId === day.workout.id ? session.exercises.filter((e) => e.sets.length && e.sets.every((s) => s.completed)).length : 0;
  return { done, total };
}

/** Share of this week's planned days (so far) that were completed. */
function adherenceOf(week?: WeekPlan) {
  const due = week?.days.filter((d) => d.workout && (d.status === 'completed' || d.status === 'missed')) ?? [];
  if (!due.length) return undefined;
  return due.filter((d) => d.status === 'completed').length / due.length;
}

function HomeSkeleton() {
  return <View style={{ gap: 16, marginTop: 24 }}><Skeleton height={330} round={radius.xl} /><Skeleton height={86} round={radius.lg} /><View style={{ flexDirection: 'row', gap: 12 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} width={74} height={74} round={37} />)}</View></View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarRing: { padding: 2, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(99,216,255,0.45)' },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: palette.glass, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  pillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.accent, shadowColor: palette.accent, shadowOpacity: 0.9, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } },
  trialPill: { borderColor: 'rgba(255,209,102,0.35)', backgroundColor: 'rgba(255,209,102,0.08)' },
  resume: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: palette.surface, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: 'rgba(34,184,245,0.45)' },
  resumeIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(34,184,245,0.12)', alignItems: 'center', justifyContent: 'center' },
  resumeCta: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  restCard: { backgroundColor: palette.surface, borderRadius: radius.xl, padding: 20, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  restIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(34,184,245,0.12)', borderWidth: 1, borderColor: 'rgba(34,184,245,0.3)', alignItems: 'center', justifyContent: 'center' },
  weekFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 4 },
  grid: { flexDirection: 'row', gap: 10 },
});

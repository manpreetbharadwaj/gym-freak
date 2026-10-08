import React, { useEffect, useState } from 'react';
import { AppState, Linking, View } from 'react-native';
import { useQueries } from '@tanstack/react-query';
import { GradientButton, mdi, Txt } from '@/components';
import { ExerciseRow, WorkoutTile, useLabels } from '@/components/cards';
import { EmptyState, ErrorState, SkeletonList } from '@/components/feedback';
import { BottomSheet, FilterChip, LinkRow, ToggleRow } from '@/components/inputs';
import { Card, Header, Screen } from '@/components/layout';
import { DaysStep, DurationStep, EquipmentStep, ExperienceStep, GoalStep, LocationStep } from '@/features/onboarding/steps';
import { LanguageScreen } from '@/features/language/LanguageScreen';
import { Badges, HistoryRow } from '@/features/progress/ProgressScreen';
import { keys, useFavorites, usePreferences, useProfile, useProgress, useUpdatePreferences, useUpdateProfile, useWorkouts } from '@/hooks/queries';
import { applyLayoutDirection, format, useI18n } from '@/i18n';
import { RootScreenProps } from '@/navigation/types';
import { notificationPermission } from '@/services/notifications';
import { useWaterReminderSetting } from '@/services/storage/water';
import { useRepos } from '@/store/session';
import { palette, scenes } from '@/theme';
import { DurationRange, Equipment, OnboardingAnswers } from '@/types/domain';

/* ───────────── Training preferences ───────────── */

type Field = 'goal' | 'experience' | 'location' | 'days' | 'duration' | 'equipment';
const durationFor = (minutes: number): DurationRange => (minutes <= 30 ? '20-30' : minutes <= 45 ? '30-45' : minutes <= 60 ? '45-60' : '60-90');

export function TrainingPreferencesScreen({ navigation }: RootScreenProps<'TrainingPreferences'>) {
  const { dictionary, difficulty, equipment } = useLabels();
  const copy = dictionary.profile;
  const ob = dictionary.onboarding;
  const profile = useProfile();
  const update = useUpdateProfile();
  const [editing, setEditing] = useState<Field>();
  const [draft, setDraft] = useState<Partial<OnboardingAnswers>>({});
  const p = profile.data;
  const open = (field: Field) => { if (!p) return; setDraft({ goal: p.goal, experience: p.experience, location: p.location, daysPerWeek: p.daysPerWeek, duration: durationFor(p.availableMinutes), equipment: p.equipment as Equipment[] }); setEditing(field); };
  const save = async () => {
    if (!editing) return;
    const patch: Partial<OnboardingAnswers> = editing === 'days' ? { daysPerWeek: draft.daysPerWeek } : editing === 'goal' ? { goal: draft.goal } : editing === 'experience' ? { experience: draft.experience } : editing === 'location' ? { location: draft.location } : editing === 'duration' ? { duration: draft.duration } : { equipment: draft.equipment };
    await update.mutateAsync(patch);
    setEditing(undefined);
  };
  const titles: Record<Field, string> = { goal: copy.goal, experience: copy.experience, location: copy.location, days: copy.days, duration: copy.duration, equipment: copy.equipment };

  return <Screen scene={scenes.violet} header={<Header title={copy.myPreferences} onBack={() => navigation.goBack()} />}>
    {profile.isLoading ? <SkeletonList rows={6} height={60} /> : profile.error || !p ? <ErrorState error={profile.error} onRetry={() => profile.refetch()} /> : <Card padded={false} style={{ paddingVertical: 4 }}>
      <LinkRow title={copy.goal} value={p.goal ? ob.goal.options[p.goal].title : '—'} glyph={mdi('bullseye-arrow')} onPress={() => open('goal')} />
      <LinkRow title={copy.experience} value={p.experience ? difficulty(p.experience) : '—'} glyph={mdi('signal-cellular-2')} color={palette.orange} onPress={() => open('experience')} />
      <LinkRow title={copy.location} value={p.location ? ob.location.options[p.location].title : '—'} glyph={mdi('map-marker-outline')} color="#0FA89C" onPress={() => open('location')} />
      <LinkRow title={copy.days} value={format(copy.perWeek, { count: p.daysPerWeek })} glyph={mdi('calendar-week')} color={palette.coral} onPress={() => open('days')} />
      <LinkRow title={copy.duration} value={`${p.availableMinutes} ${dictionary.common.min}`} glyph={mdi('timer-outline')} color={palette.blue} onPress={() => open('duration')} />
      <LinkRow title={copy.equipment} value={p.equipment.map(equipment).join(', ') || '—'} glyph={mdi('dumbbell')} color={palette.inkSoft} onPress={() => open('equipment')} />
    </Card>}
    <BottomSheet visible={!!editing} onClose={() => setEditing(undefined)} title={editing ? titles[editing] : ''} footer={<GradientButton label={dictionary.common.save} icon="checkmark" loading={update.isPending} onPress={save} />}>
      {editing === 'goal' ? <GoalStep value={draft.goal} onChange={(goal) => setDraft((d) => ({ ...d, goal }))} /> : null}
      {editing === 'experience' ? <ExperienceStep value={draft.experience} onChange={(experience) => setDraft((d) => ({ ...d, experience }))} /> : null}
      {editing === 'location' ? <LocationStep value={draft.location} accent={scenes.aqua.accent} onChange={(location) => setDraft((d) => ({ ...d, location }))} /> : null}
      {editing === 'days' ? <DaysStep value={draft.daysPerWeek ?? 3} scene={scenes.coral} onChange={(daysPerWeek) => setDraft((d) => ({ ...d, daysPerWeek }))} /> : null}
      {editing === 'duration' ? <DurationStep value={draft.duration} scene={scenes.orange} onChange={(duration) => setDraft((d) => ({ ...d, duration: duration as DurationRange }))} /> : null}
      {editing === 'equipment' ? <EquipmentStep selected={draft.equipment ?? []} scene={scenes.blue} onToggle={(item) => setDraft((d) => ({ ...d, equipment: (d.equipment ?? []).includes(item) ? d.equipment!.filter((e) => e !== item) : [...(d.equipment ?? []), item] }))} /> : null}
      {update.error ? <Txt variant="small" color={palette.danger}>{dictionary.states.generic}</Txt> : null}
    </BottomSheet>
  </Screen>;
}

/* ───────────── Notifications ───────────── */

export function NotificationSettingsScreen({ navigation }: RootScreenProps<'NotificationSettings'>) {
  const { dictionary, language } = useI18n();
  const copy = dictionary.notifications;
  const prefs = usePreferences();
  const update = useUpdatePreferences();
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const p = prefs.data;
  const [water, setWater] = useWaterReminderSetting();
  // Scheduling itself is done by WaterReminderSync (RootNavigator) from the shared water store.
  const toggleWater = async (value: boolean) => {
    if (value) { const result = await notificationPermission(true); setPermission(result); if (result !== 'granted') return; }
    setWater(value);
  };
  useEffect(() => {
    const check = () => notificationPermission().then(setPermission);
    check();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => sub.remove();
  }, []);
  // The on-device reminder is re-synced by DeviceSync (RootNavigator) whenever these preferences change.

  const setMaster = async (enabled: boolean) => {
    if (enabled) { const result = await notificationPermission(true); setPermission(result); if (result !== 'granted') return; }
    update.mutate({ notificationsEnabled: enabled });
  };
  const setCategory = (key: keyof NonNullable<typeof p>['notifications'], value: boolean | number) => p && update.mutate({ notifications: { ...p.notifications, [key]: value } });

  return <Screen scene={scenes.orange} header={<Header title={copy.title} onBack={() => navigation.goBack()} />}>
    {!p ? <SkeletonList rows={6} height={60} /> : <>
      <Card padded={false} style={{ paddingVertical: 4 }}><ToggleRow title={copy.master} subtitle={copy.masterBody} glyph={mdi('bell-ring-outline')} color={palette.orange} value={p.notificationsEnabled && permission === 'granted'} onChange={setMaster} /></Card>
      {permission === 'denied' ? <Card style={{ marginTop: 12, gap: 10 }}><Txt variant="small" color={palette.inkMuted}>{copy.denied}</Txt><GradientButton label={copy.openSettings} icon="settings-outline" onPress={() => Linking.openSettings()} /></Card> : null}
      {p.notificationsEnabled && permission === 'granted' ? <>
        <Card padded={false} style={{ marginTop: 16, paddingVertical: 4 }}>
          <ToggleRow title={copy.workoutReminders} glyph={mdi('dumbbell')} color={palette.violet} value={p.notifications.workoutReminders} onChange={(v) => setCategory('workoutReminders', v)} />
          {p.notifications.workoutReminders ? <View style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 8 }}>
            <Txt variant="label" color={palette.inkMuted}>{copy.reminderTime.toUpperCase()}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[6, 7, 8, 12, 17, 18, 19, 20].map((h) => <FilterChip key={h} label={new Date(2026, 0, 1, h).toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' })} active={p.notifications.reminderHour === h} onPress={() => setCategory('reminderHour', h)} color={palette.orange} />)}</View>
          </View> : null}
          <ToggleRow title={copy.streak} subtitle={copy.streakBody} glyph={mdi('fire')} color={palette.coral} value={p.notifications.streakReminders} onChange={(v) => setCategory('streakReminders', v)} />
          <ToggleRow title={copy.stories} glyph={mdi('book-open-page-variant-outline')} color={palette.violet} value={p.notifications.stories} onChange={(v) => setCategory('stories', v)} />
          <ToggleRow title={copy.weeklyChallenge} glyph={mdi('trophy-outline')} color={palette.orange} value={p.notifications.weeklyChallenge} onChange={(v) => setCategory('weeklyChallenge', v)} />
          <ToggleRow title={copy.newContent} glyph={mdi('play-box-multiple-outline')} color={palette.blue} value={p.notifications.newContent} onChange={(v) => setCategory('newContent', v)} />
          <ToggleRow title={copy.trialEnding} glyph={mdi('crown-outline')} color={palette.orange} value={p.notifications.trialEnding} onChange={(v) => setCategory('trialEnding', v)} />
          <ToggleRow title={copy.achievements} glyph={mdi('medal-outline')} color="#22A35A" value={p.notifications.achievements} onChange={(v) => setCategory('achievements', v)} />
          <ToggleRow title={copy.water} subtitle={copy.waterNote} glyph={mdi('cup-water')} color={palette.sky} value={water} onChange={toggleWater} />
        </Card>
      </> : null}
    </>}
  </Screen>;
}

/* ───────────── Language ───────────── */

export function LanguageSettingsScreen({ navigation }: RootScreenProps<'LanguageSettings'>) {
  const { language } = useI18n();
  const update = useUpdatePreferences();
  // The language applies instantly on device; the choice is also saved to HealthyMe preferences.
  return <LanguageScreen onBack={() => navigation.goBack()} onContinue={async () => { await update.mutateAsync({ language }).catch(() => undefined); if (!applyLayoutDirection(language)) navigation.goBack(); }} />;
}

/* ───────────── Favorites / History / Achievements / Legal ───────────── */

export function FavoritesScreen({ navigation }: RootScreenProps<'Favorites'>) {
  const { dictionary } = useI18n();
  const { gym } = useRepos();
  const favorites = useFavorites();
  const workouts = useWorkouts();
  const exerciseIds = (favorites.data ?? []).filter((f) => f.type === 'exercise').map((f) => f.id);
  const exercises = useQueries({ queries: exerciseIds.map((id) => ({ queryKey: keys.exercise(id), queryFn: () => gym.getExercise(id), staleTime: 600_000 })) });
  const favoriteWorkouts = (workouts.data ?? []).filter((w) => favorites.data?.some((f) => f.type === 'workout' && f.id === w.id));
  const loading = favorites.isLoading || exercises.some((q) => q.isLoading);
  const empty = !loading && !favoriteWorkouts.length && !exercises.some((q) => q.data);
  return <Screen scene={scenes.coral} header={<Header title={dictionary.profile.favorites} onBack={() => navigation.goBack()} />}>
    {loading ? <SkeletonList /> : favorites.error ? <ErrorState error={favorites.error} onRetry={() => favorites.refetch()} /> : empty ? <EmptyState title={dictionary.profile.noFavorites} body={dictionary.profile.noFavoritesBody} glyph={mdi('heart-outline')} /> : <View style={{ gap: 12 }}>
      {favoriteWorkouts.map((w) => <WorkoutTile key={w.id} workout={w} full onPress={() => navigation.navigate('WorkoutDetail', { workoutId: w.id })} />)}
      {exercises.map((q) => q.data ? <ExerciseRow key={q.data.exercise.id} exercise={q.data.exercise} onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: q.data!.exercise.id })} /> : null)}
    </View>}
  </Screen>;
}

export function HistoryScreen({ navigation }: RootScreenProps<'History'>) {
  const { dictionary } = useI18n();
  const progress = useProgress();
  return <Screen scene={scenes.blue} header={<Header title={dictionary.profile.history} onBack={() => navigation.goBack()} />}>
    {progress.isLoading ? <SkeletonList /> : progress.error ? <ErrorState error={progress.error} onRetry={() => progress.refetch()} />
      : progress.data?.history.length ? <View style={{ gap: 10 }}>{progress.data.history.map((h) => <HistoryRow key={h.id} item={h} />)}</View>
      : <EmptyState title={dictionary.progress.noHistory} body={dictionary.progress.noHistoryBody} glyph={mdi('history')} />}
  </Screen>;
}

export function AchievementsScreen({ navigation }: RootScreenProps<'Achievements'>) {
  const { dictionary } = useI18n();
  const progress = useProgress();
  return <Screen scene={scenes.orange} header={<Header title={dictionary.profile.achievements} onBack={() => navigation.goBack()} />}>
    {progress.isLoading ? <SkeletonList rows={3} height={130} /> : progress.error ? <ErrorState error={progress.error} onRetry={() => progress.refetch()} /> : <Badges achievements={progress.data?.achievements ?? []} />}
  </Screen>;
}

export function LegalScreen({ route, navigation }: RootScreenProps<'Legal'>) {
  const { dictionary } = useI18n();
  const { topic } = route.params;
  const title = { privacy: dictionary.profile.privacy, terms: dictionary.profile.terms, help: dictionary.profile.help }[topic];
  const body = { privacy: dictionary.legal.privacyBody, terms: dictionary.legal.termsBody, help: dictionary.legal.helpBody }[topic];
  return <Screen scene={scenes.violet} header={<Header title={title} onBack={() => navigation.goBack()} />}>
    <Card><Txt variant="body">{body}</Txt></Card>
  </Screen>;
}

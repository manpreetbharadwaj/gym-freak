import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlyphIcon, mdi, PressableScale, Txt } from '@/components';
import { StatTile, useLabels } from '@/components/cards';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { Card, IconCircle, Screen, Section } from '@/components/layout';
import { useUnitSystem } from '@/hooks/useUnits';
import { formatWeight } from '@/utils/units';
import { Breakdown, CombinedStreak, DistanceMetrics, Overview, Period, PeriodToggle, RunningProgress, StackedChart, TrainingTime } from './FitnessSections';
import { visualFor } from '@/components/media';
import { useProfile, useProgress, useWeekPlan, useBodyFat, useReferral } from '@/hooks/queries';
import { MetricTile, SummaryTile, estimateKcal } from '@/components/dashboard';
import { dayKey } from '@/utils/dates';
import { format } from '@/i18n';
import { RootStackParamList } from '@/navigation/types';
import { gradients, palette, radius, scenes, shadow } from '@/theme';
import { Achievement, Progress, SessionSummary } from '@/types/domain';
import { formatDuration, parseDay } from '@/utils/dates';
import { ShareComposer } from '@/features/sharing';

export function ProgressScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { dictionary } = useLabels();
  const copy = dictionary.progress;
  const progress = useProgress();
  const week = useWeekPlan();
  const profile = useProfile();
  const bodyFat = useBodyFat();
  const referral = useReferral();
  const data = progress.data;
  const system = useUnitSystem();
  const [period, setPeriod] = useState<Period>('week');
  const [sharing, setSharing] = useState(false);
  const fitness = data?.fitness;
  const today = dayKey(new Date());
  const monthWorkouts = data?.monthDays.filter((d) => !d.inFuture && d.date > dayKey(new Date(Date.now() - 30 * 86_400_000)) && d.date <= today).reduce((t, d) => t + d.count, 0) ?? 0;
  const due = week.data?.days.filter((d) => d.workout && (d.status === 'completed' || d.status === 'missed')) ?? [];
  const adherence = due.length ? due.filter((d) => d.status === 'completed').length / due.length : undefined;
  return <Screen scene={scenes.coral} tabBar refreshing={progress.isRefetching} onRefresh={() => progress.refetch()}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Txt variant="display">{copy.title}</Txt>
        <Txt variant="body" color={palette.inkMuted} style={{ marginTop: 4 }}>{copy.subtitle}</Txt>
      </View>
      {data ? <IconCircle glyph={mdi('share-variant')} label={dictionary.complete.share} onPress={() => setSharing(true)} /> : null}
      <IconCircle glyph={mdi('account-circle-outline')} label={dictionary.nav.Profile} onPress={() => navigation.navigate('Profile')} />
    </View>
    {progress.isLoading ? <View style={{ gap: 14, marginTop: 22 }}><Skeleton height={150} round={radius.xl} /><Skeleton height={110} round={radius.lg} /><Skeleton height={220} round={radius.lg} /></View>
      : progress.error || !data ? <View style={{ marginTop: 22 }}><ErrorState error={progress.error} onRetry={() => progress.refetch()} /></View>
      : <>
        {fitness ? <>
          <PeriodToggle value={period} onChange={setPeriod} />
          <Overview period={period} data={fitness[period]} system={system} />
          <CombinedStreak fitness={fitness} />
          <Section title={dictionary.fitness.chart}><StackedChart data={fitness[period]} period={period} /></Section>
          <Breakdown data={fitness[period]} system={system} />
          <TrainingTime data={fitness[period]} />
          <DistanceMetrics fitness={fitness} system={system} />
          <RunningProgress fitness={fitness} system={system} />
          <Txt variant="title" style={{ marginTop: 32 }}>{dictionary.fitness.gym}</Txt>
        </> : <StreakHero data={data} />}
        <View style={styles.stats}>
          <StatTile label={copy.time} value={formatDuration(data.totalMinutes * 60000)} glyph={mdi('timer-outline')} gradient={gradients.sky} />
          <StatTile label={dictionary.home.workouts} value={data.totalSessions} glyph={mdi('check-decagram')} gradient={gradients.lime} />
          <StatTile label={copy.sets} value={data.completedSets} glyph={mdi('dumbbell')} gradient={gradients.primary} />
        </View>
        <View style={[styles.stats, { marginTop: 12 }]}>
          <SummaryTile glyph={mdi('fire')} color={palette.orange} value={String(estimateKcal(data.totalMinutes, 'intermediate'))} unit="kcal" label={dictionary.home.calories} note={dictionary.home.estimated} />
          <SummaryTile glyph={mdi('calendar-month-outline')} color={palette.blue} value={String(monthWorkouts)} label={copy.last30} />
          <SummaryTile glyph={mdi('target')} color={palette.aqua} value={adherence !== undefined ? `${Math.round(adherence * 100)}%` : '—'} label={dictionary.home.adherence} />
        </View>
        <Section title={copy.weekly}><WeekBars data={data} /></Section>
        <Section title={copy.monthly}><MonthGrid data={data} /></Section>
        <Section title={copy.muscles}><Muscles data={data} /></Section>
        {data.personalRecords.length ? <Section title={copy.records}><Card style={{ gap: 12 }}>{data.personalRecords.slice(0, 5).map((r) => <View key={r.exerciseId} style={styles.listRow}>
          <View style={[styles.listIcon, { backgroundColor: 'rgba(255,209,102,0.12)' }]}><GlyphIcon glyph={mdi('trophy-variant')} size={18} color={palette.yellow} /></View>
          <Txt variant="h3" numberOfLines={1} style={{ flex: 1 }}>{r.name}</Txt>
          <Txt variant="label" color={palette.ink}>{r.maxWeightKg ? format(copy.recordWeight, { weight: r.maxWeightKg, reps: r.repsAtMax ?? 0 }) : format(copy.recordReps, { reps: r.maxReps ?? 0 })}</Txt>
        </View>)}</Card></Section> : null}
        {data.exerciseFrequency.length ? <Section title={copy.topExercises}><Card style={{ gap: 12 }}>{data.exerciseFrequency.slice(0, 5).map((f) => <View key={f.exerciseId} style={styles.listRow}>
          <View style={[styles.listIcon, { backgroundColor: 'rgba(34,184,245,0.12)' }]}><GlyphIcon glyph={mdi('dumbbell')} size={18} color={palette.violet} /></View>
          <Txt variant="h3" numberOfLines={1} style={{ flex: 1 }}>{f.name}</Txt>
          <Txt variant="small" color={palette.inkMuted}>{format(copy.sessionsCount, { count: f.sessions })} · {format(copy.setsCount, { count: f.sets })}</Txt>
        </View>)}</Card></Section> : null}
        <Section title={copy.bodyTrends}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <MetricTile label={dictionary.home.weight} value={profile.data?.weightKg ? formatWeight(profile.data.weightKg, system).split(' ')[0] : undefined} unit={system === 'imperial' ? 'lb' : 'kg'} note={profile.data?.weightKg ? dictionary.home.fromProfile : undefined} />
            {/* Real measurements only (Profile → Body composition); "Not measured yet" otherwise. */}
            <MetricTile label={dictionary.home.bodyFat} value={bodyFat.data?.latest ? bodyFat.data.latest.percent.toFixed(1) : undefined} unit="%" note={bodyFat.data?.latest ? (bodyFat.data.latest.estimated ? dictionary.bodyComp.estimated : dictionary.bodyComp.measured) : dictionary.bodyComp.notMeasured} />
          </View>
          <Card style={{ marginTop: 12, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <GlyphIcon glyph={mdi('chart-line')} size={22} color={palette.inkFaint} />
            <Txt variant="small" color={palette.inkMuted} style={{ flex: 1 }}>{copy.trendsSoon}</Txt>
          </Card>
        </Section>
        <Section title={copy.achievements} action={dictionary.common.seeAll} onAction={() => navigation.navigate('Achievements')}><Badges achievements={data.achievements.slice(0, 6)} /></Section>
        <Section title={copy.history} action={data.history.length > 4 ? dictionary.common.seeAll : undefined} onAction={() => navigation.navigate('History')}>
          {data.history.length ? <View style={{ gap: 10 }}>{data.history.slice(0, 4).map((h) => <HistoryRow key={h.id} item={h} />)}</View> : <EmptyState title={copy.noHistory} body={copy.noHistoryBody} glyph={mdi('history')} />}
        </Section>
      </>}
    {data ? <ShareComposer visible={sharing} onClose={() => setSharing(false)} referral={referral.data} card={{
      kind: 'progress', title: dictionary.socialShare.progressTitle, eyebrow: dictionary.socialShare.progressEyebrow, statement: dictionary.socialShare.journey,
      metrics: [
        { id: 'workouts', label: copy.completed, value: String(data.totalSessions) },
        { id: 'minutes', label: copy.time, value: formatDuration(data.totalMinutes * 60_000) },
        { id: 'streak', label: copy.streak, value: `${data.streak} ${data.streak === 1 ? copy.day : copy.days}` },
      ],
    }} /> : null}
  </Screen>;
}

function StreakHero({ data }: { data: Progress }) {
  const { dictionary } = useLabels();
  return <LinearGradient colors={['#1A1408', '#0E1220', '#0B1220']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, shadow(palette.orange, 0.35)]}>
    <View style={styles.heroRing} />
    <View style={styles.flame}><GlyphIcon glyph={mdi('fire')} size={44} color={palette.white} /></View>
    <View style={{ flex: 1 }}>
      <Txt variant="label" color={palette.inkMuted}>{dictionary.progress.streak.toUpperCase()}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}><Txt variant="number" color={palette.white} style={styles.streak}>{data.streak}</Txt><Txt variant="h3" color={palette.white}>{data.streak === 1 ? dictionary.progress.day : dictionary.progress.days}</Txt></View>
      <Txt variant="small" color={palette.inkMuted}>{data.streak ? dictionary.progress.bestDay : dictionary.progress.startStreak}</Txt>
      {data.longestStreak > data.streak ? <Txt variant="small" color={palette.inkMuted}>{format(dictionary.progress.longest, { count: data.longestStreak })}</Txt> : null}
    </View>
  </LinearGradient>;
}

/** Minutes trained per day this week; completed days in the primary gradient. */
function WeekBars({ data }: { data: Progress }) {
  const { dictionary } = useLabels();
  const letters = dictionary.onboarding.days.weekdays;
  const max = Math.max(30, ...data.weekDays.map((d) => d.minutes ?? 0));
  return <Card style={{ gap: 14 }}>
    <View style={styles.chart}>{data.weekDays.map((d, i) => {
      const minutes = d.minutes ?? 0;
      return <View key={d.date} style={styles.chartCol} accessible accessibilityLabel={`${letters[i]}: ${minutes} ${dictionary.common.min}`}>
        <Txt variant="tab" color={minutes ? palette.ink : palette.inkFaint}>{minutes || ''}</Txt>
        <View style={styles.chartTrack}>
          <View style={[styles.chartBar, { height: `${Math.max(d.done ? 12 : 4, (minutes / max) * 100)}%` }]}>{d.done ? <LinearGradient colors={gradients.primary} style={StyleSheet.absoluteFill} /> : null}</View>
        </View>
        <Txt variant="tab" color={d.isToday ? palette.violet : palette.inkMuted}>{letters[i]}</Txt>
      </View>;
    })}</View>
    <View style={styles.weekFoot}><Txt variant="small" color={palette.inkMuted}>{dictionary.home.workouts}: {data.week.sessions} · {dictionary.home.time}: {data.week.minutes} {dictionary.common.min}</Txt></View>
  </Card>;
}

function MonthGrid({ data }: { data: Progress }) {
  const { dictionary } = useLabels();
  const letters = dictionary.onboarding.days.weekdays;
  const weeks = Array.from({ length: 5 }, (_, w) => data.monthDays.slice(w * 7, w * 7 + 7));
  return <Card style={{ gap: 8 }}>
    <View style={styles.monthRow}>{letters.map((l) => <Txt key={l} variant="tab" color={palette.inkMuted} align="center" style={{ flex: 1 }}>{l.slice(0, 2)}</Txt>)}</View>
    {weeks.map((week, w) => <View key={w} style={styles.monthRow}>{week.map((d) => <View key={d.date} style={[styles.cell, d.count > 0 && { backgroundColor: d.count > 1 ? palette.accent : 'rgba(34,184,245,0.45)' }, d.inFuture && { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.line }, d.isToday && { borderWidth: 1.5, borderColor: palette.accent }]}>
      <Txt variant="tab" color={d.count ? palette.onAccent : palette.inkMuted}>{parseDay(d.date).getDate()}</Txt>
    </View>)}</View>)}
  </Card>;
}

function Muscles({ data }: { data: Progress }) {
  const { muscle, dictionary } = useLabels();
  const max = Math.max(1, ...data.muscleDistribution.map((m) => m.sets));
  if (!data.muscleDistribution.length) return <EmptyState title={dictionary.progress.noHistory} body={dictionary.progress.noHistoryBody} glyph={mdi('chart-donut')} />;
  return <Card style={{ gap: 12 }}>{data.muscleDistribution.slice(0, 8).map((m) => {
    const visual = visualFor(m.muscle);
    return <View key={m.muscle} style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt variant="row">{muscle(m.muscle)}</Txt><Txt variant="label" color={palette.inkMuted}>{format(dictionary.progress.setsCount, { count: m.sets })}</Txt></View>
      <View style={styles.track}><LinearGradient colors={visual.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width: `${(m.sets / max) * 100}%` }]} /></View>
    </View>;
  })}</Card>;
}

export function Badges({ achievements, onShare }: { achievements: Achievement[]; onShare?: (achievement: Achievement) => void }) {
  const { dictionary } = useLabels();
  return <View style={styles.badges}>{achievements.map((a) => {
    const unlocked = !!a.unlockedAt;
    return <View key={a.id} style={[styles.badge, shadow(unlocked ? '#F07A1A' : undefined, unlocked ? 0.6 : 0.3)]}>
      {unlocked ? <LinearGradient colors={['#FFD166', '#FF9A3D']} style={styles.badgeIcon}><GlyphIcon glyph={mdi('medal')} size={26} color={palette.onAccent} /></LinearGradient> : <View style={[styles.badgeIcon, { backgroundColor: palette.grayBg }]}><GlyphIcon glyph={mdi('lock-outline')} size={22} color={palette.inkFaint} /></View>}
      <Txt variant="label" align="center" numberOfLines={2} color={unlocked ? palette.ink : palette.inkMuted}>{a.title}</Txt>
      <Txt variant="label" align="center" numberOfLines={2} color={palette.inkMuted}>{unlocked ? dictionary.progress.unlocked : a.description}</Txt>
      {unlocked && onShare ? <PressableScale accessibilityRole="button" accessibilityLabel={`${dictionary.complete.share} ${a.title}`} onPress={() => onShare(a)}><GlyphIcon glyph={mdi('share-variant')} size={18} color={palette.accentSoft} /></PressableScale> : null}
    </View>;
  })}</View>;
}

export function HistoryRow({ item, onShare }: { item: SessionSummary; onShare?: (item: SessionSummary) => void }) {
  const { dictionary } = useLabels();
  const date = new Date(item.completedAt);
  return <PressableScale onPress={() => undefined} scaleTo={0.99} haptic={null}>
    <View style={[styles.history, shadow(undefined, 0.4)]}>
      <View style={styles.historyDate}><Txt variant="tab" color={palette.accent}>{date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</Txt><Txt variant="title">{date.getDate()}</Txt></View>
      <View style={{ flex: 1 }}><Txt variant="h3" numberOfLines={1}>{item.name}</Txt><Txt variant="small" color={palette.inkMuted}>{item.minutes} {dictionary.common.min} · {format(dictionary.progress.setsCount, { count: item.sets })} · {format(dictionary.home.exercises, { count: item.exercises })}</Txt></View>
      {onShare ? <PressableScale accessibilityRole="button" accessibilityLabel={`${dictionary.complete.share} ${item.name}`} onPress={() => onShare(item)}><GlyphIcon glyph={mdi('share-variant')} size={20} color={palette.accentSoft} /></PressableScale> : <GlyphIcon glyph={mdi('check-circle')} size={22} color="#22C38E" />}
    </View>
  </PressableScale>;
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', height: 150, gap: 8 },
  chartCol: { flex: 1, alignItems: 'center', gap: 6 },
  chartTrack: { flex: 1, width: '100%', maxWidth: 30, borderRadius: 10, backgroundColor: palette.grayBg, justifyContent: 'flex-end', overflow: 'hidden' },
  chartBar: { width: '100%', borderRadius: 10, backgroundColor: 'rgba(34,184,245,0.12)', overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hero: { marginTop: 22, borderRadius: radius.xl, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 18, overflow: 'hidden' },
  heroRing: { position: 'absolute', right: -60, top: -70, width: 200, height: 200, borderRadius: 100, borderWidth: 26, borderColor: 'rgba(255,255,255,0.12)' },
  /** The streak is this screen’s one hero figure, so it sits above the shared `number` size. */
  streak: { fontSize: 44, lineHeight: 50 },
  flame: { width: 72, height: 72, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 10, marginTop: 14 },
  weekRow: { flexDirection: 'row', gap: 6 },
  weekBar: { width: '100%', height: 64, borderRadius: 14, backgroundColor: palette.grayBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  weekFoot: { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 12 },
  monthRow: { flexDirection: 'row', gap: 6 },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 10, backgroundColor: palette.grayBg, alignItems: 'center', justifyContent: 'center' },
  track: { height: 10, borderRadius: 5, backgroundColor: palette.grayBg, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { width: '31%', backgroundColor: palette.surface, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line, padding: 12, alignItems: 'center', gap: 6 },
  badgeIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  history: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: palette.surface, borderRadius: radius.lg, padding: 10, paddingRight: 14 },
  historyDate: { width: 50, height: 54, borderRadius: 15, backgroundColor: 'rgba(34,184,245,0.10)', borderWidth: 1, borderColor: 'rgba(34,184,245,0.25)', alignItems: 'center', justifyContent: 'center' },
  future: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});

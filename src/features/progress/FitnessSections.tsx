import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlyphIcon, mdi, Txt } from '@/components';
import { Card, Section } from '@/components/layout';
import { ACTIVITY_TYPES } from '@/features/activity/activityTypes';
import { format, useI18n } from '@/i18n';
import { palette, radius, shadow } from '@/theme';
import { ActivityType, Fitness, FitnessKey, FitnessPeriod } from '@/types/domain';
import { parseDay } from '@/utils/dates';
import { distanceUnit, distanceValue, formatMinutes, formatPace, UnitSystem } from '@/utils/units';

/** One colour per category, shared by the chart, legend and breakdown. */
export const KEY_COLOR: Record<FitnessKey, string> = {
  GYM: '#FF5E72',
  RUNNING: ACTIVITY_TYPES.RUNNING.color,
  WALKING: ACTIVITY_TYPES.WALKING.color,
  HIKING: ACTIVITY_TYPES.HIKING.color,
  TREKKING: ACTIVITY_TYPES.TREKKING.color,
  YOGA: ACTIVITY_TYPES.YOGA.color,
};
const KEY_ICON: Record<FitnessKey, string> = { GYM: 'dumbbell', ...Object.fromEntries(Object.entries(ACTIVITY_TYPES).map(([k, v]) => [k, v.icon])) } as Record<FitnessKey, string>;
const ORDER: FitnessKey[] = ['GYM', 'RUNNING', 'WALKING', 'HIKING', 'TREKKING', 'YOGA'];

export type Period = 'week' | 'month';

function useKeyLabel() {
  const { dictionary } = useI18n();
  return (key: FitnessKey) => (key === 'GYM' ? dictionary.fitness.GYM : dictionary.activity.types[key]);
}

export function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const { dictionary } = useI18n();
  return <View style={styles.toggle} accessibilityRole="radiogroup">
    {(['week', 'month'] as const).map((p) => <Pressable key={p} testID={`period-${p}`} accessibilityRole="radio" accessibilityState={{ selected: value === p }} onPress={() => onChange(p)} style={[styles.toggleOption, value === p && styles.toggleOn]}>
      <Txt variant="label" color={value === p ? palette.onAccent : palette.inkMuted}>{dictionary.fitness[p]}</Txt>
    </Pressable>)}
  </View>;
}

/** THIS WEEK / THIS MONTH overview: gym + activity in one place. Steps come only from the health app. */
export function Overview({ period, data, system }: { period: Period; data: FitnessPeriod; system: UnitSystem }) {
  const { dictionary } = useI18n();
  const copy = dictionary.fitness;
  const tiles: { label: string; value: string; unit?: string; glyph: string; color: string; note?: string; testID: string }[] = [
    { label: copy.activeDays, value: String(data.activeDays), glyph: 'calendar-check', color: palette.accent, testID: 'fit-active-days' },
    { label: copy.gymWorkouts, value: String(data.gymSessions), glyph: 'dumbbell', color: KEY_COLOR.GYM, testID: 'fit-gym' },
    { label: copy.runs, value: String(data.runningSessions), glyph: 'run-fast', color: KEY_COLOR.RUNNING, testID: 'fit-runs' },
    { label: copy.totalDistance, value: distanceValue(data.totalDistanceMeters, system, 1), unit: distanceUnit(system), glyph: 'map-marker-distance', color: KEY_COLOR.WALKING, testID: 'fit-distance' },
    { label: copy.activeTime, value: formatMinutes(data.totalActiveMinutes), glyph: 'timer-outline', color: palette.accent, testID: 'fit-time' },
    { label: copy.calories, value: data.calories != null ? data.calories.toLocaleString() : '—', unit: data.calories != null ? 'kcal' : undefined, glyph: 'fire', color: '#FF8A3D', note: data.calories != null ? copy.caloriesNote : undefined, testID: 'fit-calories' },
    { label: copy.steps, value: data.steps != null ? data.steps.toLocaleString() : '—', glyph: 'shoe-print', color: '#8BC34A', note: data.steps != null ? copy.stepsNote : dictionary.activity.notConnectedShort, testID: 'fit-steps' },
  ];
  return <Card style={styles.overview}>
    <Txt variant="overline" color={palette.inkMuted}>{period === 'week' ? copy.thisWeek : copy.thisMonth}</Txt>
    <View style={styles.tiles}>
      {tiles.map((t) => <View key={t.label} style={styles.tile} accessible accessibilityLabel={`${t.label} ${t.value} ${t.unit ?? ''}`}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><GlyphIcon glyph={mdi(t.glyph)} size={15} color={t.color} /><Txt variant="tab" color={palette.inkMuted}>{t.label}</Txt></View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
          <Txt variant="metric" testID={t.testID} style={{ fontVariant: ['tabular-nums'] }}>{t.value}</Txt>
          {t.unit ? <Txt variant="tab" color={palette.inkMuted}>{t.unit}</Txt> : null}
        </View>
        {t.note ? <Txt variant="tab" color={palette.inkFaint} numberOfLines={1}>{t.note}</Txt> : null}
      </View>)}
    </View>
  </Card>;
}

/** Combined streak: any qualifying gym or activity session (imported ones too) keeps it alive. */
export function CombinedStreak({ fitness }: { fitness: Fitness }) {
  const { dictionary, language } = useI18n();
  const copy = dictionary.fitness;
  const s = fitness.streak;
  return <LinearGradient colors={['#1A1408', '#0E1220', '#0B1220']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.streak, shadow(palette.orange, 0.35)]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={styles.flame}><GlyphIcon glyph={mdi('fire')} size={32} color={palette.orange} /></View>
      <View style={{ flex: 1 }}>
        <Txt variant="label" color={palette.inkMuted}>{copy.streak.toUpperCase()}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Txt variant="number" color={palette.white} style={styles.streakValue} testID="streak-current">{s.current}</Txt>
          <Txt variant="h3" color={palette.white}>{s.current === 1 ? dictionary.progress.day : dictionary.progress.days}</Txt>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Txt variant="tab" color={palette.inkMuted}>{copy.best}</Txt>
        <Txt variant="title" color={palette.white} testID="streak-best">{s.best}</Txt>
      </View>
    </View>
    <View style={styles.days}>
      {s.last7.map((d) => <View key={d.date} style={styles.dayCol} accessible accessibilityLabel={`${parseDay(d.date).toLocaleDateString(language, { weekday: 'long' })}: ${d.active ? '✓' : '—'}`}>
        <Txt variant="tab" color={palette.inkMuted}>{parseDay(d.date).toLocaleDateString(language, { weekday: 'narrow' })}</Txt>
        <View style={[styles.dayDot, d.active && styles.dayDotOn]}>{d.active ? <GlyphIcon glyph={mdi('check-bold')} size={14} color={palette.onAccent} /> : null}</View>
      </View>)}
    </View>
    <Txt variant="tab" color={palette.inkMuted}>{format(copy.streakNote, { minutes: fitness.rule.minActivityMinutes })}</Txt>
  </LinearGradient>;
}

/** Stacked active minutes per day (week: Mon–Sun; month: every day), with a legend of the categories present. */
export function StackedChart({ data, period }: { data: FitnessPeriod; period: Period }) {
  const { dictionary, language } = useI18n();
  const label = useKeyLabel();
  const present = ORDER.filter((k) => data.days.some((d) => (d.minutes[k] ?? 0) > 0));
  const max = Math.max(30, ...data.days.map((d) => d.totalMinutes));
  const thin = period === 'month';
  return <Card style={{ gap: 12 }}>
    <View style={[styles.chart, { gap: thin ? 2 : 8 }]}>
      {data.days.map((d) => <View key={d.date} style={styles.chartCol} accessible accessibilityLabel={`${parseDay(d.date).toLocaleDateString(language, { weekday: 'short', day: 'numeric' })}: ${d.totalMinutes} ${dictionary.common.min}`}>
        {!thin ? <Txt variant="tab" color={d.totalMinutes ? palette.ink : palette.inkFaint}>{d.totalMinutes || ''}</Txt> : null}
        <View style={[styles.track, { maxWidth: thin ? 9 : 30, borderRadius: thin ? 4 : 10 }]}>
          {ORDER.filter((k) => (d.minutes[k] ?? 0) > 0).reverse().map((k) => <View key={k} style={{ height: `${((d.minutes[k] ?? 0) / max) * 100}%`, backgroundColor: KEY_COLOR[k] }} />)}
        </View>
        {!thin ? <Txt variant="tab" color={palette.inkMuted}>{parseDay(d.date).toLocaleDateString(language, { weekday: 'narrow' })}</Txt>
          : <Txt variant="tab" color={palette.inkFaint} style={{ fontSize: 8 }}>{parseDay(d.date).getDate() % 5 === 0 || parseDay(d.date).getDate() === 1 ? parseDay(d.date).getDate() : ' '}</Txt>}
      </View>)}
    </View>
    {present.length ? <View style={styles.legend}>{present.map((k) => <View key={k} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: KEY_COLOR[k] }]} /><Txt variant="tab" color={palette.inkSoft}>{label(k)}</Txt></View>)}</View>
      : <Txt variant="small" color={palette.inkMuted}>{dictionary.fitness.noData}</Txt>}
  </Card>;
}

export function Breakdown({ data, system }: { data: FitnessPeriod; system: UnitSystem }) {
  const { dictionary } = useI18n();
  const label = useKeyLabel();
  const copy = dictionary.fitness;
  if (!data.breakdown.length) return null;
  return <Section title={copy.breakdown}><Card style={{ gap: 14 }}>
    {data.breakdown.map((b) => <View key={b.key} style={styles.breakRow} testID={`breakdown-${b.key}`}>
      <View style={[styles.breakIcon, { backgroundColor: `${KEY_COLOR[b.key]}1F` }]}><GlyphIcon glyph={mdi(KEY_ICON[b.key])} size={18} color={KEY_COLOR[b.key]} /></View>
      <View style={{ flex: 1 }}>
        <Txt variant="row">{label(b.key)}</Txt>
        <Txt variant="small" color={palette.inkMuted}>{b.sessions === 1 ? copy.oneSession : format(copy.sessions, { count: b.sessions })}</Txt>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {b.distanceMeters > 0 ? <Txt variant="h3" style={{ fontVariant: ['tabular-nums'] }}>{distanceValue(b.distanceMeters, system, 1)} {distanceUnit(system)}</Txt> : null}
        <Txt variant={b.distanceMeters > 0 ? 'small' : 'h3'} color={b.distanceMeters > 0 ? palette.inkMuted : palette.ink}>{formatMinutes(b.minutes)}</Txt>
      </View>
    </View>)}
  </Card></Section>;
}

export function TrainingTime({ data }: { data: FitnessPeriod }) {
  const { dictionary } = useI18n();
  const copy = dictionary.fitness;
  const yoga = data.breakdown.find((b) => b.key === 'YOGA')?.minutes ?? 0;
  const rows: [string, number, string][] = [[copy.gymTime, data.gymMinutes, KEY_COLOR.GYM], [copy.cardioTime, data.cardioMinutes, KEY_COLOR.RUNNING], [copy.outdoorTime, data.outdoorMinutes, KEY_COLOR.HIKING], [copy.yogaTime, yoga, KEY_COLOR.YOGA]];
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return <Section title={copy.time}><Card style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <Txt variant="label" color={palette.inkMuted}>{copy.activeTime}</Txt>
      <Txt variant="metric">{formatMinutes(data.totalActiveMinutes)}</Txt>
    </View>
    {rows.map(([name, minutes, color]) => <View key={name} style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt variant="small">{name}</Txt><Txt variant="small" color={palette.inkMuted}>{formatMinutes(minutes)}</Txt></View>
      <View style={styles.bar}><View style={[styles.barFill, { width: `${(minutes / max) * 100}%`, backgroundColor: color }]} /></View>
    </View>)}
  </Card></Section>;
}

export function DistanceMetrics({ fitness, system }: { fitness: Fitness; system: UnitSystem }) {
  const { dictionary } = useI18n();
  const copy = dictionary.fitness;
  const types: ActivityType[] = ['RUNNING', 'WALKING', 'HIKING', 'TREKKING'];
  const byType = types.filter((t) => (fitness.month.distanceByType[t] ?? 0) > 0);
  return <Section title={copy.distanceTitle}><Card style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <Big label={copy.weekDistance} value={distanceValue(fitness.week.totalDistanceMeters, system, 1)} unit={distanceUnit(system)} testID="dist-week" />
      <Big label={copy.monthDistance} value={distanceValue(fitness.month.totalDistanceMeters, system, 1)} unit={distanceUnit(system)} testID="dist-month" />
    </View>
    {byType.map((t) => <View key={t} style={styles.breakRow}>
      <View style={[styles.legendDot, { backgroundColor: KEY_COLOR[t] }]} />
      <Txt variant="small" style={{ flex: 1 }}>{dictionary.activity.types[t]}</Txt>
      <Txt variant="label" style={{ fontVariant: ['tabular-nums'] }}>{distanceValue(fitness.month.distanceByType[t] ?? 0, system, 1)} {distanceUnit(system)}</Txt>
    </View>)}
  </Card></Section>;
}

export function RunningProgress({ fitness, system }: { fitness: Fitness; system: UnitSystem }) {
  const { dictionary } = useI18n();
  const copy = dictionary.fitness;
  const r = fitness.running;
  return <Section title={copy.running}>{r.totalRuns ? <Card style={styles.runGrid}>
    <Big label={copy.totalRuns} value={String(r.totalRuns)} testID="run-total" />
    <Big label={copy.weekDistance} value={distanceValue(r.weekDistanceMeters, system, 1)} unit={distanceUnit(system)} />
    <Big label={copy.monthDistance} value={distanceValue(r.monthDistanceMeters, system, 1)} unit={distanceUnit(system)} />
    <Big label={copy.avgPace} value={r.averagePaceSecPerKm ? formatPace(r.averagePaceSecPerKm, system).split(' ')[0] : '—'} unit={r.averagePaceSecPerKm ? formatPace(r.averagePaceSecPerKm, system).split(' ')[1] : undefined} testID="run-pace" />
    <Big label={copy.longestRun} value={r.longestRunMeters ? distanceValue(r.longestRunMeters, system, 2) : '—'} unit={r.longestRunMeters ? distanceUnit(system) : undefined} testID="run-longest" />
    <Big label={copy.fastestPace} value={r.fastestPaceSecPerKm ? formatPace(r.fastestPaceSecPerKm, system).split(' ')[0] : '—'} unit={r.fastestPaceSecPerKm ? formatPace(r.fastestPaceSecPerKm, system).split(' ')[1] : undefined} />
    <Big label={copy.totalRunTime} value={formatMinutes(r.totalMinutes)} />
  </Card> : <Card><Txt variant="small" color={palette.inkMuted}>{copy.runningEmpty}</Txt></Card>}</Section>;
}

function Big({ label, value, unit, testID }: { label: string; value: string; unit?: string; testID?: string }) {
  return <View style={{ flex: 1, minWidth: '30%', gap: 2 }}>
    <Txt variant="tab" color={palette.inkMuted}>{label}</Txt>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}><Txt variant="h3" testID={testID} style={{ fontVariant: ['tabular-nums'] }}>{value}</Txt>{unit ? <Txt variant="tab" color={palette.inkMuted}>{unit}</Txt> : null}</View>
  </View>;
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: palette.glass, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line, marginTop: 18 },
  toggleOption: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
  toggleOn: { backgroundColor: palette.accent },
  overview: { marginTop: 14, gap: 12, padding: 16 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  tile: { width: '50%', gap: 2, paddingRight: 8 },
  streak: { marginTop: 14, borderRadius: radius.xl, padding: 18, gap: 16, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,162,76,0.30)' },
  flame: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,162,76,0.14)', borderWidth: 1, borderColor: 'rgba(255,162,76,0.35)', alignItems: 'center', justifyContent: 'center' },
  streakValue: { fontSize: 40, lineHeight: 46 },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 4 },
  dayDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: palette.lineStrong, alignItems: 'center', justifyContent: 'center' },
  dayDotOn: { backgroundColor: palette.accent, borderColor: palette.accent },
  chart: { flexDirection: 'row', height: 150 },
  chartCol: { flex: 1, alignItems: 'center', gap: 4 },
  track: { flex: 1, width: '100%', backgroundColor: palette.grayBg, justifyContent: 'flex-end', overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  breakIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 8, borderRadius: 4, backgroundColor: palette.grayBg, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  runGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, columnGap: 8 },
});

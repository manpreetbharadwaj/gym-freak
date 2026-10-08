import React, { useEffect } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AssetKey, workoutImage } from '@/assets';
import { format, useI18n } from '@/i18n';
import { controls, gradients, motion, palette, radius, shadow } from '@/theme';
import { PlanDay, Workout } from '@/types/domain';
import { dayKey, parseDay } from '@/utils/dates';
import { haptics } from '@/utils/haptics';
import { AssetImage } from './AssetImage';
import { LockBadge, useLabels } from './cards';
import { Skeleton } from './feedback';
import { ExerciseMedia } from './media';
import { Glyph, GlyphIcon, GradientButton, mdi, PressableScale, Txt } from './primitives';

/** Rough estimate (MET-style, by difficulty); always labelled as an estimate in the UI. */
export function estimateKcal(minutes: number, difficulty?: string) {
  const perMinute = difficulty === 'advanced' ? 9 : difficulty === 'intermediate' ? 7 : 5.5;
  return Math.round((minutes * perMinute) / 5) * 5;
}

/** Width-animated bar (200–400 ms, no bounce). */
export function ProgressBar({ progress, color = palette.violet, track = palette.grayBg, height = 8 }: { progress: number; color?: string; track?: string; height?: number }) {
  const value = useSharedValue(0);
  useEffect(() => { value.value = withTiming(Math.min(1, Math.max(0, progress)), { duration: motion.slow, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }); }, [progress, value]);
  const fill = useAnimatedStyle(() => ({ width: `${value.value * 100}%` }));
  return <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
    <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: color }, fill]} />
  </View>;
}

/**
 * Today's workout hero: the photo fades into navy on the left/bottom so copy sits on solid ground;
 * glass meta pills, a display-font title, and the capsule CTA + a details button.
 */
export function PhotoHeroCard({ workout, eyebrow, onOpen, onStart, progress }: { workout: Workout; eyebrow: string; onOpen: () => void; onStart: () => void; progress?: { done: number; total: number } }) {
  const { muscle, difficulty, dictionary } = useLabels();
  const copy = dictionary.home;
  const stats: [Glyph, string][] = [
    [mdi('timer-outline'), `${workout.estimatedMinutes} ${dictionary.common.min}`],
    [mdi('format-list-numbered'), format(copy.exercises, { count: workout.exercises.length })],
    [mdi('signal-cellular-2'), difficulty(workout.difficulty)],
    [mdi('fire'), format(copy.kcalEst, { count: estimateKcal(workout.estimatedMinutes, workout.difficulty) })],
  ];
  const pct = progress && progress.total ? progress.done / progress.total : 0;
  return <PressableScale onPress={onOpen} scaleTo={0.985} accessibilityLabel={workout.name}>
    <View style={[styles.heroShadow, shadow(palette.accent, 0.55)]}>
      <View style={styles.hero}>
        <View style={styles.heroPhoto}>
          <ExerciseMedia media={workout.media} muscle={workout.muscleGroups[0]} fallback={workout.media.thumbnailUrl ? undefined : 'home/todays-workout'} height={300} rounded={0} autoPlay={false} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(8,16,27,0.94)', 'rgba(8,16,27,0.55)', 'rgba(8,16,27,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(8,16,27,0)', 'rgba(8,16,27,0.35)', 'rgba(8,16,27,0.98)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        </View>
        <View style={styles.heroTop}>
          <View style={styles.heroTag}><View style={styles.liveDot} /><Txt variant="label" color={palette.white}>{eyebrow}</Txt></View>
          {workout.locked ? <LockBadge small /> : null}
        </View>
        <View style={styles.heroBottom}>
          <Txt variant="overline" color={palette.accentSoft}>{workout.muscleGroups.map((m) => muscle(m).toUpperCase()).join(' · ')}</Txt>
          <Txt variant="hero" color={palette.white} numberOfLines={2} style={{ marginTop: 6, maxWidth: '82%' }}>{workout.name}</Txt>
          <View style={styles.heroStats}>{stats.map(([glyph, label]) => <View key={label} style={styles.heroStat}><GlyphIcon glyph={glyph} size={13} color={palette.accentSoft} /><Txt variant="label" color={palette.inkSoft} numberOfLines={1}>{label}</Txt></View>)}</View>
          {progress && progress.done > 0 ? <View style={styles.heroProgress}>
            <View style={{ flex: 1 }}><ProgressBar progress={pct} color={palette.accent} track="rgba(255,255,255,0.10)" height={5} /></View>
            <Txt variant="label" color={palette.accentSoft}>{Math.round(pct * 100)}%</Txt>
          </View> : null}
          <View style={styles.heroActions}>
            <GradientButton label={copy.start} icon="play" onPress={onStart} style={{ flex: 1 }} />
            <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={workout.name} hitSlop={6} style={({ pressed }) => [styles.heroMore, pressed && { transform: [{ scale: 0.94 }] }]}>
              <GlyphIcon glyph={mdi('information-variant')} size={22} color={palette.white} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  </PressableScale>;
}

/** A row of compact figures in one glass container, separated by hairlines (dashboard "at a glance"). */
export function MetricStrip({ items, style }: { items: { label: string; value: string | null; unit?: string; glyph: Glyph; color: string; note?: string }[]; style?: StyleProp<ViewStyle> }) {
  const { dictionary } = useI18n();
  return <View style={[styles.strip, style]}>
    {items.map((item, index) => <View key={item.label} style={[styles.stripItem, index > 0 && styles.stripDivider]} accessible accessibilityLabel={item.value == null ? `${item.label}: ${dictionary.home.notTracked}` : `${item.label}: ${item.value}${item.unit ? ` ${item.unit}` : ''}${item.note ? `, ${item.note}` : ''}`}>
      <View style={styles.stripValue}><GlyphIcon glyph={item.glyph} size={15} color={item.color} style={{ marginRight: 2 }} /><Txt variant="metric" numberOfLines={1} color={item.value == null ? palette.inkFaint : undefined}>{item.value ?? '—'}</Txt>{item.unit && item.value != null ? <Txt variant="label" color={palette.inkMuted}>{item.unit}</Txt> : null}</View>
      <Txt variant="tab" color={palette.inkMuted} numberOfLines={1}>{item.label}</Txt>
      {item.value == null ? <Txt variant="tab" color={palette.inkFaint} numberOfLines={1}>{dictionary.home.notTracked}</Txt> : item.note ? <Txt variant="tab" color={palette.inkFaint} numberOfLines={1}>{item.note}</Txt> : null}
    </View>)}
  </View>;
}

const dayTone: Record<PlanDay['status'], { bg: string; fg: string; glyph?: string }> = {
  completed: { bg: 'rgba(52,211,153,0.14)', fg: '#34D399', glyph: 'check-bold' },
  today: { bg: palette.accent, fg: palette.onAccent },
  upcoming: { bg: palette.surfaceRaised, fg: palette.ink },
  missed: { bg: 'rgba(255,162,76,0.14)', fg: '#FFA24C', glyph: 'close' },
  rest: { bg: 'transparent', fg: palette.inkFaint, glyph: 'weather-night' },
  not_started: { bg: 'transparent', fg: palette.inkFaint },
};

/** Mon→Sun strip with the plan status of each day. */
export function WeekStrip({ days, onPressDay }: { days: PlanDay[]; onPressDay?: (day: PlanDay) => void }) {
  const { dictionary } = useI18n();
  const letters = dictionary.onboarding.days.weekdays;
  const copy = dictionary.plan;
  const statusLabel: Record<PlanDay['status'], string> = { completed: copy.completed, today: copy.today, upcoming: copy.upcoming, missed: copy.missed, rest: copy.rest, not_started: copy.notStarted };
  return <View style={styles.week}>
    {days.map((day) => {
      const tone = dayTone[day.status];
      const isToday = day.date === dayKey(new Date());
      return <Pressable key={day.date} onPress={onPressDay && day.workout ? () => { haptics.select(); onPressDay(day); } : undefined} accessibilityRole={day.workout ? 'button' : undefined}
        accessibilityLabel={`${letters[day.weekday]} ${parseDay(day.date).getDate()}, ${statusLabel[day.status]}${day.workout ? `, ${day.workout.name}` : ''}`} style={styles.weekDay}>
        <Txt variant="tab" color={isToday ? palette.accent : palette.inkMuted} numberOfLines={1}>{letters[day.weekday]}</Txt>
        <View style={[styles.weekDot, { backgroundColor: tone.bg }, day.status === 'upcoming' && styles.weekDotUpcoming, isToday && day.status !== 'today' && styles.weekDotRing]}>
          {tone.glyph ? <GlyphIcon glyph={mdi(tone.glyph)} size={15} color={tone.fg} /> : <Txt variant="row" color={tone.fg}>{parseDay(day.date).getDate()}</Txt>}
        </View>
        <View style={[styles.weekMark, { backgroundColor: day.workout ? (day.status === 'completed' ? palette.success : palette.accent) : 'transparent' }]} />
      </Pressable>;
    })}
  </View>;
}

/** A Quick Start tile: a remote (admin-uploaded) image, or a bundled one for the offline fallback. */
export interface QuickItem { key: string; label: string; uri?: string; asset?: AssetKey; onPress: () => void }
const QUICK_COLUMNS = 3;

/** Story-style circular photo shortcuts. */
export function QuickAccessRail({ items }: { items: QuickItem[] }) {
  // Invisible spacers complete the last row, so any number of tiles keeps the 3-column rhythm.
  const spacers = (QUICK_COLUMNS - (items.length % QUICK_COLUMNS)) % QUICK_COLUMNS;
  return <View style={styles.quickRow}>
    {items.map((item) => <PressableScale key={item.key} onPress={item.onPress} accessibilityLabel={item.label} containerStyle={styles.quickItem}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickRing}>
          <View style={styles.quickInner}>{item.uri ? <Image source={{ uri: item.uri }} style={styles.quickPhoto} contentFit="cover" cachePolicy="memory-disk" transition={150} /> : item.asset ? <AssetImage asset={item.asset} style={styles.quickPhoto} /> : null}</View>
        </LinearGradient>
        <Txt variant="label" color={palette.ink} numberOfLines={1}>{item.label}</Txt>
      </View>
    </PressableScale>)}
    {Array.from({ length: spacers }, (_, i) => <View key={`spacer-${i}`} style={styles.quickItem} />)}
  </View>;
}

/** Same footprint as the rail while Quick Start loads, so Home doesn't jump. */
export function QuickAccessSkeleton({ count = 6 }: { count?: number }) {
  return <View style={styles.quickRow}>{Array.from({ length: count }, (_, i) => <View key={i} style={[styles.quickItem, { gap: 8 }]}><Skeleton width={72} height={72} round={36} /><Skeleton width={48} height={10} /></View>)}</View>;
}

/** Photo workout card: copy sits on the photo's navy fade; glass bookmark + duration pills. */
export function PhotoWorkoutCard({ workout, saved, onToggleSave, onPress, width = 240, height = 200 }: { workout: Workout; saved?: boolean; onToggleSave?: () => void; onPress: () => void; width?: number | `${number}%`; height?: number }) {
  const { muscle, difficulty, dictionary } = useLabels();
  return <PressableScale onPress={onPress} scaleTo={0.97} containerStyle={{ width }} accessibilityLabel={workout.name}>
    <View style={[styles.cardShadow, shadow(undefined, 0.9)]}><View style={[styles.card, { height }]}>
      <ExerciseMedia media={workout.media} muscle={workout.muscleGroups[0]} fallback={workout.media.thumbnailUrl ? undefined : workoutImage(workout)} height={height} rounded={0} autoPlay={false} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(8,16,27,0.05)', 'rgba(8,16,27,0.35)', 'rgba(8,16,27,0.96)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.cardTop}>
        <View style={styles.cardDuration}><GlyphIcon glyph={mdi('timer-outline')} size={13} color={palette.accentSoft} /><Txt variant="label" color={palette.white}>{workout.estimatedMinutes} {dictionary.common.min}</Txt></View>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {workout.locked ? <LockBadge small /> : null}
          {onToggleSave ? <Pressable onPress={() => { haptics.select(); onToggleSave(); }} hitSlop={10} accessibilityRole="button" accessibilityState={{ selected: !!saved }} accessibilityLabel={saved ? dictionary.home.saved : dictionary.home.save} style={styles.bookmark}>
            <GlyphIcon glyph={mdi(saved ? 'bookmark' : 'bookmark-outline')} size={17} color={saved ? palette.accent : palette.white} />
          </Pressable> : null}
        </View>
      </View>
      <View style={styles.cardBottom}>
        <Txt variant="h3" color={palette.white} numberOfLines={1}>{workout.name}</Txt>
        <Txt variant="small" color={palette.inkSoft} numberOfLines={1}>{difficulty(workout.difficulty)} · {workout.muscleGroups.slice(0, 2).map(muscle).join(', ')}</Txt>
      </View>
    </View></View>
  </PressableScale>;
}

export function SummaryTile({ glyph, color, value, unit, label, note, style }: { glyph: Glyph; color: string; value: string; unit?: string; label: string; note?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.tile, shadow(undefined, 0.5), style]} accessible accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}${note ? `, ${note}` : ''}`}>
    <View style={[styles.tileIcon, { backgroundColor: `${color}14` }]}><GlyphIcon glyph={glyph} size={18} color={color} /></View>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 10 }}>
      <Txt variant="metric">{value}</Txt>{unit ? <Txt variant="label" color={palette.inkMuted}>{unit}</Txt> : null}
    </View>
    <Txt variant="small" color={palette.inkMuted} numberOfLines={2}>{label}</Txt>
    {note ? <Txt variant="label" color={palette.inkFaint} numberOfLines={1}>{note}</Txt> : null}
  </View>;
}

/** A body/training metric; shows an honest "not tracked" state when HealthyMe has no value. */
export function MetricTile({ label, value, unit, note, progress, color = palette.violet, style }: { label: string; value?: string; unit?: string; note?: string; progress?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const { dictionary } = useI18n();
  return <View style={[styles.metric, shadow(undefined, 0.45), style]} accessible accessibilityLabel={`${label}: ${value ?? dictionary.home.notTracked}`}>
    <Txt variant="small" color={palette.inkMuted} numberOfLines={1}>{label}</Txt>
    {value ? <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}><Txt variant="metric">{value}</Txt>{unit ? <Txt variant="label" color={palette.inkMuted}>{unit}</Txt> : null}</View>
      : <View style={styles.noData}><View style={styles.noDataDot} /><Txt variant="small" color={palette.inkFaint}>{dictionary.home.notTracked}</Txt></View>}
    {progress !== undefined ? <View style={{ marginTop: 6 }}><ProgressBar progress={progress} color={color} height={6} /></View> : null}
    {note ? <Txt variant="label" color={palette.inkFaint} numberOfLines={1} style={{ marginTop: 2 }}>{note}</Txt> : null}
  </View>;
}

/** Water card with an animated bottle level. Device-only data (see services/storage/water). */
export function WaterCard({ ml, goalMl, onAdd, onRemove }: { ml: number; goalMl: number; onAdd: () => void; onRemove: () => void }) {
  const { dictionary } = useI18n();
  const copy = dictionary.home;
  const level = useSharedValue(0);
  const ratio = Math.min(1, ml / goalMl);
  useEffect(() => { level.value = withTiming(ratio, { duration: motion.slow, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }); }, [level, ratio]);
  const fill = useAnimatedStyle(() => ({ height: `${level.value * 100}%` }));
  const litres = (v: number) => (v / 1000).toFixed(1);
  return <View style={[styles.water, shadow(palette.sky, 0.6)]}>
    <View style={styles.bottle} accessible accessibilityLabel={format(copy.waterAmount, { current: litres(ml), goal: litres(goalMl) })}>
      <View style={styles.bottleNeck} />
      <View style={styles.bottleBody}>
        <Animated.View style={[styles.bottleFill, fill]}><LinearGradient colors={['#6FD3FF', '#3F7BFF']} style={StyleSheet.absoluteFill} /></Animated.View>
      </View>
    </View>
    <View style={{ flex: 1, gap: 4 }}>
      <Txt variant="label" color={palette.accentSoft}>{copy.water.toUpperCase()}</Txt>
      <Txt variant="metric">{format(copy.waterAmount, { current: litres(ml), goal: litres(goalMl) })}</Txt>
      <Txt variant="label" color={palette.inkFaint}>{copy.waterNote}</Txt>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <PressableScale onPress={onRemove} disabled={ml <= 0} accessibilityLabel={copy.removeWater} containerStyle={{ opacity: ml <= 0 ? 0.4 : 1 }}>
          <View style={styles.waterMinus}><GlyphIcon glyph={mdi('minus')} size={18} color={palette.accentSoft} /></View>
        </PressableScale>
        <PressableScale onPress={onAdd} accessibilityLabel={copy.addWater} containerStyle={{ flex: 1 }}>
          <View style={styles.waterAdd}><GlyphIcon glyph={mdi('cup-water')} size={18} color={palette.onAccent} /><Txt variant="button" color={palette.onAccent}>{copy.addWater}</Txt></View>
        </PressableScale>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  heroShadow: { borderRadius: radius.xl, backgroundColor: palette.surface },
  hero: { height: 330, borderRadius: radius.xl, overflow: 'hidden', justifyContent: 'space-between', backgroundColor: '#08101B', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(99,216,255,0.22)' },
  heroPhoto: { position: 'absolute', top: 0, right: 0, bottom: 0, left: '22%' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(8,16,27,0.62)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.lineStrong, paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.accent, shadowColor: palette.accent, shadowOpacity: 0.9, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } },
  heroBottom: { padding: 18, paddingTop: 0 },
  heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(20,24,34,0.72)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  heroProgress: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  heroMore: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,24,34,0.72)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.lineStrong },
  strip: { flexDirection: 'row', backgroundColor: palette.surface, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line, paddingVertical: 14 },
  stripItem: { flex: 1, minWidth: 0, paddingHorizontal: 14, gap: 4 },
  stripDivider: { borderLeftWidth: StyleSheet.hairlineWidth * 2, borderLeftColor: palette.line },
  stripHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stripValue: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  week: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: palette.surface, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 6, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  weekDay: { flex: 1, alignItems: 'center', gap: 7 },
  weekDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  weekDotUpcoming: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.lineStrong },
  weekDotRing: { borderWidth: 1.5, borderColor: palette.accent },
  weekMark: { width: 4, height: 4, borderRadius: 2 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  quickItem: { width: '31%', alignItems: 'center' },
  quickRing: { width: 72, height: 72, borderRadius: 36, padding: 2 },
  quickInner: { flex: 1, borderRadius: 35, backgroundColor: palette.canvas, padding: 2.5 },
  quickPhoto: { flex: 1, borderRadius: 33 },
  cardShadow: { backgroundColor: palette.surface, borderRadius: radius.lg },
  card: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: palette.surface, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  cardTop: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookmark: { width: controls.iconButton.sm, height: controls.iconButton.sm, borderRadius: 18, backgroundColor: 'rgba(8,16,27,0.62)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  cardDuration: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(8,16,27,0.62)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill },
  cardBottom: { position: 'absolute', left: 14, right: 14, bottom: 13, gap: 2 },
  tile: { flex: 1, minWidth: 0, backgroundColor: palette.surface, borderRadius: radius.lg, padding: 14, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  tileIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  metric: { flex: 1, minWidth: 0, backgroundColor: palette.surface, borderRadius: radius.md, padding: 14, gap: 4, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  noData: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  noDataDot: { width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: palette.inkFaint },
  water: { flexDirection: 'row', gap: 16, alignItems: 'center', backgroundColor: palette.surface, borderRadius: radius.lg, padding: 16, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  bottle: { alignItems: 'center' },
  bottleNeck: { width: 18, height: 10, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: 'rgba(34,184,245,0.45)' },
  bottleBody: { width: 52, height: 104, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(34,184,245,0.45)', backgroundColor: palette.grayBg, overflow: 'hidden', justifyContent: 'flex-end' },
  bottleFill: { width: '100%', overflow: 'hidden' },
  waterMinus: { width: controls.button.compactHeight, height: controls.button.compactHeight, borderRadius: controls.button.compactHeight / 2, backgroundColor: palette.surfaceRaised, borderWidth: 1, borderColor: palette.lineStrong, alignItems: 'center', justifyContent: 'center' },
  waterAdd: { height: controls.button.compactHeight, borderRadius: controls.button.compactHeight / 2, backgroundColor: palette.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});

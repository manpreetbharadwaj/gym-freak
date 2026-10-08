import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { useI18n } from '@/i18n';
import { Exercise, Prescription, Workout } from '@/types/domain';
import { ExerciseMedia, visualFor } from './media';
import { Glyph, GlyphIcon, mdi, PressableScale, Txt } from './primitives';
import { GradientPair, palette, radius, shadow } from '@/theme';

export const prettyMuscle = (muscle: string, labels: Record<string, string>) => labels[muscle] ?? muscle.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

export function useLabels() {
  const { dictionary } = useI18n();
  return { muscle: (m: string) => prettyMuscle(m, dictionary.catalog.muscles), difficulty: (d: string) => dictionary.catalog.difficulty[d as keyof typeof dictionary.catalog.difficulty] ?? d, equipment: (e: string) => (dictionary.onboarding.equipment.options as Record<string, string>)[e] ?? prettyMuscle(e, {}), dictionary };
}

export function prescriptionText(p: Prescription, copy: { reps: string; sec: string }) {
  if (p.durationSeconds) return `${p.sets} × ${p.durationSeconds} ${copy.sec}`;
  const reps = p.repMin && p.repMax && p.repMin !== p.repMax ? `${p.repMin}–${p.repMax}` : `${p.repMax ?? p.repMin ?? '—'}`;
  return `${p.sets} × ${reps} ${copy.reps}`;
}

export function LockBadge({ small }: { small?: boolean }) {
  return <View style={[styles.lock, small && { paddingHorizontal: 7, paddingVertical: 4 }]}><GlyphIcon glyph={mdi('crown')} size={small ? 12 : 14} color={palette.yellow} /><Txt variant={small ? 'tab' : 'label'} color={palette.yellow}>PRO</Txt></View>;
}

export function MetaPill({ glyph, label, light }: { glyph: Glyph; label: string; light?: boolean }) {
  return <View style={[styles.meta, light && { backgroundColor: 'rgba(255,255,255,0.22)' }]}><GlyphIcon glyph={glyph} size={14} color={light ? palette.white : palette.inkSoft} /><Txt variant="label" color={light ? palette.white : palette.inkSoft} numberOfLines={1}>{label}</Txt></View>;
}

/** Compact horizontal-rail workout card (recommendations, library). */
export function WorkoutTile({ workout, onPress, width = 220, full }: { workout: Workout; onPress: () => void; width?: number; full?: boolean }) {
  const { muscle, difficulty, dictionary } = useLabels();
  const visual = visualFor(workout.muscleGroups[0]);
  return <PressableScale onPress={onPress} containerStyle={full ? undefined : { width }} accessibilityLabel={workout.name}>
    <View style={[styles.tileShadow, shadow(visual.color, 0.7)]}><View style={styles.tile}>
      <ExerciseMedia media={workout.media} muscle={workout.muscleGroups[0]} height={full ? 140 : 118} rounded={0} autoPlay={false} />
      {workout.locked ? <View style={styles.tileLock}><LockBadge small /></View> : null}
      <View style={{ padding: 14, gap: 6 }}>
        <Txt variant="h3" numberOfLines={1}>{workout.name}</Txt>
        <Txt variant="small" color={palette.inkMuted} numberOfLines={1}>{workout.muscleGroups.map(muscle).join(' · ')}</Txt>
        <View style={styles.metaRow}><MetaPill glyph={mdi('timer-outline')} label={`${workout.estimatedMinutes} ${dictionary.common.min}`} /><MetaPill glyph={mdi('signal-cellular-2')} label={difficulty(workout.difficulty)} /></View>
      </View>
    </View></View>
  </PressableScale>;
}

/** Row used in workout detail, library and swaps. */
export function ExerciseRow({ exercise, index, prescription, onPress, right, style }: { exercise: Exercise; index?: number; prescription?: Prescription; onPress: () => void; right?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { muscle, difficulty, dictionary } = useLabels();
  return <PressableScale onPress={onPress} scaleTo={0.98} accessibilityLabel={exercise.name}>
    <View style={[styles.row, shadow(undefined, 0.45), style]}>
      <ExerciseMedia media={exercise.media} muscle={exercise.primaryMuscle} height={64} rounded={18} style={{ width: 64 }} autoPlay={false} />
      <View style={{ flex: 1, gap: 2 }}>
        {index !== undefined ? <Txt variant="label" color={palette.inkFaint}>{String(index + 1).padStart(2, '0')}</Txt> : null}
        <Txt variant="h3" numberOfLines={1}>{exercise.name}</Txt>
        <Txt variant="small" color={palette.inkMuted} numberOfLines={1}>{prescription ? prescriptionText(prescription, dictionary.common) : `${muscle(exercise.primaryMuscle)} · ${difficulty(exercise.difficulty)}`}</Txt>
      </View>
      {exercise.locked ? <LockBadge small /> : null}
      {right ?? <GlyphIcon glyph={mdi('chevron-right')} size={22} color={palette.inkFaint} />}
    </View>
  </PressableScale>;
}

export function StatTile({ label, value, unit, glyph, gradient, style }: { label: string; value: string | number; unit?: string; glyph: Glyph; gradient: GradientPair; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.stat, shadow(undefined, 0.45), style]}>
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statIcon}><GlyphIcon glyph={glyph} size={18} color={palette.white} /></LinearGradient>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 10 }}><Txt variant="metric">{value}</Txt>{unit ? <Txt variant="label" color={palette.inkMuted}>{unit}</Txt> : null}</View>
    <Txt variant="small" color={palette.inkMuted} numberOfLines={2}>{label}</Txt>
  </View>;
}

export function Ring({ size, stroke, progress, gradient, track = 'rgba(255,255,255,0.08)', children, id = 'ring' }: { size: number; stroke: number; progress: number; gradient: GradientPair; track?: string; children?: React.ReactNode; id?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
      <Defs><SvgGradient id={id} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={gradient[0]} /><Stop offset="1" stopColor={gradient[gradient.length - 1]} /></SvgGradient></Defs>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={`url(#${id})`} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * Math.min(1, Math.max(0, progress))} ${c}`} />
    </Svg>
    {children}
  </View>;
}

const styles = StyleSheet.create({
  lock: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,209,102,0.14)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,209,102,0.35)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: palette.grayBg, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill, maxWidth: '100%' },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tileShadow: { backgroundColor: palette.surface, borderRadius: radius.lg },
  tile: { borderRadius: radius.lg, overflow: 'hidden' },
  tileLock: { position: 'absolute', top: 10, right: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: palette.surface, borderRadius: radius.lg, padding: 10, paddingRight: 14 },
  stat: { flex: 1, backgroundColor: palette.surface, borderRadius: radius.lg, padding: 14 },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

import React, { useId } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Line, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { Dictionary } from '@/i18n/types';
import { Glyph, GlyphIcon, mdi, Txt } from '@/components';
import AssetImage from '@/components/AssetImage';
import { AnimatedCard, firstRunTheme } from '@/components/firstRun';
import { radius } from '@/theme';

type Visual = Dictionary['intro']['visual'];
interface ArtProps { width: number; height: number; copy: Visual; photoLabel?: string }

const coral = firstRunTheme.accentCool;
const green = firstRunTheme.accentAlt;

function DetailCard({ glyph, label, value, style }: { glyph: Glyph; label?: string; value: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.detailCard, style]}>
    <GlyphIcon glyph={glyph} size={18} color={firstRunTheme.accentCool} />
    <View style={styles.detailText}>
      {label ? <Txt variant="label" color={firstRunTheme.muted} style={styles.detailLabel}>{label}</Txt> : null}
      <Txt variant="small" color={firstRunTheme.text} style={styles.detailValue}>{value}</Txt>
    </View>
  </View>;
}

/* The overlays remain in normal layout so translated copy can grow without clipping. */
export function PersonalizedArt({ width, height, copy, photoLabel }: ArtProps) {
  return <AnimatedCard style={[styles.photoCard, { width }]}>
    <View style={[styles.photoContent, { minHeight: height }]}>
      <AssetImage asset="onboarding/training-built-around-you" contentFit="cover" accessibilityLabel={photoLabel} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(12,15,22,0.08)', 'rgba(12,15,22,0)', 'rgba(12,15,22,0.48)']} locations={[0, 0.48, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <DetailCard glyph={mdi('bullseye-arrow')} label={copy.goal} value={copy.goalValue} style={styles.goalCard} />
      <View style={styles.profileRow}>
        <DetailCard glyph={mdi('calendar-check-outline')} value={copy.schedule} style={styles.profileCard} />
        <DetailCard glyph={mdi('chart-bar')} value={copy.level} style={styles.profileCard} />
      </View>
    </View>
  </AnimatedCard>;
}

export function GuidanceArt({ width, height, copy, photoLabel }: ArtProps) {
  return <AnimatedCard style={[styles.photoCard, { width }]}>
    <View style={[styles.photoContent, { minHeight: height }]}>
      <AssetImage asset="onboarding/see-every-move-clearly" contentFit="cover" accessibilityLabel={photoLabel} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(12,15,22,0.06)', 'rgba(12,15,22,0)', 'rgba(12,15,22,0.6)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      {/* This crop is a back squat; the translated goblet-squat demo name must not label it. */}
      <View style={styles.exerciseStats}>
         <View style={styles.exerciseStat}><Txt variant="h3" color={firstRunTheme.text}>3</Txt><Txt variant="label" color={firstRunTheme.muted}>{copy.sets}</Txt></View>
        <View style={styles.statDivider} />
         <View style={styles.exerciseStat}><Txt variant="h3" color={firstRunTheme.text}>12</Txt><Txt variant="label" color={firstRunTheme.muted}>{copy.reps}</Txt></View>
      </View>
      <View style={styles.coachingStack}>
        <View style={styles.scrubber} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <GlyphIcon glyph={mdi('play')} size={16} color={firstRunTheme.text} />
          <View style={styles.scrubTrack}><View style={styles.scrubFill} /><View style={styles.scrubKnob} /></View>
          <Txt variant="label" color={firstRunTheme.text}>0:12</Txt>
        </View>
        <View style={styles.coachingCard}>
          <View style={styles.coachingRow}><GlyphIcon glyph={mdi('human')} size={18} color={firstRunTheme.accentCool} /><View style={styles.flexText}><Txt variant="label" color={firstRunTheme.muted}>{copy.muscle}</Txt><Txt variant="small" color={firstRunTheme.text} style={styles.detailValue}>{copy.muscleValue}</Txt></View></View>
          <View style={styles.coachingDivider} />
          <View style={styles.coachingRow}><GlyphIcon glyph={mdi('check-circle-outline')} size={18} color={firstRunTheme.accentCool} /><View style={styles.flexText}><Txt variant="label" color={firstRunTheme.muted}>{copy.technique}</Txt><Txt variant="small" color={firstRunTheme.text} style={styles.detailValue}>{copy.techniqueValue}</Txt></View></View>
        </View>
      </View>
    </View>
  </AnimatedCard>;
}

export function ProgressArt({ width, height, copy }: ArtProps) {
  const gradientId = `progress${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const graphHeight = Math.max(105, Math.min(152, height * 0.37));
  return <AnimatedCard style={[styles.dashboard, { width, minHeight: height }]}>
    <View style={styles.between}>
      <View style={styles.flexText}>
        <Txt variant="label" color={firstRunTheme.muted}>{copy.thisWeek}</Txt>
        <View style={styles.totalRow}><Txt variant="hero" color={firstRunTheme.text} style={styles.total}>12</Txt><Txt variant="small" color={firstRunTheme.muted} style={styles.totalLabel}>{copy.workouts}</Txt></View>
      </View>
      <View style={styles.trend}><GlyphIcon glyph={mdi('trending-up')} size={16} color={coral} /><Txt variant="label" color={coral}>+18%</Txt></View>
    </View>
    <Svg width="100%" height={graphHeight} viewBox="0 0 320 124" preserveAspectRatio="none" accessibilityElementsHidden>
      <Defs><SvgGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FF8B67" stopOpacity={0.2} /><Stop offset="1" stopColor="#FF8B67" stopOpacity={0} /></SvgGradient></Defs>
      {[20, 62, 104].map((y) => <Line key={y} x1="0" x2="320" y1={y} y2={y} stroke="#EEE9E7" strokeWidth={1} />)}
      <Path d="M 10 94 C 32 94 39 71 60 71 S 89 83 110 78 S 139 43 160 46 S 190 64 211 54 S 239 25 258 27 S 289 14 308 14 L 308 116 L 10 116 Z" fill={`url(#${gradientId})`} />
      <Path d="M 10 94 C 32 94 39 71 60 71 S 89 83 110 78 S 139 43 160 46 S 190 64 211 54 S 239 25 258 27 S 289 14 308 14" stroke="#F17858" strokeWidth={3} strokeLinecap="round" fill="none" />
      <Circle cx={308} cy={14} r={7} fill="#F17858" fillOpacity={0.14} />
      <Circle cx={308} cy={14} r={3.5} fill={coral} />
    </Svg>
    <View style={styles.summaryRow}>
       <View style={styles.minutesCard}><GlyphIcon glyph={mdi('timer-outline')} size={18} color={coral} /><View style={styles.flexText}><Txt variant="h3" color={firstRunTheme.text}>340</Txt><Txt variant="label" color={firstRunTheme.muted}>{copy.minutes}</Txt></View></View>
      <View style={styles.bestCard}><GlyphIcon glyph={mdi('medal-outline')} size={21} color={coral} /><Txt variant="small" color={coral} style={styles.bestLabel}>{copy.personalBest}</Txt></View>
    </View>
  </AnimatedCard>;
}

export function ConsistencyArt({ width, height, copy }: ArtProps) {
  return <AnimatedCard style={[styles.dashboard, styles.consistency, { width, minHeight: height }]}>
    <View style={styles.complete}><GlyphIcon glyph={mdi('check-circle-outline')} size={16} color={green} /><Txt variant="label" color={green} style={styles.flexText}>{copy.complete}</Txt></View>
    <View style={styles.badgeRow}>
      {/* The supplied pack has no trophy photograph. This restrained outline is an honest badge fallback. */}
      <AssetImage asset="onboarding/weekly-trophy" contentFit="contain" style={styles.trophyTile} />
       <View style={styles.flexText}><Txt variant="label" color={firstRunTheme.muted}>{copy.badge}</Txt><Txt variant="title" color={firstRunTheme.text} style={styles.badgeTitle}>{copy.badgeValue}</Txt></View>
    </View>
    <View style={styles.streak}>
       <View style={styles.streakHeading}><Txt variant="display" color={firstRunTheme.text}>12</Txt><Txt variant="small" color={firstRunTheme.muted} style={styles.flexText}>{copy.streak}</Txt><GlyphIcon glyph={mdi('fire')} size={19} color={green} /></View>
      <View style={styles.streakDays} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{[1, 1, 1, 1, 1, 0, 0].map((on, i) => <View key={i} style={[styles.streakDay, on ? styles.streakDayOn : null]}>{on ? <GlyphIcon glyph={mdi('check')} size={12} color={firstRunTheme.text} /> : null}</View>)}</View>
    </View>
    <View style={styles.challenge}>
      <Txt variant="label" color={green}>{copy.challenge}</Txt>
      <Txt variant="h3" color={firstRunTheme.text} style={styles.challengeValue}>{copy.challengeValue}</Txt>
      <View style={styles.challengeBar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{[1, 1, 1, 0].map((on, i) => <View key={i} style={[styles.challengeSegment, on ? { backgroundColor: green } : null]} />)}</View>
    </View>
  </AnimatedCard>;
}

const styles = StyleSheet.create({
  flexText: { flex: 1, minWidth: 0 },
  photoCard: { padding: 0, borderWidth: 1, borderColor: firstRunTheme.line, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: firstRunTheme.surface },
  photoContent: { padding: 14, justifyContent: 'space-between', gap: 56 },
  detailCard: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderRadius: radius.sm, backgroundColor: 'rgba(16,16,20,0.94)', borderWidth: 1, borderColor: firstRunTheme.lineStrong },
  detailLabel: { marginBottom: 2, letterSpacing: 0 },
  detailText: { flexShrink: 1, minWidth: 0 },
  detailValue: { fontWeight: '600' },
  goalCard: { alignSelf: 'flex-start', maxWidth: '72%' },
  profileRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  profileCard: { flex: 1, flexBasis: 124, padding: 10, gap: 7 },
  exerciseStats: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'stretch', paddingVertical: 8, paddingHorizontal: 4, borderRadius: radius.sm, backgroundColor: 'rgba(16,16,20,0.94)', borderWidth: 1, borderColor: firstRunTheme.lineStrong, maxWidth: '92%' },
  exerciseStat: { paddingHorizontal: 12, gap: 1, flexShrink: 1 },
  statDivider: { width: 1, marginVertical: 3, backgroundColor: firstRunTheme.line },
  coachingStack: { gap: 11 },
  coachingCard: { padding: 12, borderRadius: radius.sm, backgroundColor: 'rgba(16,16,20,0.96)', borderWidth: 1, borderColor: firstRunTheme.lineStrong, gap: 8 },
  coachingRow: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  coachingDivider: { height: StyleSheet.hairlineWidth, backgroundColor: firstRunTheme.line, marginLeft: 27 },
  scrubber: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  scrubTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)', justifyContent: 'center' },
  scrubFill: { width: '40%', height: 3, borderRadius: 2, backgroundColor: firstRunTheme.text },
  scrubKnob: { position: 'absolute', left: '38%', width: 7, height: 7, borderRadius: 4, backgroundColor: firstRunTheme.text },
  dashboard: { borderRadius: radius.xl, borderWidth: 1, borderColor: firstRunTheme.line, padding: 20, gap: 16, backgroundColor: firstRunTheme.surface, justifyContent: 'space-between' },
  between: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  totalRow: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  total: { letterSpacing: -0.8 },
  totalLabel: { paddingBottom: 5, flexShrink: 1 },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${firstRunTheme.accentBlue}18`, paddingVertical: 7, paddingHorizontal: 9, borderRadius: radius.pill },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  minutesCard: { flexDirection: 'row', alignItems: 'center', flex: 1, flexBasis: 108, gap: 10, backgroundColor: firstRunTheme.surfaceRaised, borderRadius: radius.sm, padding: 12 },
  bestCard: { flexDirection: 'row', alignItems: 'center', flex: 1, flexBasis: 124, gap: 8, backgroundColor: `${firstRunTheme.accentCool}12`, borderRadius: radius.sm, padding: 12 },
  bestLabel: { flex: 1, fontWeight: '600' },
  consistency: { gap: 19 },
  complete: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  trophyTile: { width: 56, height: 56, borderRadius: 16, backgroundColor: firstRunTheme.surfaceRaised, borderWidth: 1, borderColor: firstRunTheme.line, alignItems: 'center', justifyContent: 'center' },
  badgeTitle: { marginTop: 4 },
  streak: { gap: 9 },
  streakHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  streakDays: { flexDirection: 'row', gap: 7 },
  streakDay: { flex: 1, height: 21, borderRadius: 5, backgroundColor: firstRunTheme.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  streakDayOn: { backgroundColor: green },
  challenge: { padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: `${firstRunTheme.accentAlt}55`, backgroundColor: `${firstRunTheme.accentAlt}12` },
  challengeValue: { marginTop: 4 },
  challengeBar: { flexDirection: 'row', gap: 5, marginTop: 12 },
  challengeSegment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: firstRunTheme.surfaceRaised },
});

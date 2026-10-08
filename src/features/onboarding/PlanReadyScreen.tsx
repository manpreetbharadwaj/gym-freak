import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { format, useI18n } from '@/i18n';
import { OnboardingAnswers } from '@/types/domain';
import { BottomBar, CheckBadge, Glyph, GlyphIcon, mdi, Txt } from '@/components';
import { AssetImage } from '@/components/AssetImage';
import { AnimatedCard, FirstRunBackground, PremiumCTA, PremiumScreenHeader, firstRunTheme } from '@/components/firstRun';
import { haptics } from '@/utils/haptics';
import { useReducedMotion } from '@/utils/motion';
import { fonts, gutter, radius, useLayout } from '@/theme';

const BUILD_MS = 2400;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Phase = 'building' | 'ready' | 'error';

/** "Building your plan" → "Your plan is ready". Persists onboarding answers to HealthyMe while the build animation runs. */
export function PlanReadyScreen({ profile, save, onDone, onBack }: { profile: OnboardingAnswers; save: () => Promise<unknown>; onDone: () => void; onBack: () => void }) {
  const { dictionary } = useI18n();
  const copy = dictionary.onboarding.complete;
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('building');
  const [attempt, setAttempt] = useState(0);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    let alive = true;
    setPhase('building');
    const minimum = new Promise((resolve) => setTimeout(resolve, BUILD_MS));
    Promise.all([saveRef.current(), minimum])
      .then(() => { if (alive) { haptics.success(); setPhase('ready'); } })
      .catch(() => { if (alive) setPhase('error'); });
    return () => { alive = false; };
  }, [attempt]);

  return <View style={styles.root}>
     <StatusBar style="light" />
     <FirstRunBackground accent={firstRunTheme.accentAlt} />
    {phase === 'ready'
      ? <Ready profile={profile} topInset={insets.top} bottomInset={insets.bottom} />
      : <Building key={attempt} failed={phase === 'error'} topInset={insets.top} bottomInset={insets.bottom} />}
     <BottomBar background={firstRunTheme.background}>
      {phase === 'error'
        ? <View style={styles.errorActions}>
             <Txt variant="small" color={firstRunTheme.muted} align="center">{copy.error}</Txt>
             <PremiumCTA label={copy.retry} icon="refresh" onPress={() => setAttempt((n) => n + 1)} />
             <Pressable accessibilityRole="button" accessibilityLabel={dictionary.common.back} onPress={onBack} style={styles.backButton}><Txt variant="label" color={firstRunTheme.muted}>{dictionary.common.back}</Txt></Pressable>
          </View>
        : <PremiumCTA label={copy.cta} icon="arrow-forward" disabled={phase !== 'ready'} loading={phase === 'building'} onPress={onDone} />}
    </BottomBar>
  </View>;
}

function Building({ failed, topInset, bottomInset }: { failed: boolean; topInset: number; bottomInset: number }) {
  const { dictionary } = useI18n();
  const copy = dictionary.onboarding.complete;
  const { compact } = useLayout();
  const reducedMotion = useReducedMotion();
  const size = compact ? 124 : 144;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useRef(new Animated.Value(0)).current;
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const id = progress.addListener(({ value }) => setPercent(Math.round(value * 100)));
    const animation = Animated.timing(progress, { toValue: failed ? 0.92 : 1, duration: reducedMotion ? 0 : BUILD_MS - 150, easing: Easing.inOut(Easing.cubic), useNativeDriver: false });
    animation.start();
    return () => { progress.removeListener(id); animation.stop(); };
  }, [failed, progress, reducedMotion]);

  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.buildContent, { paddingTop: topInset + 32, paddingBottom: bottomInset + (failed ? 240 : 130) }]}>
    <AnimatedCard style={styles.center}>
      {failed
        ? <View style={styles.errorMark}><GlyphIcon glyph={mdi('cloud-alert-outline')} size={30} color={firstRunTheme.danger} /></View>
        : <View style={[styles.progressFace, { width: size, height: size }]} accessible accessibilityRole="progressbar" accessibilityLabel={copy.building} accessibilityValue={{ min: 0, max: 100, now: percent }} accessibilityState={{ busy: true }}>
            <Svg width={size} height={size} style={[StyleSheet.absoluteFill, styles.ringRotation]}>
              <Circle cx={size / 2} cy={size / 2} r={r} stroke={firstRunTheme.line} strokeWidth={stroke} fill="none" />
              <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={firstRunTheme.accent} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })} />
            </Svg>
            <Txt variant="title" color={firstRunTheme.text} style={styles.percent}>{percent}<Txt variant="label" color={firstRunTheme.muted}>%</Txt></Txt>
          </View>}
       <Txt variant="question" color={firstRunTheme.text} align="center" style={styles.buildTitle}>{failed ? dictionary.states.errorTitle : copy.building}</Txt>
      {!failed ? <View style={styles.checks}>{copy.checks.map((label, i) => <CheckLine key={label} label={label} done={percent >= ((i + 1) / copy.checks.length) * 100 - 4} />)}</View> : null}
    </AnimatedCard>
  </ScrollView>;
}

function CheckLine({ label, done }: { label: string; done: boolean }) {
  return <View style={styles.checkLine}>
    <View style={styles.checkSlot}>{!done ? <View style={styles.pendingDot} /> : null}<View style={StyleSheet.absoluteFill}><CheckBadge visible={done} color={firstRunTheme.accent} size={22} dark /></View></View>
    <Txt variant="small" color={done ? firstRunTheme.text : firstRunTheme.muted} style={styles.flexCopy}>{label}</Txt>
  </View>;
}

function Ready({ profile, topInset, bottomInset }: { profile: OnboardingAnswers; topInset: number; bottomInset: number }) {
  const { dictionary } = useI18n();
  const ob = dictionary.onboarding;
  const copy = ob.complete;
  const { compact } = useLayout();
  const goalKey = profile.goal;
  const locationKey = profile.location;
  const tiles: { label: string; value: string; glyph: Glyph }[] = [
    { label: copy.schedule, value: format(copy.perWeek, { count: profile.daysPerWeek ?? 3 }), glyph: mdi('calendar-check-outline') },
    { label: copy.session, value: profile.duration ? `${profile.duration.replace('-', '–')} ${ob.duration.unit}` : '—', glyph: mdi('timer-outline') },
    { label: copy.location, value: locationKey ? ob.location.options[locationKey].title : '—', glyph: mdi('map-marker-outline') },
  ];

  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.readyContent, { paddingTop: topInset + 28, paddingBottom: bottomInset + 132 }]}>
    <AnimatedCard>
      <View style={styles.readyMark}><GlyphIcon glyph={mdi('check')} size={24} color={firstRunTheme.accent} /></View>
      <PremiumScreenHeader eyebrow="GYM FREAK" title={copy.title} subtitle={copy.body} />
    </AnimatedCard>

    <AnimatedCard delay={60} style={styles.goalCard}>
      <AssetImage asset={`goals/${goalKey || 'build-muscle'}`} contentFit="cover" style={{ width: compact ? 86 : 100, height: compact ? 104 : 118, borderRadius: radius.sm }} />
      <View style={styles.goalCopy}>
        <Txt variant="label" color={firstRunTheme.muted}>{copy.goal}</Txt>
        <Txt variant="h3" color={firstRunTheme.text} style={styles.goalTitle}>{goalKey ? ob.goal.options[goalKey].title : '—'}</Txt>
        <View style={styles.goalRule} />
      </View>
    </AnimatedCard>

    <AnimatedCard delay={100} style={styles.summaryCard}>
      {tiles.map((tile, index) => <View key={tile.label} style={[styles.summaryRow, index > 0 && styles.summaryDivider]}>
        <View style={styles.summaryIcon}><GlyphIcon glyph={tile.glyph} size={21} color={firstRunTheme.accent} /></View>
        <View style={styles.flexCopy}>
          <Txt variant="label" color={firstRunTheme.muted}>{tile.label}</Txt>
          <Txt variant="h3" color={firstRunTheme.text} style={styles.summaryValue}>{tile.value}</Txt>
        </View>
      </View>)}
    </AnimatedCard>
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: firstRunTheme.background },
  flexCopy: { flex: 1 },
  errorActions: { gap: 12 },
  backButton: { alignSelf: 'center', minHeight: 40, justifyContent: 'center', paddingHorizontal: 20 },
  buildContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: gutter, maxWidth: 520, width: '100%', alignSelf: 'center' },
  center: { alignItems: 'center', width: '100%' },
  progressFace: { alignItems: 'center', justifyContent: 'center' },
  ringRotation: { transform: [{ rotate: '-90deg' }] },
  percent: { fontSize: 28, lineHeight: 34, fontVariant: ['tabular-nums'] },
  buildTitle: { marginTop: 28, fontFamily: fonts.display, letterSpacing: -0.8 },
  checks: { marginTop: 28, width: '100%', maxWidth: 360, borderRadius: radius.lg, borderWidth: 1, borderColor: firstRunTheme.line, backgroundColor: firstRunTheme.surface, paddingHorizontal: 18, paddingVertical: 8 },
  checkLine: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 10 },
  checkSlot: { width: 22, height: 22 },
  pendingDot: { position: 'absolute', left: 2, top: 2, width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: firstRunTheme.lineStrong },
  errorMark: { width: 62, height: 62, borderRadius: radius.lg, backgroundColor: `${firstRunTheme.danger}18`, alignItems: 'center', justifyContent: 'center' },
  readyContent: { paddingHorizontal: gutter, maxWidth: 520, width: '100%', alignSelf: 'center' },
  readyMark: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: `${firstRunTheme.accent}18`, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  goalCard: { marginTop: 26, flexDirection: 'row', alignItems: 'center', gap: 18, backgroundColor: firstRunTheme.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: firstRunTheme.line, padding: 12 },
  goalCopy: { flex: 1, gap: 6 },
  goalTitle: { fontSize: 18, lineHeight: 24 },
  goalRule: { width: 28, height: 3, borderRadius: 2, backgroundColor: firstRunTheme.accent, marginTop: 6 },
  summaryCard: { marginTop: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: firstRunTheme.line, backgroundColor: firstRunTheme.surface, paddingHorizontal: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 17 },
  summaryDivider: { borderTopWidth: 1, borderTopColor: firstRunTheme.line },
  summaryIcon: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: `${firstRunTheme.accent}18`, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { marginTop: 3, fontSize: 16, lineHeight: 22 },
});

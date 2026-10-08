import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, useI18n } from '@/i18n';
import { BodyInfo, DurationRange, Equipment, Gender, Goal, Difficulty, OnboardingAnswers, TrainingLocation } from '@/types/domain';
import { AppLogo, BottomBar, Txt } from '@/components';
import { FirstRunBackground, PremiumBackButton, PremiumCTA, PremiumProgress, PremiumScreenHeader, firstRunTheme } from '@/components/firstRun';
import { haptics } from '@/utils/haptics';
import { useReducedMotion } from '@/utils/motion';
import { useUnitSystem } from '@/hooks/useUnits';
import { UnitSystem } from '@/utils/units';
import { AgeStep, DaysStep, DurationStep, EquipmentStep, ExperienceStep, GenderStep, GoalStep, HeightStep, LocationStep, WeightStep } from './steps';
import { gutter, Scene } from '@/theme';

type StepId = 'goal' | 'experience' | 'location' | 'days' | 'duration' | 'equipment' | 'age' | 'height' | 'weight' | 'gender';
type Metric = 'age' | 'height' | 'weight';

const premiumScene = (accent: string): Scene => ({
  accent,
  gradient: firstRunTheme.gradient,
  background: firstRunTheme.background,
  blobs: [firstRunTheme.accentAlt, firstRunTheme.accentBlue, firstRunTheme.accentCool],
});

const steps: { id: StepId; scene: Scene; optional?: boolean }[] = [
  { id: 'goal', scene: premiumScene(firstRunTheme.accentAlt) },
  { id: 'experience', scene: premiumScene(firstRunTheme.accentBlue) },
  { id: 'location', scene: premiumScene(firstRunTheme.accentCool) },
  { id: 'days', scene: premiumScene(firstRunTheme.accent) },
  { id: 'duration', scene: premiumScene(firstRunTheme.accentAlt) },
  { id: 'equipment', scene: premiumScene(firstRunTheme.accentBlue) },
  { id: 'age', scene: premiumScene(firstRunTheme.accentAlt), optional: true },
  { id: 'height', scene: premiumScene(firstRunTheme.accentCool), optional: true },
  { id: 'weight', scene: premiumScene(firstRunTheme.accentBlue), optional: true },
  { id: 'gender', scene: premiumScene(firstRunTheme.accent), optional: true },
];

interface Draft { goal?: Goal; experience?: Difficulty; environment?: TrainingLocation; daysPerWeek: number; duration?: DurationRange; equipment: Equipment[] }

/** Collects the training profile before sign-up; the caller persists it after authentication. */
export function OnboardingScreen({ onComplete, onExit }: { onComplete: (answers: OnboardingAnswers) => void; onExit?: () => void }) {
  const { dictionary } = useI18n();
  const copy = dictionary.onboarding;
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Draft>({ daysPerWeek: 3, equipment: [] });
  const [metrics, setMetrics] = useState({ age: 28, height: 170, weight: 70 });
  const preferredUnitSystem = useUnitSystem();
  const [heightUnit, setHeightUnit] = useState<UnitSystem>(() => preferredUnitSystem);
  const [weightUnit, setWeightUnit] = useState<UnitSystem>(() => preferredUnitSystem);
  const heightUnitTouched = useRef(false);
  const weightUnitTouched = useRef(false);
  const [skipped, setSkipped] = useState<Record<Metric, boolean>>({ age: false, height: false, weight: false });
  const [gender, setGender] = useState<Gender>();
  const direction = useRef(1);
  const enter = useSharedValue(1);
  const reducedMotion = useReducedMotion();
  const scroll = useRef<ScrollView>(null);

  const current = steps[step];
  const scene = current.scene;
  const last = step === steps.length - 1;

  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    enter.value = reducedMotion ? 1 : 0;
    enter.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
  }, [enter, reducedMotion, step]);

  // Respect a stored preference when it finishes loading, but never overwrite a choice made in this flow.
  useEffect(() => {
    if (!heightUnitTouched.current) setHeightUnit(preferredUnitSystem);
    if (!weightUnitTouched.current) setWeightUnit(preferredUnitSystem);
  }, [preferredUnitSystem]);

  const travel = direction.current * 12;
  const enterStyle = useAnimatedStyle(() => ({ opacity: enter.value, transform: [{ translateX: (1 - enter.value) * travel }] }));

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setProfile((p) => ({ ...p, [key]: value }));
  const toggleEquipment = (item: Equipment) => update('equipment', (profile.equipment ?? []).includes(item) ? (profile.equipment ?? []).filter((e) => e !== item) : [...(profile.equipment ?? []), item]);
  const setMetric = (key: Metric) => (value: number) => { setMetrics((m) => ({ ...m, [key]: value })); setSkipped((s) => ({ ...s, [key]: false })); };

  const canAdvance = (() => {
    switch (current.id) {
      case 'goal': return !!profile.goal;
      case 'experience': return !!profile.experience;
      case 'location': return !!profile.environment;
      case 'duration': return !!profile.duration;
      case 'equipment': return (profile.equipment ?? []).length > 0;
      case 'gender': return !!gender;
      default: return true;
    }
  })();

  const goTo = (next: number) => { direction.current = next > step ? 1 : -1; setStep(next); };
  const finish = (overrides: { gender?: Gender; skip?: Metric } = {}) => {
    const skippedNow = overrides.skip ? { ...skipped, [overrides.skip]: true } : skipped;
    const body: BodyInfo = {
      age: skippedNow.age ? undefined : metrics.age,
      heightCm: skippedNow.height ? undefined : metrics.height,
      weightKg: skippedNow.weight ? undefined : metrics.weight,
      gender: 'gender' in overrides ? overrides.gender : gender,
    };
    onComplete({ goal: profile.goal!, experience: profile.experience!, location: profile.environment!, daysPerWeek: profile.daysPerWeek, duration: profile.duration!, equipment: profile.equipment, body });
  };
  const advance = () => { if (!canAdvance) return; if (last) { haptics.success(); finish(); } else goTo(step + 1); };
  const skip = () => {
    if (current.id === 'gender') { setGender(undefined); if (last) { finish({ gender: undefined }); return; } }
    else setSkipped((s) => ({ ...s, [current.id]: true }));
    if (last) finish(current.id === 'gender' ? {} : { skip: current.id as Metric }); else goTo(step + 1);
  };

  const title = copy[current.id].title;
  const subtitle = copy[current.id].subtitle;
  const ctaLabel = current.id === 'goal' ? copy.goal.cta : current.id === 'days' ? copy.days.cta : current.id === 'gender' ? copy.gender.cta : dictionary.common.continue;

  return <View style={styles.root}>
    <StatusBar style="light" />
    <FirstRunBackground accent={scene.accent} />

    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
         {step > 0
           ? <PremiumBackButton label={dictionary.common.back} onPress={() => { haptics.tap(); goTo(step - 1); }} />
           : onExit ? <PremiumBackButton label={dictionary.common.back} onPress={() => { haptics.tap(); onExit(); }} /> : <AppLogo size={36} rounded />}
         <PremiumProgress total={steps.length} current={step} />
      </View>
      <View style={styles.metaRow}>
         <Txt variant="label" color={firstRunTheme.muted}>{format(copy.stepOf, { current: step + 1, total: steps.length })}</Txt>
         {current.optional ? <Pressable accessibilityRole="button" accessibilityLabel={dictionary.common.skip} hitSlop={10} onPress={() => { haptics.tap(); skip(); }} style={styles.skipButton}><Txt variant="label" color={firstRunTheme.muted}>{dictionary.common.skip}</Txt></Pressable> : null}
       </View>
     </View>

    <KeyboardAvoidingView style={styles.flow} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 132 }]}>
        <Animated.View style={enterStyle}>
          <PremiumScreenHeader title={title} subtitle={subtitle} />
          <View style={styles.body}>
            {current.id === 'goal' ? <GoalStep value={profile.goal} onChange={(v) => update('goal', v)} /> : null}
            {current.id === 'experience' ? <ExperienceStep value={profile.experience} onChange={(v) => update('experience', v)} /> : null}
            {current.id === 'location' ? <LocationStep value={profile.environment} onChange={(v) => update('environment', v)} accent={firstRunTheme.accentAlt} /> : null}
            {current.id === 'days' ? <DaysStep value={profile.daysPerWeek ?? 3} onChange={(v) => update('daysPerWeek', v)} scene={scene} /> : null}
            {current.id === 'duration' ? <DurationStep value={profile.duration} onChange={(v) => update('duration', v)} scene={scene} /> : null}
            {current.id === 'equipment' ? <EquipmentStep selected={profile.equipment ?? []} onToggle={toggleEquipment} scene={scene} /> : null}
            {current.id === 'age' ? <AgeStep value={metrics.age} onChange={setMetric('age')} scene={scene} /> : null}
            {current.id === 'height' ? <HeightStep value={metrics.height} onChange={setMetric('height')} system={heightUnit} onSystemChange={(unit) => { heightUnitTouched.current = true; setHeightUnit(unit); }} scene={scene} /> : null}
            {current.id === 'weight' ? <WeightStep value={metrics.weight} onChange={setMetric('weight')} system={weightUnit} onSystemChange={(unit) => { weightUnitTouched.current = true; setWeightUnit(unit); }} scene={scene} /> : null}
            {current.id === 'gender' ? <GenderStep value={gender} onChange={setGender} scene={scene} /> : null}
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>

    <BottomBar background={firstRunTheme.background}>
      <PremiumCTA label={ctaLabel} icon={last ? 'checkmark' : 'arrow-forward'} disabled={!canAdvance} onPress={advance} />
    </BottomBar>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: firstRunTheme.background },
  header: { paddingHorizontal: gutter, paddingBottom: 4, gap: 12, zIndex: 2, width: '100%', maxWidth: 520, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 },
  skipButton: { paddingVertical: 6, paddingHorizontal: 4 },
  flow: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingTop: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  body: { marginTop: 24 },
});

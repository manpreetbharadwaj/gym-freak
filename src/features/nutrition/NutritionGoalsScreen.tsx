import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CheckBadge, GlyphIcon, GradientButton, mdi, SecondaryButton, Txt } from '@/components';
import { useLabels } from '@/components/cards';
import { ProgressBar } from '@/components/dashboard';
import { ErrorState, Skeleton } from '@/components/feedback';
import { FilterChip, TextField, ToggleRow } from '@/components/inputs';
import { Card, Header, Screen, Section } from '@/components/layout';
import { format } from '@/i18n';
import { useNutrition, useNutritionHistory, useNutritionMutation } from '@/hooks/queries';
import { RootScreenProps } from '@/navigation/types';
import { DEFAULT_NUTRITION_POLICY, KCAL_PER_G, macrosFor, validateManualTarget } from '@/nutrition/engine';
import { useRepos } from '@/store/session';
import { palette, radius, scenes } from '@/theme';
import { ActivityLevel, CalcSex, NutritionSummary } from '@/types/domain';

const LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'very', 'extra'];
const MACRO_COLORS = { protein: palette.accent, carbs: palette.orange, fat: palette.yellow };

/**
 * Daily calorie and macro targets: the estimate, how it was calculated, the inputs it needs (asked, never
 * guessed), an optional manual override and the target history. Intake is shown as not tracked.
 */
export function NutritionGoalsScreen({ navigation }: RootScreenProps<'NutritionGoals'>) {
  const { dictionary } = useLabels();
  const copy = dictionary.nutrition;
  const nutrition = useNutrition();
  const n = nutrition.data;
  return <Screen scene={scenes.violet} header={<Header title={copy.title} onBack={() => navigation.goBack()} />} refreshing={nutrition.isRefetching} onRefresh={() => nutrition.refetch()}>
    {nutrition.isLoading ? <View style={{ gap: 12, marginTop: 8 }}><Skeleton height={140} round={radius.lg} /><Skeleton height={120} round={radius.lg} /></View>
      : !n ? <ErrorState error={nutrition.error} onRetry={() => nutrition.refetch()} />
      : <>
        {nutrition.isError ? <Txt variant="small" color={palette.inkMuted} style={{ marginBottom: 8 }}>{copy.offline}</Txt> : null}
        <TargetHero n={n} />
        {n.status === 'needs_input' ? <MissingCard n={n} onProfile={() => navigation.navigate('Profile')} /> : null}
        {n.status === 'not_applicable' ? <Card style={{ marginTop: 14 }}><Txt variant="body" color={palette.inkSoft}>{n.reason === 'under_18' ? copy.under18 : copy.outOfRange}</Txt></Card> : null}
        {n.target ? <MacroCard n={n} /> : null}
        <Card style={{ marginTop: 14 }}>
          <View style={styles.row}><GlyphIcon glyph={mdi('food-apple')} size={20} color={palette.inkMuted} /><Txt variant="h3">{copy.intakeTitle}</Txt></View>
          <Txt variant="small" color={palette.inkMuted} style={{ marginTop: 6 }}>{copy.intakeBody}</Txt>
        </Card>
        {n.estimate ? <HowCalculated n={n} /> : null}
        <InputsSection n={n} />
        <OverrideSection n={n} />
        <HistorySection />
        <Txt variant="small" color={palette.inkFaint} style={{ marginTop: 20 }}>{copy.estimateNote}</Txt>
      </>}
  </Screen>;
}

function TargetHero({ n }: { n: NutritionSummary }) {
  const { dictionary } = useLabels();
  const copy = dictionary.nutrition;
  const t = n.target;
  return <Card style={{ marginTop: 8 }}>
    <View style={styles.between}>
      <Txt variant="overline" color={palette.inkMuted}>{copy.target.toUpperCase()}</Txt>
      {t ? <View style={[styles.badge, t.source === 'MANUAL' && { borderColor: palette.orange }]}><Txt variant="tab" color={t.source === 'MANUAL' ? palette.orange : palette.accentSoft}>{(t.source === 'MANUAL' ? copy.manual : copy.automatic).toUpperCase()}</Txt></View> : null}
    </View>
    {t ? <>
      <View style={styles.heroValue}><Txt variant="number">{t.calories.toLocaleString()}</Txt><Txt variant="title" color={palette.inkMuted}>{copy.kcal}</Txt></View>
      <Txt variant="small" color={palette.inkMuted}>{copy.intakeNotTracked} · {format(copy.since, { date: new Date(t.since).toLocaleDateString() })}</Txt>
    </> : <Txt variant="title" style={{ marginTop: 8 }}>{n.status === 'needs_input' ? copy.missingTitle : copy.notApplicable}</Txt>}
  </Card>;
}

function MissingCard({ n, onProfile }: { n: NutritionSummary; onProfile: () => void }) {
  const { dictionary } = useLabels();
  const copy = dictionary.nutrition;
  const needsProfile = (n.missing ?? []).some((m) => m === 'weight' || m === 'height' || m === 'age');
  return <Card style={{ marginTop: 14 }}>
    <Txt variant="body" color={palette.inkSoft}>{copy.missingBody}</Txt>
    <View style={{ gap: 8, marginTop: 12 }}>{(n.missing ?? []).map((m) => <View key={m} style={styles.row}><GlyphIcon glyph={mdi('alert-circle-outline')} size={16} color={palette.orange} /><Txt variant="label">{copy.missing[m]}</Txt></View>)}</View>
    {needsProfile ? <SecondaryButton label={copy.editProfile} icon="chevron-right" onPress={onProfile} style={{ marginTop: 14 }} /> : null}
  </Card>;
}

function MacroCard({ n }: { n: NutritionSummary }) {
  const { dictionary } = useLabels();
  const copy = dictionary.nutrition;
  const t = n.target!;
  const rows = [
    { key: 'protein', label: copy.protein, g: t.proteinG, kcal: t.proteinG * KCAL_PER_G.protein, color: MACRO_COLORS.protein },
    { key: 'carbs', label: copy.carbs, g: t.carbsG, kcal: t.carbsG * KCAL_PER_G.carbs, color: MACRO_COLORS.carbs },
    { key: 'fat', label: copy.fat, g: t.fatG, kcal: t.fatG * KCAL_PER_G.fat, color: MACRO_COLORS.fat },
  ];
  return <Section title={copy.macroSplit}>
    <Card>
      <View style={{ gap: 14 }}>{rows.map((r) => <View key={r.key} accessible accessibilityLabel={`${r.label} ${r.g} ${copy.g}, ${r.kcal} ${copy.kcal}`}>
        <View style={styles.between}>
          <Txt variant="h3">{r.label}</Txt>
          <Txt variant="h3" style={{ fontVariant: ['tabular-nums'] }}>{r.g} {copy.g} <Txt variant="small" color={palette.inkMuted}>· {r.kcal} {copy.kcal}</Txt></Txt>
        </View>
        <View style={{ marginTop: 6 }}><ProgressBar progress={t.macroKcal ? r.kcal / t.macroKcal : 0} color={r.color} height={6} /></View>
      </View>)}</View>
      <Txt variant="label" color={palette.inkFaint} style={{ marginTop: 12 }}>{format(copy.macroKcal, { count: t.macroKcal.toLocaleString() })}</Txt>
      {n.estimate?.medicalCaution ? <Txt variant="small" color={palette.orange} style={{ marginTop: 8 }}>{copy.cautionNote}</Txt> : null}
    </Card>
  </Section>;
}

function HowCalculated({ n }: { n: NutritionSummary }) {
  const { dictionary } = useLabels();
  const copy = dictionary.nutrition;
  const e = n.estimate!;
  const line = (label: string, value: string) => <View style={styles.between}><Txt variant="body" color={palette.inkSoft}>{label}</Txt><Txt variant="h3" style={{ fontVariant: ['tabular-nums'] }}>{value}</Txt></View>;
  return <Section title={copy.howCalculated}>
    <Card>
      <View style={{ gap: 10 }}>
        {line(copy.bmr, `${e.bmr.toLocaleString()} ${copy.kcal}`)}
        {line(copy.tdee, `${e.tdee.toLocaleString()} ${copy.kcal}`)}
        {line(copy.adjustment, e.adjustmentKcal ? `${e.adjustmentKcal > 0 ? '+' : '−'}${Math.abs(e.adjustmentKcal).toLocaleString()} ${copy.kcal}` : copy.maintenance)}
        {line(copy.protein, format(copy.proteinPerKg, { value: e.proteinGPerKg }))}
      </View>
      {n.inputs.weightKg && e.proteinBasisKg < n.inputs.weightKg - 0.5 ? <Txt variant="small" color={palette.inkMuted} style={{ marginTop: 8 }}>{format(copy.basisAdjusted, { kg: e.proteinBasisKg })}</Txt> : null}
    </Card>
  </Section>;
}

function InputsSection({ n }: { n: NutritionSummary }) {
  const { gym } = useRepos();
  const { dictionary } = useLabels();
  const copy = dictionary.nutrition;
  const save = useNutritionMutation((input: { calculationSex?: CalcSex | null; activityLevel?: ActivityLevel | null; medicalCaution?: boolean }) => gym.setNutritionInputs(input));
  return <Section title={copy.inputs}>
    <Card>
      <Txt variant="h3">{copy.sex}</Txt>
      <Txt variant="small" color={palette.inkMuted} style={{ marginTop: 4 }}>{copy.sexBody}</Txt>
      <View style={[styles.row, { marginTop: 10 }]}>{(['male', 'female'] as const).map((s) => <FilterChip key={s} label={copy[s]} active={n.inputs.sex === s} color={palette.accent} onPress={() => save.mutate({ calculationSex: s })} />)}</View>
    </Card>
    <Card style={{ marginTop: 12 }}>
      <Txt variant="h3">{copy.activity}</Txt>
      <Txt variant="small" color={palette.inkMuted} style={{ marginTop: 4 }}>{copy.activityBody}</Txt>
      <View style={{ marginTop: 10, gap: 8 }}>{LEVELS.map((l) => {
        const selected = n.inputs.activityLevel === l;
        return <Pressable key={l} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => save.mutate({ activityLevel: l })} style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && { opacity: 0.85 }]}>
          <View style={{ flex: 1 }}><Txt variant="row">{copy.activityLevels[l]}</Txt><Txt variant="small" color={palette.inkMuted}>{copy.activityHelp[l]}</Txt></View>
          <CheckBadge visible={selected} color={palette.accent} size={20} ring dark />
        </Pressable>;
      })}</View>
    </Card>
    <Card padded={false} style={{ marginTop: 12, paddingVertical: 4 }}>
      <ToggleRow title={copy.caution} subtitle={copy.cautionBody} glyph={mdi('heart-plus-outline')} color={palette.orange} value={n.inputs.medicalCaution} onChange={(v) => save.mutate({ medicalCaution: v })} />
    </Card>
  </Section>;
}

function OverrideSection({ n }: { n: NutritionSummary }) {
  const { gym } = useRepos();
  const { dictionary } = useLabels();
  const copy = dictionary.nutrition;
  const [calories, setCalories] = useState(n.target ? String(n.target.calories) : '');
  const [protein, setProtein] = useState(n.target ? String(n.target.proteinG) : '');
  const [errors, setErrors] = useState<string[]>([]);
  const save = useNutritionMutation((input: { calories: number; proteinG: number }) => gym.setNutritionOverride(input));
  const auto = useNutritionMutation((_: void) => gym.clearNutritionOverride());
  const kcal = Number(calories), p = Number(protein);
  // Preview with the bundled policy; the server applies the active policy and returns the stored values.
  const preview = Number.isInteger(kcal) && Number.isInteger(p) && kcal > 0 && p > 0 ? macrosFor(kcal, p, n.inputs.weightKg ?? 70, DEFAULT_NUTRITION_POLICY) : null;
  const submit = () => {
    const found = validateManualTarget(kcal, p, n.inputs.weightKg, DEFAULT_NUTRITION_POLICY);
    setErrors(found);
    if (!found.length) save.mutate({ calories: kcal, proteinG: p }, { onError: (e) => setErrors([e instanceof Error ? e.message : copy.invalid]) });
  };
  return <Section title={copy.override}>
    <Card>
      <Txt variant="small" color={palette.inkMuted}>{copy.overrideBody}</Txt>
      <View style={[styles.row, { marginTop: 12, alignItems: 'flex-start' }]}>
        <View style={{ flex: 1 }}><TextField label={copy.calories} value={calories} onChangeText={setCalories} keyboardType="number-pad" maxLength={4} /></View>
        <View style={{ flex: 1 }}><TextField label={copy.proteinG} value={protein} onChangeText={setProtein} keyboardType="number-pad" maxLength={3} /></View>
      </View>
      {preview ? <Txt variant="label" color={palette.inkMuted} style={{ marginTop: 10 }}>{copy.carbs} {preview.carbsG} {copy.g} · {copy.fat} {preview.fatG} {copy.g}</Txt> : null}
      {errors.length ? <Txt variant="small" color={palette.danger} style={{ marginTop: 8 }}>{errors.join(' ')}</Txt> : null}
      <GradientButton label={copy.save} icon="checkmark" loading={save.isPending} onPress={submit} style={{ marginTop: 14 }} />
      {n.target?.source === 'MANUAL' ? <SecondaryButton label={copy.backToAuto} icon="refresh" loading={auto.isPending} onPress={() => auto.mutate(undefined)} style={{ marginTop: 10 }} /> : null}
    </Card>
  </Section>;
}

function HistorySection() {
  const { dictionary } = useLabels();
  const copy = dictionary.nutrition;
  const history = useNutritionHistory();
  const items = (history.data ?? []).slice(0, 10);
  if (!items.length) return null;
  return <Section title={copy.history}>
    <Card>
      <View style={{ gap: 10 }}>{items.map((h) => <View key={h.id} style={styles.between}>
        <View><Txt variant="row" style={{ fontVariant: ['tabular-nums'] }}>{h.calories.toLocaleString()} {copy.kcal}</Txt><Txt variant="small" color={palette.inkMuted}>{new Date(h.createdAt).toLocaleDateString()} · {h.source === 'MANUAL' ? copy.manual : copy.automatic}</Txt></View>
        <Txt variant="label" color={palette.inkMuted} style={{ fontVariant: ['tabular-nums'] }}>P {h.proteinG} · C {h.carbsG} · F {h.fatG}</Txt>
      </View>)}</View>
    </Card>
  </Section>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroValue: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 },
  badge: { borderWidth: 1, borderColor: palette.accent, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line, backgroundColor: palette.surfaceRaised },
  optionSelected: { borderColor: palette.accent, backgroundColor: 'rgba(34,184,245,0.10)' },
});

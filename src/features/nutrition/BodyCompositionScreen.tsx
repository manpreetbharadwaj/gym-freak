import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { GlyphIcon, GradientButton, mdi, SecondaryButton, Txt } from '@/components';
import { useLabels } from '@/components/cards';
import { ErrorState, Skeleton } from '@/components/feedback';
import { BottomSheet, LinkRow, TextField } from '@/components/inputs';
import { Card, Header, Screen, Section } from '@/components/layout';
import { format } from '@/i18n';
import { useBodyFat, useBodyFatMutation, useNutrition } from '@/hooks/queries';
import { useUnitSystem } from '@/hooks/useUnits';
import { RootScreenProps } from '@/navigation/types';
import { BODY_FAT_RANGE, navyBodyFat } from '@/nutrition/engine';
import { healthAdapter } from '@/services/health';
import { useRepos } from '@/store/session';
import { palette, radius, scenes } from '@/theme';
import { BodyFatMeasurement } from '@/types/domain';
import { CM_PER_INCH } from '@/utils/units';
import { dateInput } from '@/utils/dates';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Profile → Body composition. Optional: nothing is shown until the user records a measurement. Manual entries are
 * measured values; the Navy method is labelled an estimate; health-app readings carry their source.
 */
export function BodyCompositionScreen({ navigation }: RootScreenProps<'BodyComposition'>) {
  const { dictionary } = useLabels();
  const copy = dictionary.bodyComp;
  const bodyFat = useBodyFat();
  const [sheet, setSheet] = useState<'manual' | 'navy' | null>(null);
  const [editing, setEditing] = useState<BodyFatMeasurement | null>(null);
  const data = bodyFat.data;
  return <Screen scene={scenes.violet} header={<Header title={copy.title} onBack={() => navigation.goBack()} />} refreshing={bodyFat.isRefetching} onRefresh={() => bodyFat.refetch()}>
    {bodyFat.isLoading ? <View style={{ gap: 12, marginTop: 8 }}><Skeleton height={130} round={radius.lg} /><Skeleton height={160} round={radius.lg} /></View>
      : !data ? <ErrorState error={bodyFat.error} onRetry={() => bodyFat.refetch()} />
      : !data.enabled ? <Card style={{ marginTop: 8 }}><Txt variant="body" color={palette.inkSoft}>{copy.disabled}</Txt></Card>
      : <>
        <LatestCard latest={data.latest} />
        {data.items.length >= 2 ? <Section title={copy.trend}><Card><TrendChart items={data.items} /></Card></Section> : null}
        <Section title={copy.add}>
          <Card padded={false} style={{ paddingVertical: 4 }}>
            <LinkRow title={copy.addManual} glyph={mdi('pencil-outline')} color={palette.accent} onPress={() => setSheet('manual')} />
            <LinkRow title={copy.addNavy} glyph={mdi('ruler')} color={palette.orange} onPress={() => setSheet('navy')} />
            {data.healthImport ? <HealthImportRow /> : null}
          </Card>
        </Section>
        <Section title={copy.history}>
          {!data.items.length ? <Txt variant="small" color={palette.inkMuted}>{copy.empty}</Txt> : <Card padded={false}>
            {data.items.map((m, i) => <Pressable key={m.id} onPress={() => setEditing(m)} accessibilityRole="button" accessibilityLabel={`${m.percent}% ${new Date(m.measuredAt).toLocaleDateString()} ${copy.methods[m.method]}`}
              style={({ pressed }) => [styles.historyRow, i > 0 && styles.divider, pressed && { opacity: 0.8 }]}>
              <View style={{ flex: 1 }}>
                <Txt variant="row" style={{ fontVariant: ['tabular-nums'] }}>{m.percent.toFixed(1)} %</Txt>
                <Txt variant="small" color={palette.inkMuted}>{new Date(m.measuredAt).toLocaleDateString()}{m.source ? ` · ${m.source}` : ''}</Txt>
              </View>
              <MethodBadge m={m} />
            </Pressable>)}
          </Card>}
        </Section>
        <Txt variant="small" color={palette.inkFaint} style={{ marginTop: 18 }}>{copy.navyNote}</Txt>
      </>}
    <ManualSheet visible={sheet === 'manual' || (!!editing && editing.method !== 'HEALTH')} editing={editing} onClose={() => { setSheet(null); setEditing(null); }} />
    <NavySheet visible={sheet === 'navy'} onClose={() => setSheet(null)} onNeedSex={() => { setSheet(null); navigation.navigate('NutritionGoals'); }} />
    <ImportedSheet item={editing?.method === 'HEALTH' ? editing : null} onClose={() => setEditing(null)} />
  </Screen>;
}

function MethodBadge({ m }: { m: BodyFatMeasurement }) {
  const { dictionary } = useLabels();
  const copy = dictionary.bodyComp;
  const color = m.estimated ? palette.orange : palette.accent;
  return <View style={[styles.badge, { borderColor: color }]}><Txt variant="tab" color={color}>{(m.estimated ? copy.estimated : copy.measured).toUpperCase()} · {copy.methods[m.method]}</Txt></View>;
}

function LatestCard({ latest }: { latest: BodyFatMeasurement | null }) {
  const { dictionary } = useLabels();
  const copy = dictionary.bodyComp;
  return <Card style={{ marginTop: 8 }}>
    <Txt variant="overline" color={palette.inkMuted}>{copy.latest.toUpperCase()}</Txt>
    {latest ? <>
      <View style={styles.heroValue}><Txt variant="number">{latest.percent.toFixed(1)}</Txt><Txt variant="title" color={palette.inkMuted}>%</Txt></View>
      <View style={[styles.row, { marginTop: 4 }]}><Txt variant="small" color={palette.inkMuted}>{new Date(latest.measuredAt).toLocaleDateString()}</Txt><MethodBadge m={latest} /></View>
    </> : <Txt variant="title" style={{ marginTop: 8 }}>{copy.notMeasured}</Txt>}
  </Card>;
}

/** Oldest → newest line; estimates are hollow points so measured and estimated values stay distinguishable. */
function TrendChart({ items }: { items: BodyFatMeasurement[] }) {
  const [width, setWidth] = useState(0);
  const height = 120, pad = 10;
  const points = [...items].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const values = points.map((p) => p.percent);
  const min = Math.floor(Math.min(...values) - 1), max = Math.ceil(Math.max(...values) + 1);
  const t0 = new Date(points[0].measuredAt).getTime(), t1 = new Date(points[points.length - 1].measuredAt).getTime();
  const x = (p: BodyFatMeasurement) => pad + (t1 === t0 ? 0.5 : (new Date(p.measuredAt).getTime() - t0) / (t1 - t0)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (height - pad * 2);
  return <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessible accessibilityLabel={points.map((p) => `${p.percent}%`).join(', ')}>
    <View style={styles.between}><Txt variant="label" color={palette.inkFaint}>{max} %</Txt></View>
    {width ? <Svg width={width} height={height}>
      <Line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} stroke={palette.line} strokeWidth={1} />
      <Polyline points={points.map((p) => `${x(p)},${y(p.percent)}`).join(' ')} fill="none" stroke={palette.accent} strokeWidth={2} strokeLinejoin="round" />
      {points.map((p) => <Circle key={p.id} cx={x(p)} cy={y(p.percent)} r={4} stroke={p.estimated ? palette.orange : palette.accent} strokeWidth={2} fill={p.estimated ? palette.surface : palette.accent} />)}
    </Svg> : <View style={{ height }} />}
    <Txt variant="label" color={palette.inkFaint}>{min} %</Txt>
  </View>;
}

function HealthImportRow() {
  const { gym } = useRepos();
  const { dictionary } = useLabels();
  const copy = dictionary.bodyComp;
  const adapter = healthAdapter();
  const name = adapter?.provider === 'APPLE_HEALTH' ? 'Apple Health' : 'Health Connect';
  const [available, setAvailable] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { adapter?.availability().then((a) => setAvailable(a === 'available')).catch(() => setAvailable(false)); }, [adapter]);
  const run = useBodyFatMutation(async (_: void) => {
    if (!adapter) throw new Error('unavailable');
    await adapter.bodyFat.connect();
    const readings = await adapter.bodyFat.read(new Date(Date.now() - 2 * 365 * 86_400_000));
    return readings.length ? gym.importBodyFat(adapter.provider, readings) : { imported: 0, skipped: 0, invalid: 0 };
  });
  if (!adapter || available === false) return <View style={styles.unavailable}><GlyphIcon glyph={mdi('heart-pulse')} size={20} color={palette.inkFaint} /><Txt variant="small" color={palette.inkMuted} style={{ flex: 1 }}>{format(copy.healthUnavailable, { provider: adapter ? name : 'Health' })}</Txt></View>;
  return <>
    <LinkRow title={format(copy.importHealth, { provider: name })} value={run.isPending ? '…' : undefined} glyph={mdi('heart-pulse')} color={palette.coral}
      onPress={() => run.mutate(undefined, { onSuccess: (r) => setMessage((r as { imported: number }).imported ? format(copy.importDone, { count: (r as { imported: number }).imported }) : copy.importNone), onError: () => setMessage(format(copy.healthUnavailable, { provider: name })) })} />
    {message ? <Txt variant="small" color={palette.inkMuted} style={{ paddingHorizontal: 16, paddingBottom: 10 }}>{message}</Txt> : null}
  </>;
}

function ManualSheet({ visible, editing, onClose }: { visible: boolean; editing: BodyFatMeasurement | null; onClose: () => void }) {
  const { gym } = useRepos();
  const { dictionary } = useLabels();
  const copy = dictionary.bodyComp;
  const [percent, setPercent] = useState('');
  const [date, setDate] = useState(today());
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!visible) return;
    setPercent(editing ? String(editing.percent) : ''); setDate(editing ? editing.measuredAt.slice(0, 10) : today()); setSource(editing?.source ?? ''); setNotes(editing?.notes ?? ''); setError(null);
  }, [editing, visible]);
  const save = useBodyFatMutation((input: { percent: number; measuredAt: string; source: string | null; notes: string | null }) => (editing ? gym.updateBodyFat(editing.id, editing.method === 'NAVY' ? { measuredAt: input.measuredAt, notes: input.notes } : input) : gym.addBodyFat(input)));
  const remove = useBodyFatMutation((id: string) => gym.deleteBodyFat(id));
  const navy = editing?.method === 'NAVY';
  const submit = () => {
    const value = Number(percent.replace(',', '.'));
    const when = dateInput(date);
    if (!navy && !(value >= BODY_FAT_RANGE.min && value <= BODY_FAT_RANGE.max)) return setError(`${copy.percent}: ${BODY_FAT_RANGE.min}–${BODY_FAT_RANGE.max}`);
    if (!when) return setError(`${copy.date}: YYYY-MM-DD`);
    save.mutate({ percent: Math.round(value * 10) / 10, measuredAt: when, source: source.trim() || null, notes: notes.trim() || null }, { onSuccess: onClose, onError: () => setError(dictionary.nutrition.invalid) });
  };
  return <BottomSheet visible={visible} onClose={onClose} title={editing ? copy.entry : copy.addManual} footer={<View style={{ gap: 10 }}>
    <GradientButton label={copy.save} icon="checkmark" loading={save.isPending} onPress={submit} />
    {editing ? <SecondaryButton label={copy.delete} icon="trash-can-outline" color={palette.danger} loading={remove.isPending} onPress={() => remove.mutate(editing.id, { onSuccess: onClose })} /> : null}
  </View>}>
    {navy ? <Txt variant="h3">{copy.estimate}: {editing!.percent.toFixed(1)} %</Txt> : <TextField label={copy.percent} value={percent} onChangeText={setPercent} keyboardType="decimal-pad" maxLength={4} />}
    <TextField label={`${copy.date} (YYYY-MM-DD)`} value={date} onChangeText={setDate} maxLength={10} autoCapitalize="none" />
    {!navy ? <TextField label={copy.source} value={source} onChangeText={setSource} maxLength={120} placeholder={copy.addManualBody} /> : null}
    <TextField label={copy.notes} value={notes} onChangeText={setNotes} maxLength={500} />
    {error ? <Txt variant="small" color={palette.danger}>{error}</Txt> : null}
  </BottomSheet>;
}

/** U.S. Navy estimate: live preview with the shared engine; the server recomputes and stores it. */
function NavySheet({ visible, onClose, onNeedSex }: { visible: boolean; onClose: () => void; onNeedSex: () => void }) {
  const { gym } = useRepos();
  const { dictionary } = useLabels();
  const copy = dictionary.bodyComp;
  const nutrition = useNutrition();
  const system = useUnitSystem();
  const unit = system === 'imperial' ? 'in' : 'cm';
  const sex = nutrition.data?.inputs.sex ?? null;
  const profileHeight = nutrition.data?.inputs.heightCm ?? null;
  const [values, setValues] = useState({ height: '', neck: '', waist: '', hip: '' });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (visible) { setValues({ height: profileHeight ? String(system === 'imperial' ? Math.round(profileHeight / CM_PER_INCH * 10) / 10 : profileHeight) : '', neck: '', waist: '', hip: '' }); setError(null); }
  }, [profileHeight, system, visible]);
  const cm = (v: string) => { const n = Number(v.replace(',', '.')); return n > 0 ? (system === 'imperial' ? n * CM_PER_INCH : n) : NaN; };
  const preview = sex ? navyBodyFat({ sex, heightCm: cm(values.height), neckCm: cm(values.neck), waistCm: cm(values.waist), hipCm: sex === 'female' ? cm(values.hip) : null }) : null;
  const save = useBodyFatMutation((input: { heightCm: number; neckCm: number; waistCm: number; hipCm?: number; measuredAt: string }) => gym.addBodyFatNavy(input));
  const set = (key: keyof typeof values) => (v: string) => setValues((s) => ({ ...s, [key]: v }));
  return <BottomSheet visible={visible} onClose={onClose} title={copy.addNavy} footer={sex
    ? <GradientButton label={copy.save} icon="checkmark" disabled={!preview || 'error' in preview} loading={save.isPending} onPress={() => save.mutate({ heightCm: cm(values.height), neckCm: cm(values.neck), waistCm: cm(values.waist), ...(sex === 'female' ? { hipCm: cm(values.hip) } : {}), measuredAt: new Date().toISOString() }, { onSuccess: onClose, onError: () => setError(dictionary.nutrition.invalid) })} />
    : <SecondaryButton label={dictionary.nutrition.title} icon="chevron-right" onPress={onNeedSex} />}>
    <Txt variant="small" color={palette.inkMuted}>{copy.addNavyBody}</Txt>
    {!sex ? <Txt variant="body" color={palette.inkSoft}>{copy.needSex}</Txt> : <>
      <TextField label={`${copy.height} (${unit})`} value={values.height} onChangeText={set('height')} keyboardType="decimal-pad" maxLength={5} />
      <TextField label={`${copy.neck} (${unit})`} value={values.neck} onChangeText={set('neck')} keyboardType="decimal-pad" maxLength={5} />
      <Txt variant="small" color={palette.inkMuted}>{copy.neckHow}</Txt>
      <TextField label={`${copy.waist} (${unit})`} value={values.waist} onChangeText={set('waist')} keyboardType="decimal-pad" maxLength={5} />
      <Txt variant="small" color={palette.inkMuted}>{sex === 'male' ? copy.waistHowMale : copy.waistHowFemale}</Txt>
      {sex === 'female' ? <><TextField label={`${copy.hip} (${unit})`} value={values.hip} onChangeText={set('hip')} keyboardType="decimal-pad" maxLength={5} /><Txt variant="small" color={palette.inkMuted}>{copy.hipHow}</Txt></> : null}
      {preview && 'percent' in preview ? <Card><Txt variant="label" color={palette.inkMuted}>{copy.estimate.toUpperCase()}</Txt><Txt variant="metricLg">{preview.percent.toFixed(1)} %</Txt></Card> : null}
      <Txt variant="small" color={palette.inkFaint}>{copy.navyNote}</Txt>
      {error ? <Txt variant="small" color={palette.danger}>{error}</Txt> : null}
    </>}
  </BottomSheet>;
}

function ImportedSheet({ item, onClose }: { item: BodyFatMeasurement | null; onClose: () => void }) {
  const { gym } = useRepos();
  const { dictionary } = useLabels();
  const copy = dictionary.bodyComp;
  const remove = useBodyFatMutation((id: string) => gym.deleteBodyFat(id));
  return <BottomSheet visible={!!item} onClose={onClose} title={copy.entry} footer={item ? <SecondaryButton label={copy.delete} icon="trash-can-outline" color={palette.danger} loading={remove.isPending} onPress={() => remove.mutate(item.id, { onSuccess: onClose })} /> : undefined}>
    {item ? <>
      <Txt variant="metricLg">{item.percent.toFixed(1)} %</Txt>
      <Txt variant="small" color={palette.inkMuted}>{new Date(item.measuredAt).toLocaleString()}{item.source ? ` · ${item.source}` : ''}</Txt>
      <Txt variant="small" color={palette.inkFaint}>{copy.importedNote}</Txt>
    </> : null}
  </BottomSheet>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  heroValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6 },
  badge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: palette.line },
  unavailable: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
});

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { GlyphIcon, GradientButton, mdi, SecondaryButton, Txt } from '@/components';
import { Card, Screen, Section } from '@/components/layout';
import { format, useI18n } from '@/i18n';
import { useInvalidateActivities } from '@/hooks/queries';
import { RootScreenProps } from '@/navigation/types';
import { healthAdapter } from '@/services/health';
import { healthSync } from '@/services/health/sync';
import { useActivitySettings } from '@/services/storage/activitySettings';
import { useRepos } from '@/store/session';
import { palette, radius, scenes, shadow } from '@/theme';
import { clock, distanceUnit, distanceValue, formatElevation, paceSecPerKm, paceUnit, paceValue } from '@/utils/units';
import { ACTIVITY_TYPES, isGpsActivity } from './activityTypes';
import { MetricBlock, RouteMap, SplitsList } from './components';
import { tracker, useActiveSession } from './tracker';

/** ACTIVITY COMPLETE → Save (backend is the source of history) or Discard. Nothing is lost if saving fails. */
export function ActivitySummaryScreen({ navigation }: RootScreenProps<'ActivitySummary'>) {
  const { dictionary, language } = useI18n();
  const copy = dictionary.activity;
  const session = useActiveSession();
  const { gym } = useRepos();
  const settings = useActivitySettings();
  const invalidate = useInvalidateActivities();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payload = useMemo(() => (session ? tracker.payload(session) : null), [session]);

  useEffect(() => { if (!session && !saving) navigation.goBack(); }, [session, saving, navigation]);
  if (!session || !payload) return null;

  const t = session.tracker;
  const gps = isGpsActivity(t.type);
  const system = session.meta.unitSystem;
  const info = ACTIVITY_TYPES[t.type];
  const avg = gps ? paceSecPerKm(payload.distanceMeters ?? 0, payload.activeDurationMs) : null;
  const started = new Date(payload.startedAt);
  const adapter = healthAdapter();

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const saved = await gym.saveActivity(payload);
      const wrote = await healthSync.writeBack(gym, saved, settings.saveToHealth);
      await tracker.clear();
      await invalidate();
      navigation.replace('ActivityDetail', { activityId: saved.id });
      if (wrote && adapter) setTimeout(() => Alert.alert(format(copy.savedHealth, { provider: dictionary.health[adapter.provider] })), 400);
    } catch {
      setError(copy.saveFailed);
      setSaving(false);
    }
  };

  const discard = () => Alert.alert(copy.discardTitle, copy.discardBody, [
    { text: dictionary.common.cancel, style: 'cancel' },
    { text: copy.discard, style: 'destructive', onPress: async () => { await tracker.discard(); navigation.goBack(); } },
  ]);

  return <Screen scene={scenes.violet}>
    <Animated.View entering={FadeInDown.duration(260).reduceMotion(ReduceMotion.System)} style={styles.head}>
      <View style={[styles.check, { backgroundColor: info.color }, shadow(info.color, 1.2)]}><GlyphIcon glyph={mdi('check-bold')} size={30} color={palette.white} /></View>
      <Txt variant="overline" color={info.color} testID="summary-title">{copy.complete}</Txt>
      <Txt variant="title">{copy.typeLong[t.type]}</Txt>
      <Txt variant="small" color={palette.inkMuted}>{started.toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' })} · {started.toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' })}</Txt>
    </Animated.View>

    <Card style={styles.stats}>
      {gps ? <MetricBlock big label={copy.distance} value={distanceValue(payload.distanceMeters ?? 0, system)} unit={distanceUnit(system)} align="center" testID="summary-distance" /> : null}
      <View style={styles.row}>
        <MetricBlock label={copy.duration} value={clock(payload.activeDurationMs / 1000, true)} testID="summary-duration" />
        {gps ? <MetricBlock label={copy.avgPace} value={paceValue(avg, system)} unit={paceUnit(system)} testID="summary-pace" /> : null}
      </View>
      <View style={styles.row}>
        <MetricBlock label={copy.estCalories} value={String(payload.calories ?? 0)} unit="kcal" testID="summary-calories" />
        {payload.elevationGainM ? <MetricBlock label={copy.elevation} value={formatElevation(payload.elevationGainM, system)} /> : <View style={{ flex: 1 }} />}
      </View>
      <Txt variant="tab" color={palette.inkMuted}>{copy.caloriesNote}</Txt>
    </Card>

    {gps ? <Section title={copy.route}>{payload.route.length > 1 ? <RouteMap route={payload.route} height={220} testID="summary-map" /> : <Card><Txt variant="small" color={palette.inkMuted}>{copy.noRoute}</Txt></Card>}</Section> : null}
    {gps && payload.splits.some((s) => s.unit === (system === 'imperial' ? 'mi' : 'km')) ? <Section title={copy.splits}><Card><SplitsList splits={payload.splits} system={system} /></Card></Section> : null}

    {error ? <Card style={styles.error}><GlyphIcon glyph={mdi('cloud-alert-outline')} size={20} color={palette.orange} /><Txt variant="small" color={palette.orange} style={{ flex: 1 }}>{error}</Txt></Card> : null}
    <View style={{ gap: 12, marginTop: 20 }}>
      <GradientButton testID="summary-save" label={error ? copy.retry : copy.save} icon="content-save-outline" loading={saving} onPress={save} />
      <SecondaryButton testID="summary-discard" label={copy.discard} color={palette.danger} disabled={saving} onPress={discard} />
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 16 },
  check: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  stats: { gap: 16, padding: 18 },
  row: { flexDirection: 'row', gap: 12 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, backgroundColor: 'rgba(255,209,102,0.12)', borderRadius: radius.lg },
});

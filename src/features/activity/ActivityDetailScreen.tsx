import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlyphIcon, mdi, Txt } from '@/components';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Header, IconCircle, Screen, Section } from '@/components/layout';
import { format, useI18n } from '@/i18n';
import { useActivity, useInvalidateActivities, useReferral } from '@/hooks/queries';
import { useUnitSystem } from '@/hooks/useUnits';
import { RootScreenProps } from '@/navigation/types';
import { useRepos } from '@/store/session';
import { palette, radius } from '@/theme';
import { clock, distanceUnit, distanceValue, formatElevation, paceUnit, paceValue } from '@/utils/units';
import { ACTIVITY_TYPES } from './activityTypes';
import { ActivityIcon, MetricBlock, RouteMap, SourceBadge, SplitsList } from './components';
import { timeOfDay } from './summary';
import { activityTheme } from './theme/activityGlassTheme';
import { GlassCard } from './theme/Glass';
import { useDialog } from '@/components/dialogs/DialogProvider';
import { ShareComposer } from '@/features/sharing';

export function ActivityDetailScreen({ navigation, route }: RootScreenProps<'ActivityDetail'>) {
  const dialog = useDialog();
  const { dictionary, language } = useI18n();
  const copy = dictionary.activity;
  const system = useUnitSystem();
  const { gym } = useRepos();
  const invalidate = useInvalidateActivities();
  const query = useActivity(route.params.activityId);
  const referral = useReferral();
  const [sharing, setSharing] = useState(false);
  const a = query.data;

  const remove = async () => { if (await dialog.showDestructiveConfirm({ title: copy.deleteTitle, description: copy.deleteBody, cancelLabel: dictionary.common.cancel, confirmLabel: copy.delete, onConfirm: async () => { await gym.deleteActivity(route.params.activityId); await invalidate(); } })) navigation.goBack(); };

  const title = a ? format(copy[timeOfDay(a.startedAt)], { type: copy.types[a.type] }) : copy.details;
  const shareCard = a ? {
    kind: 'activity' as const, contentId: a.id, title: copy.typeLong[a.type], eyebrow: dictionary.socialShare.activityEyebrow,
    date: new Date(a.startedAt).toLocaleDateString(language, { dateStyle: 'medium' }), statement: dictionary.socialShare.keepMoving,
    metrics: [
      ...(a.distanceMeters == null ? [] : [{ id: 'distance', label: copy.distance, value: `${distanceValue(a.distanceMeters, system)} ${distanceUnit(system)}` }]),
      { id: 'duration', label: copy.duration, value: clock(a.activeDurationMs / 1000, true) },
      ...(a.avgPaceSecPerKm == null ? [] : [{ id: 'pace', label: copy.avgPace, value: `${paceValue(a.avgPaceSecPerKm, system)} ${paceUnit(system)}` }]),
      ...(a.calories == null ? [] : [{ id: 'calories', label: a.caloriesEstimated ? copy.estCalories : copy.calories, value: `${a.calories} kcal`, estimated: a.caloriesEstimated, sensitive: true }]),
    ],
  } : null;
  return <Screen scene={activityTheme.scene} header={<Header title={title} onBack={() => navigation.goBack()} right={a ? <View style={styles.headerActions}><IconCircle glyph={mdi('share-variant')} label={dictionary.complete.share} onPress={() => setSharing(true)} /><IconCircle glyph={mdi('trash-can-outline')} label={copy.delete} color={palette.danger} onPress={remove} /></View> : undefined} />}>
    {query.isLoading ? <View style={{ gap: 12 }}><Skeleton height={220} round={radius.lg} /><Skeleton height={160} round={radius.lg} /></View>
      : query.error || !a ? <ErrorState error={query.error} onRetry={() => query.refetch()} />
        : <>
          <View style={styles.head}>
            <ActivityIcon type={a.type} size={52} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="title">{copy.typeLong[a.type]}</Txt>
              <Txt variant="small" color={palette.inkMuted}>{new Date(a.startedAt).toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {new Date(a.startedAt).toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' })}</Txt>
              <SourceBadge activity={a} />
            </View>
          </View>

          {ACTIVITY_TYPES[a.type].gps ? (a.route.length > 1 ? <RouteMap route={a.route} height={230} testID="detail-map" />
            : <GlassCard style={styles.noRoute}><GlyphIcon glyph={mdi('map-marker-off-outline')} size={20} color={palette.inkFaint} /><Txt variant="small" color={palette.inkMuted} style={{ flex: 1 }}>{a.source === 'GYM_FREAK' ? copy.noRoute : format(copy.importedNoRoute, { source: a.sourceName || dictionary.health[a.source] })}</Txt></GlassCard>) : null}

          <GlassCard style={styles.stats}>
            <View style={styles.row}>
              {a.distanceMeters != null ? <MetricBlock label={copy.distance} value={distanceValue(a.distanceMeters, system)} unit={distanceUnit(system)} testID="detail-distance" /> : null}
              <MetricBlock label={copy.duration} value={clock(a.activeDurationMs / 1000, true)} testID="detail-duration" />
            </View>
            <View style={styles.row}>
              {a.avgPaceSecPerKm ? <MetricBlock label={copy.avgPace} value={paceValue(a.avgPaceSecPerKm, system)} unit={paceUnit(system)} testID="detail-pace" /> : null}
              {a.calories != null ? <MetricBlock label={a.caloriesEstimated ? copy.estCalories : copy.calories} value={String(a.calories)} unit="kcal" testID="detail-calories" /> : null}
            </View>
            {a.steps != null || a.elevationGainM ? <View style={styles.row}>
              {a.steps != null ? <MetricBlock label={copy.steps} value={a.steps.toLocaleString(language)} /> : null}
              {a.elevationGainM ? <MetricBlock label={copy.elevation} value={formatElevation(a.elevationGainM, system)} /> : null}
            </View> : null}
            {a.caloriesEstimated && a.calories != null ? <Txt variant="tab" color={palette.inkMuted}>{copy.caloriesNote}</Txt> : null}
          </GlassCard>

          {a.splits.length ? <Section title={copy.splits}><GlassCard><SplitsList splits={a.splits} system={system} /></GlassCard></Section> : null}
        </>}
    {shareCard ? <ShareComposer visible={sharing} onClose={() => setSharing(false)} card={shareCard} referral={referral.data} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  noRoute: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stats: { gap: 16, padding: 18, marginTop: 14 },
  row: { flexDirection: 'row', gap: 12 },
  headerActions: { flexDirection: 'row', gap: 8 },
});

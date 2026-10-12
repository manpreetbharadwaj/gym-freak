import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { GlyphIcon, GradientButton, mdi, PressableScale, Txt } from '@/components';
import { Card, IconCircle, Screen, Section } from '@/components/layout';
import { EmptyState, SkeletonList } from '@/components/feedback';
import { format, useI18n } from '@/i18n';
import { useActivities, useHealthToday } from '@/hooks/queries';
import { useUnitSystem } from '@/hooks/useUnits';
import { RootStackParamList } from '@/navigation/types';
import { healthAdapter } from '@/services/health';
import { useHealthSync } from '@/services/health/sync';
import { palette, radius, scenes, shadow } from '@/theme';
import { clock, distanceUnit, distanceValue } from '@/utils/units';
import { ACTIVITY_ORDER, ACTIVITY_TYPES } from './activityTypes';
import { ActivityRow } from './components';
import { activeMs } from './engine';
import { isSameLocalDay, todaySummary } from './summary';
import { useActiveSession } from './tracker';
import { activityTheme } from './theme/activityGlassTheme';
import { GlassCard } from './theme/Glass';
import { AccentScopeProvider } from '@/components/accentScope';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Activity tab — FREE for everyone (no Pro or trial checks anywhere in this module). */
export function ActivityScreen() {
  const navigation = useNavigation<Nav>();
  const { dictionary } = useI18n();
  const copy = dictionary.activity;
  const system = useUnitSystem();
  const activities = useActivities();
  const health = useHealthToday();
  const sync = useHealthSync();
  const session = useActiveSession();
  const adapter = healthAdapter();
  const items = activities.data?.pages.flatMap((p) => p.items) ?? [];
  const today = todaySummary(health.data, items.filter((a) => isSameLocalDay(a.startedAt)));
  const healthName = adapter ? dictionary.health[adapter.provider] : '';

  const fromNote = (source: 'health' | 'activities' | null) => (source === 'health' ? format(copy.fromSource, { source: healthName }) : source === 'activities' ? copy.fromGymFreak : undefined);

  return <Screen scene={activityTheme.scene} tabBar refreshing={activities.isRefetching} onRefresh={() => { activities.refetch(); health.refetch(); }}>
    <AccentScopeProvider value={activityTheme.scope}>
    <View style={styles.header}>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt variant="display">{copy.title}</Txt>
          <View style={styles.free}><Txt variant="tab" color={activityTheme.glass ? '#34D399' : palette.accent}>{copy.free.toUpperCase()}</Txt></View>
        </View>
        <Txt variant="small" color={palette.inkMuted}>{copy.freeNote}</Txt>
      </View>
      <IconCircle glyph={mdi('cog-outline')} label={copy.settings} onPress={() => navigation.navigate('ActivitySettings')} />
    </View>

    {session ? <SessionBanner onPress={() => navigation.navigate(session.tracker.status === 'finished' ? 'ActivitySummary' : 'ActivityLive')} /> : null}

    <Txt variant="overline" color={palette.inkMuted} style={{ marginTop: 18, marginBottom: 10 }}>{copy.today.toUpperCase()}</Txt>
    <View style={styles.grid}>
      <TodayTile testID="today-steps" glyph="shoe-print" color={activityTheme.accent} label={copy.steps} value={today.steps != null ? today.steps.toLocaleString() : '—'} note={today.steps != null ? fromNote('health') : copy.notConnectedShort} />
      <TodayTile testID="today-distance" glyph="map-marker-distance" color={palette.aqua} label={copy.distance} value={today.distanceMeters != null ? distanceValue(today.distanceMeters, system, 1) : '—'} unit={today.distanceMeters != null ? distanceUnit(system) : undefined} note={fromNote(today.distanceSource)} />
      <TodayTile testID="today-calories" glyph="fire" color="#FF7A45" label={copy.activeCalories} value={today.activeCalories != null ? String(today.activeCalories) : '—'} unit={today.activeCalories != null ? 'kcal' : undefined} note={today.caloriesEstimated ? copy.estimated : fromNote(today.caloriesSource)} />
      <TodayTile testID="today-time" glyph="timer-outline" color={activityTheme.accentSoft} label={copy.activeTime} value={String(today.activeMinutes)} unit="min" note={copy.fromGymFreak} />
    </View>

    {adapter && !sync.enabled ? <Pressable onPress={() => navigation.navigate('ConnectedHealth')} accessibilityRole="button" style={[styles.connect, activityTheme.glass ? styles.glassBox : shadow(undefined, 0.4)]} testID="activity-connect-health">
      <View style={styles.connectIcon}><GlyphIcon glyph={mdi(adapter.provider === 'APPLE_HEALTH' ? 'heart' : 'heart-pulse')} size={20} color={palette.coral} /></View>
      <Txt variant="small" style={{ flex: 1 }}>{format(dictionary.health.dashboardPrompt, { provider: healthName })}</Txt>
      <GlyphIcon glyph={mdi('chevron-right')} size={20} color={palette.inkFaint} />
    </Pressable> : null}

    <View style={[styles.hero, activityTheme.glass ? styles.heroGlass : shadow(palette.accent, 0.5)]}>
      {/* Glass: frosted fill with a warm ambient wash from the logo colours instead of the navy panel. */}
      <LinearGradient colors={activityTheme.glass ? ['rgba(254,116,41,0.16)', 'rgba(255,255,255,0.05)', 'rgba(255,176,67,0.06)'] : ['#0D2135', '#0A1422', '#081019']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {activityTheme.glass ? <LinearGradient pointerEvents="none" colors={activityTheme.highlight} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.5 }} style={StyleSheet.absoluteFill} /> : null}
      <Txt variant="overline" color={activityTheme.accentSoft}>{copy.free.toUpperCase()} · GPS</Txt>
      <Txt variant="display" color={palette.white}>{copy.start}</Txt>
      <Txt variant="small" color={palette.inkMuted}>{copy.choose}</Txt>
      <View style={styles.types}>
        {ACTIVITY_ORDER.map((type) => <PressableScale key={type} haptic="selection" scaleTo={0.95} accessibilityLabel={copy.types[type]} testID={`quick-${type}`} onPress={() => navigation.navigate('ActivityStart', { type })} containerStyle={{ flex: 1 }} style={styles.typeChip}>
          <View style={[styles.typeIcon, { backgroundColor: ACTIVITY_TYPES[type].tint }]}><GlyphIcon glyph={mdi(ACTIVITY_TYPES[type].icon)} size={20} color={ACTIVITY_TYPES[type].color} /></View>
          <Txt variant="tab" color={palette.inkSoft} numberOfLines={1}>{copy.types[type]}</Txt>
        </PressableScale>)}
      </View>
      <GradientButton testID="activity-start" label={copy.start} icon="play" gradient={activityTheme.cta} onPress={() => navigation.navigate('ActivityStart')} style={{ marginTop: 6 }} />
    </View>

    <Section title={copy.recent} action={items.length ? dictionary.common.seeAll : undefined} onAction={() => navigation.navigate('ActivityHistory')}>
      {activities.isLoading ? <SkeletonList rows={2} height={92} />
        : items.length ? <View style={{ gap: 10 }}>{items.slice(0, 3).map((a) => <ActivityRow key={a.id} activity={a} system={system} onPress={() => navigation.navigate('ActivityDetail', { activityId: a.id })} />)}</View>
          : <EmptyState title={copy.empty} body={activities.error ? copy.serverNeeded : copy.emptyBody} glyph={mdi('run-fast')} />}
    </Section>
    </AccentScopeProvider>
  </Screen>;
}

function TodayTile({ glyph, color, label, value, unit, note, testID }: { glyph: string; color: string; label: string; value: string; unit?: string; note?: string; testID?: string }) {
  return <GlassCard style={styles.tile}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <GlyphIcon glyph={mdi(glyph)} size={16} color={color} />
      <Txt variant="label" color={palette.inkSoft}>{label}</Txt>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }} testID={testID}>
      <Txt variant="metric" style={{ fontVariant: ['tabular-nums'] }}>{value}</Txt>
      {unit ? <Txt variant="label" color={palette.inkMuted}>{unit}</Txt> : null}
    </View>
    {note ? <Txt variant="tab" color={palette.inkMuted} numberOfLines={1}>{note}</Txt> : <Txt variant="tab" color="transparent">·</Txt>}
  </GlassCard>;
}

/** Live session (or an unsaved finished one) is always one tap away. */
function SessionBanner({ onPress }: { onPress: () => void }) {
  const { dictionary } = useI18n();
  const copy = dictionary.activity;
  const session = useActiveSession();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  if (!session) return null;
  const finished = session.tracker.status === 'finished';
  return <Pressable onPress={onPress} accessibilityRole="button" testID="activity-session-banner" style={[styles.banner, activityTheme.glass ? styles.glassBox : shadow(palette.success, 0.8)]}>
    <LinearGradient colors={activityTheme.glass ? ['rgba(254,116,41,0.30)', 'rgba(255,255,255,0.06)'] : ['#0E3B52', '#0D2135']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
    <GlyphIcon glyph={mdi(ACTIVITY_TYPES[session.tracker.type].icon)} size={22} color={palette.white} />
    <View style={{ flex: 1 }}>
      <Txt variant="row" color={palette.white}>{finished ? copy.unsaved : copy.inProgress}</Txt>
      <Txt variant="small" color="rgba(255,255,255,0.9)">{finished ? format(copy.unsavedBody, { type: copy.types[session.tracker.type].toLowerCase() }) : `${copy.types[session.tracker.type]} · ${clock(activeMs(session.tracker, now) / 1000, true)}`}</Txt>
    </View>
    <Txt variant="label" color={palette.white}>{finished ? copy.review : copy.backToActivity}</Txt>
  </Pressable>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  free: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(52,211,153,0.12)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, gap: 4, padding: 14 },
  connect: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 12, borderRadius: radius.lg, backgroundColor: palette.surface },
  connectIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,107,126,0.12)', alignItems: 'center', justifyContent: 'center' },
  hero: { marginTop: 20, padding: 18, gap: 6, borderRadius: radius.xl, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(99,216,255,0.22)' },
  types: { flexDirection: 'row', gap: 8, marginTop: 8 },
  typeChip: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.md, backgroundColor: activityTheme.glass ? activityTheme.fill : palette.glass, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: activityTheme.glass ? activityTheme.border : palette.line },
  glassBox: { backgroundColor: activityTheme.fill, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: activityTheme.border },
  heroGlass: { borderColor: 'rgba(255,176,67,0.28)' },
  typeIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, padding: 14, borderRadius: radius.lg, overflow: 'hidden' },
});

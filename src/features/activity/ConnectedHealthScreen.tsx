import React, { useCallback, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { GlyphIcon, GradientButton, mdi, SecondaryButton, Txt } from '@/components';
import { Card, Header, Screen } from '@/components/layout';
import { format, useI18n } from '@/i18n';
import { useHealthConnections, useInvalidateActivities } from '@/hooks/queries';
import { RootScreenProps } from '@/navigation/types';
import { healthAdapter, HealthAvailability, HealthPermissionState } from '@/services/health';
import { healthSync, useHealthSync } from '@/services/health/sync';
import { useRepos } from '@/store/session';
import { palette, radius, scenes } from '@/theme';
import { HealthConnectionStatus } from '@/types/domain';

const STATUS_COLOR: Record<HealthConnectionStatus | 'SYNCING', string> = { CONNECTED: palette.success, NOT_CONNECTED: palette.inkMuted, PERMISSION_LIMITED: palette.orange, ERROR: palette.danger, SYNCING: palette.blue };

/** Settings → Connected Health Apps. Shows only real states — never a "Connected" the platform hasn't granted. */
export function ConnectedHealthScreen({ navigation }: RootScreenProps<'ConnectedHealth'>) {
  const { dictionary, language } = useI18n();
  const copy = dictionary.health;
  const { gym } = useRepos();
  const adapter = healthAdapter();
  const sync = useHealthSync();
  const server = useHealthConnections();
  const invalidate = useInvalidateActivities();
  const [availability, setAvailability] = useState<HealthAvailability | null>(null);
  const [perms, setPerms] = useState<HealthPermissionState | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    if (!adapter) return;
    healthSync.load();
    adapter.availability().then(async (a) => { setAvailability(a); if (a === 'available') setPerms(await adapter.permissions()); });
  }, [adapter]);
  useFocusEffect(refresh);

  if (!adapter) return <Screen scene={scenes.violet} header={<Header title={copy.title} onBack={() => navigation.goBack()} />}><Card><Txt>{copy.unavailable}</Txt></Card></Screen>;

  const name = copy[adapter.provider];
  const row = server.data?.find((c) => c.provider === adapter.provider);
  const connected = sync.enabled && perms != null && perms.status !== 'NOT_CONNECTED';
  const status: HealthConnectionStatus | 'SYNCING' = sync.syncing ? 'SYNCING' : sync.error && sync.enabled ? 'ERROR' : connected ? perms!.status : 'NOT_CONNECTED';
  const lastSync = sync.lastSuccessAt ?? row?.lastSyncedAt ?? null;
  const lastLabel = lastSync ? format(copy.lastSynced, { time: formatWhen(lastSync, language, copy.today) }) : copy.never;

  const run = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); } finally { setBusy(false); refresh(); invalidate(); server.refetch(); } };
  const connect = () => run(() => healthSync.connect(gym));
  const syncNow = () => run(() => healthSync.run(gym, { force: true }));
  const disconnect = () => Alert.alert(format(copy.disconnectTitle, { provider: name }), `${copy.disconnectBody}${Platform.OS === 'ios' ? `\n\n${copy.disconnectIos}` : ''}`, [
    { text: dictionary.common.cancel, style: 'cancel' },
    { text: copy.disconnect, style: 'destructive', onPress: () => run(() => healthSync.disconnect(gym)) },
  ]);

  return <Screen scene={scenes.violet} header={<Header title={copy.title} onBack={() => navigation.goBack()} />}>
    <Txt variant="body" color={palette.inkSoft}>{copy.explain}</Txt>

    <Card style={styles.card}>
      <View style={styles.provider}>
        <View style={styles.logo}><GlyphIcon glyph={mdi(adapter.provider === 'APPLE_HEALTH' ? 'heart' : 'heart-pulse')} size={26} color={palette.pink} /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="title">{name}</Txt>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[status] }]} />
            <Txt variant="label" color={STATUS_COLOR[status]} testID="health-status">{status === 'SYNCING' ? copy.syncing : copy[status]}</Txt>
          </View>
          {connected ? <Txt variant="tab" color={palette.inkMuted} testID="health-last-sync">{lastLabel}</Txt> : null}
        </View>
      </View>

      {availability && availability !== 'available' ? <View style={{ gap: 10 }}>
        <Txt variant="small" color={palette.inkMuted}>{availability === 'needs-install' ? copy.needsInstall : availability === 'needs-update' ? copy.needsUpdate : copy.unavailable}</Txt>
        {availability === 'needs-install' || availability === 'needs-update' ? <SecondaryButton label={copy.install} icon="google-play" iconFirst onPress={() => Linking.openURL('market://details?id=com.google.android.apps.healthdata').catch(() => Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata'))} /> : null}
      </View> : null}

      {connected && perms ? <View style={{ gap: 6 }}>
        <Txt variant="overline" color={palette.inkMuted}>{copy.permissions.toUpperCase()}</Txt>
        {perms.granted.map((g) => <View key={g} style={styles.perm}><GlyphIcon glyph={mdi('check-circle')} size={16} color={palette.aqua} /><Txt variant="small">{copy.perm[g] ?? g}</Txt></View>)}
        {!perms.readStatusKnown ? <Txt variant="tab" color={palette.inkMuted}>{copy.iosReadNote}</Txt> : null}
      </View> : null}

      {sync.last && connected ? <Txt variant="tab" color={palette.inkMuted}>{format(copy.syncResult, { imported: sync.last.imported, matched: sync.last.matched })}</Txt> : null}
      {sync.error && sync.enabled ? <Txt variant="tab" color={palette.danger}>{sync.error}</Txt> : null}

      {availability === 'available' ? (connected ? <View style={{ gap: 10 }}>
        <GradientButton testID="health-sync" label={copy.syncNow} icon="sync" loading={busy || sync.syncing} onPress={syncNow} />
        <SecondaryButton label={copy.manage} icon="shield-check-outline" iconFirst onPress={() => adapter.managePermissions()} />
        <SecondaryButton testID="health-disconnect" label={copy.disconnect} color={palette.danger} onPress={disconnect} />
      </View> : <GradientButton testID="health-connect" label={copy.connect} icon="link-variant" loading={busy} onPress={connect} />) : null}
    </Card>

    <Card style={styles.note}>
      <GlyphIcon glyph={mdi(adapter.provider === 'APPLE_HEALTH' ? 'watch-variant' : 'watch')} size={18} color={palette.violet} />
      <Txt variant="small" color={palette.inkSoft} style={{ flex: 1 }}>{adapter.provider === 'APPLE_HEALTH' ? copy.watchNote : copy.wearNote}</Txt>
    </Card>
    <Card style={styles.note}>
      <GlyphIcon glyph={mdi('shield-lock-outline')} size={18} color={palette.violet} />
      <Txt variant="small" color={palette.inkSoft} style={{ flex: 1 }}>{copy.privacy}</Txt>
    </Card>
  </Screen>;
}

function formatWhen(iso: string, language: string, todayTemplate: string) {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return format(todayTemplate, { time });
  return `${d.toLocaleDateString(language, { day: 'numeric', month: 'short' })}, ${time}`;
}

const styles = StyleSheet.create({
  card: { marginTop: 16, gap: 16, padding: 18 },
  provider: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,107,126,0.12)', alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  perm: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12, borderRadius: radius.lg },
});

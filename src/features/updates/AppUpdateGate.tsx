import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, icons } from '@/components/Icon';
import { useDialog } from '@/components/dialogs/DialogProvider';
import { GradientButton, MeshBackground, Txt } from '@/components/primitives';
import { useI18n } from '@/i18n';
import { AppUpdatePolicy, checkForAppUpdate, openVerifiedStoreUrl, optionalDismissKey, subscribeToForeground, UPDATE_THROTTLE_MS } from '@/services/appUpdates';
import { safeStorage } from '@/services/storage/safeStorage';
import { gradients, palette, radius, space } from '@/theme';

export function AppUpdateGate({ children }: { children: React.ReactNode }) {
  const { language } = useI18n();
  const dialog = useDialog();
  const [mandatory, setMandatory] = useState<AppUpdatePolicy | null>(null);
  const [checking, setChecking] = useState(false);
  const [offlinePolicy, setOfflinePolicy] = useState(false);
  const lastCheck = useRef(0);
  const checkingRef = useRef(false);
  const mandatoryRef = useRef<AppUpdatePolicy | null>(null);
  const run = useCallback(async (force = false) => {
    if (checkingRef.current || (!force && Date.now() - lastCheck.current < UPDATE_THROTTLE_MS)) return;
    checkingRef.current = true; lastCheck.current = Date.now(); setChecking(true);
    const result = await checkForAppUpdate(language);
    checkingRef.current = false; setChecking(false); setOfflinePolicy(result.cached);
    const policy = result.policy;
    if (!policy?.updateAvailable) { mandatoryRef.current = null; setMandatory(null); return; }
    if (policy.mandatory) { mandatoryRef.current = policy; setMandatory(policy); return; }
    mandatoryRef.current = null; setMandatory(null);
    const dismissedAt = await safeStorage.get<number>(optionalDismissKey(policy), 0);
    if (Date.now() - dismissedAt < policy.reminderHours * 60 * 60_000) return;
    const confirmed = await dialog.showInfo({
      title: policy.title, description: `${policy.description}\n\nVersion ${policy.latestVersion}`,
      content: <FeatureList policy={policy} />, confirmLabel: 'Update Now', cancelLabel: 'Maybe Later', allowBackdropDismiss: true, dedupeKey: `update-${policy.policyId}`,
    });
    if (confirmed) await openVerifiedStoreUrl(policy.storeUrl).catch((error) => dialog.showError({ title: 'Unable to open store', description: error.message }));
    else await safeStorage.set(optionalDismissKey(policy), Date.now());
  }, [dialog, language]);
  useEffect(() => { void run(true); const sub = subscribeToForeground(() => void run(!!mandatoryRef.current)); return () => sub.remove(); }, [run]);
  useEffect(() => { if (!mandatory) return; const sub = BackHandler.addEventListener('hardwareBackPress', () => true); return () => sub.remove(); }, [mandatory]);
  if (!mandatory) return <>{children}</>;
  return <SafeAreaView style={styles.screen}><MeshBackground base={palette.canvas} blobs={['#FF9F43', '#FFBE55', '#FF6B7E']} />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.mark}><Icon name="arrowUpRight" size={32} color={palette.orange} /></View>
      <Txt variant="display" align="center">{mandatory.title}</Txt>
      <Txt color={palette.inkSoft} align="center">{mandatory.description}</Txt>
      <Txt variant="label" color={palette.orange} align="center">Version {mandatory.latestVersion} · Build {mandatory.latestBuild}</Txt>
      {offlinePolicy ? <View style={styles.notice}><Txt variant="small" color={palette.yellow} align="center">Showing the last verified update policy while offline.</Txt></View> : null}
      <FeatureList policy={mandatory} />
      <GradientButton label="Update Now" icon="arrow-up-right" gradient={['#FF9F43', '#FFBE55']} onPress={() => void openVerifiedStoreUrl(mandatory.storeUrl).catch((error) => dialog.showError({ title: 'Unable to open store', description: error.message }))} />
      <GradientButton label="Retry check" icon="refresh" gradient={gradients.surface} loading={checking} onPress={() => void run(true)} />
    </ScrollView>
  </SafeAreaView>;
}

function FeatureList({ policy }: { policy: AppUpdatePolicy }) {
  if (!policy.features.length) return null;
  return <View style={styles.features}>{policy.features.map((feature) => <View key={feature.id} style={styles.feature}>
    {feature.imageUrl ? <Image source={{ uri: feature.imageUrl }} style={styles.image} resizeMode="cover" /> : <View style={styles.featureIcon}><Icon name={feature.icon && feature.icon in icons ? feature.icon as keyof typeof icons : 'sparkle'} size={20} color={palette.orange} /></View>}
    <View style={styles.featureCopy}><Txt variant="h3">{feature.title}</Txt>{feature.description ? <Txt variant="small" color={palette.inkSoft}>{feature.description}</Txt> : null}</View>
  </View>)}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas }, content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: space.md, maxWidth: 520, width: '100%', alignSelf: 'center' },
  mark: { width: 64, height: 64, borderRadius: 22, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF9F431A', borderColor: '#FF9F4366', borderWidth: 1 },
  features: { gap: space.sm, marginVertical: space.sm }, feature: { flexDirection: 'row', gap: space.sm, padding: space.sm, borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  featureIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF9F4314' }, featureCopy: { flex: 1, gap: 2 }, image: { width: 56, height: 56, borderRadius: radius.sm },
  notice: { borderRadius: radius.sm, padding: space.sm, backgroundColor: '#FFD16612', borderWidth: 1, borderColor: '#FFD16644' },
});

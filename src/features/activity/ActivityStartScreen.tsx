import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { GlyphIcon, GradientButton, mdi, PressableScale, SecondaryButton, Txt } from '@/components';
import { Header, Screen } from '@/components/layout';
import { useI18n } from '@/i18n';
import { RootScreenProps } from '@/navigation/types';
import { palette, pressScales, radius, shadow } from '@/theme';
import { ActivityType } from '@/types/domain';
import { haptics } from '@/utils/haptics';
import { ACTIVITY_ORDER, ACTIVITY_TYPES, isGpsActivity } from './activityTypes';
import { locationServicesOn, requestLocationPermission, tracker } from './tracker';
import { activityTheme } from './theme/activityGlassTheme';
import { GlassCard } from './theme/Glass';
import { useDialog } from '@/components/dialogs/DialogProvider';

type Gps = 'checking' | 'needs-permission' | 'blocked' | 'services-off' | 'searching' | 'weak' | 'ready';

/** Pick an activity; GPS activities show live signal quality before START. Location is asked for here, not at launch. */
export function ActivityStartScreen({ navigation, route }: RootScreenProps<'ActivityStart'>) {
  const dialog = useDialog();
  const { dictionary } = useI18n();
  const copy = dictionary.activity;
  const [type, setType] = useState<ActivityType>(route.params?.type ?? 'RUNNING');
  const [gps, setGps] = useState<Gps>('checking');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const gpsType = isGpsActivity(type);

  const watch = useCallback(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      if (!gpsType) return;
      if (!(await locationServicesOn())) { setGps('services-off'); return; }
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted) { setGps(perm.canAskAgain ? 'needs-permission' : 'blocked'); return; }
      setGps('searching');
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 }, (loc) => {
        const acc = loc.coords.accuracy ?? null;
        setAccuracy(acc);
        setGps(acc != null && acc <= 20 ? 'ready' : acc != null && acc <= 50 ? 'weak' : 'searching');
      });
      if (cancelled) sub.remove();
    })();
    return () => { cancelled = true; sub?.remove(); };
  }, [gpsType]);

  useFocusEffect(watch);

  const allow = async () => {
    const result = await requestLocationPermission();
    if (result === 'granted') watch();
    else setGps(result === 'blocked' ? 'blocked' : 'needs-permission');
  };

  const start = async () => {
    await tracker.ensureLoaded();
    const existing = tracker.current();
    if (existing) {
      const proceed = await dialog.showConfirm({ title: copy.conflict, cancelLabel: dictionary.common.cancel, confirmLabel: existing.tracker.status === 'finished' ? copy.review : copy.backToActivity });
      if (proceed) navigation.replace(existing.tracker.status === 'finished' ? 'ActivitySummary' : 'ActivityLive');
      return;
    }
    haptics.press();
    navigation.replace('ActivityLive', { type });
  };

  const canStart = !gpsType || gps === 'ready' || gps === 'weak' || gps === 'searching';

  return <Screen scene={activityTheme.scene} header={<Header title={copy.start} onBack={() => navigation.goBack()} />}>
    <Txt variant="overline" color={palette.inkMuted} style={{ marginBottom: 10 }}>{copy.choose.toUpperCase()}</Txt>
    <View style={{ gap: 10 }}>
      {ACTIVITY_ORDER.map((t) => {
        const info = ACTIVITY_TYPES[t];
        const selected = t === type;
        return <PressableScale key={t} testID={`type-${t}`} haptic="selection" scaleTo={pressScales.card} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={copy.typeLong[t]} onPress={() => setType(t)}
          style={[styles.type, selected && { borderColor: info.color, backgroundColor: info.tint }, !activityTheme.glass && shadow(undefined, selected ? 0.6 : 0.3)]}>
          <View style={[styles.typeIcon, { backgroundColor: selected ? info.color : info.tint }]}><GlyphIcon glyph={mdi(info.icon)} size={24} color={selected ? palette.white : info.color} /></View>
          <View style={{ flex: 1 }}>
            <Txt variant="row">{copy.typeLong[t]}</Txt>
            <Txt variant="small" color={palette.inkMuted}>{info.gps ? 'GPS' : copy.noGps}</Txt>
          </View>
          <View style={[styles.radio, selected && { borderColor: info.color }]}>{selected ? <View style={[styles.radioDot, { backgroundColor: info.color }]} /> : null}</View>
        </PressableScale>;
      })}
    </View>

    <GlassCard style={styles.gps}>
      {gpsType ? <>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <GpsDot state={gps} />
          <Txt variant="label" color={palette.inkSoft}>{copy.gpsStatus}</Txt>
          <Txt variant="row" testID="gps-status" style={{ marginLeft: 'auto' }} color={gps === 'ready' ? palette.success : gps === 'weak' ? palette.orange : palette.ink}>
            {gps === 'ready' ? copy.gpsReady : gps === 'weak' ? copy.gpsWeak : gps === 'services-off' ? copy.gpsOff : gps === 'needs-permission' || gps === 'blocked' ? copy.gpsDenied : copy.gpsSearching}
          </Txt>
        </View>
        {accuracy != null && (gps === 'ready' || gps === 'weak' || gps === 'searching') ? <Txt variant="tab" color={palette.inkMuted}>± {Math.round(accuracy)} m</Txt> : null}
        {gps === 'needs-permission' || gps === 'blocked' || gps === 'services-off' ? <>
          <Txt variant="small" color={palette.inkMuted}>{copy.locationWhy}</Txt>
          {gps === 'needs-permission' ? <SecondaryButton testID="allow-location" label={copy.allowLocation} icon="crosshairs-gps" iconFirst onPress={allow} /> : <SecondaryButton label={copy.openSettings} icon="cog-outline" iconFirst onPress={() => Linking.openSettings()} />}
        </> : null}
      </> : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <GlyphIcon glyph={mdi('timer-outline')} size={20} color={activityTheme.accent} />
        <Txt variant="small" style={{ flex: 1 }}>{copy.noGps}</Txt>
      </View>}
    </GlassCard>

    <GradientButton gradient={activityTheme.cta} testID="start-activity" label={copy.startCta} icon="play" disabled={!canStart} onPress={start} style={{ marginTop: 20 }} />
  </Screen>;
}

function GpsDot({ state }: { state: Gps }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = state === 'searching' ? withRepeat(withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System }), -1, true) : withTiming(1, { duration: 200 });
  }, [state, pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const color = state === 'ready' ? palette.aqua : state === 'weak' ? palette.orange : state === 'searching' || state === 'checking' ? palette.accent : palette.danger;
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  type: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: activityTheme.glass ? activityTheme.fill : palette.surface, borderWidth: 1.5, borderColor: activityTheme.glass ? activityTheme.border : 'transparent' },
  typeIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: palette.lineStrong, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  gps: { marginTop: 16, gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});

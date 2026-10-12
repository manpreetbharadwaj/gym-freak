import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { GlyphIcon, mdi, PressableScale, Txt } from '@/components';
import { format, useI18n } from '@/i18n';
import { palette, pressScales, radius, shadow } from '@/theme';
import { Activity, ActivityRoutePoint, ActivitySplit } from '@/types/domain';
import { clock, distanceUnit, distanceValue, formatDistance, formatPace, paceValue, UnitSystem } from '@/utils/units';
import { ACTIVITY_TYPES } from './activityTypes';
import { timeOfDay } from './summary';
import { activityTheme } from './theme/activityGlassTheme';

/** react-native-maps needs a Google Maps key on Android; without one we draw the route ourselves. */
export const nativeMapAvailable = Platform.OS === 'ios' || !!process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const ROUTE = activityTheme.route;
const START = activityTheme.routeStart;

function segments(route: Pick<ActivityRoutePoint, 'lat' | 'lng' | 'gap'>[]) {
  const out: { latitude: number; longitude: number }[][] = [];
  for (const p of route) {
    if (p.gap || !out.length) out.push([]);
    out[out.length - 1].push({ latitude: p.lat, longitude: p.lng });
  }
  return out.filter((s) => s.length > 0);
}

/**
 * Route map. Live mode follows the runner; summary/detail mode fits the whole route.
 * Bright, muted Apple Maps style on iOS so the violet route stands out outdoors.
 */
export function RouteMap({ route, live, height = 220, style, testID }: { route: ActivityRoutePoint[]; live?: boolean; height?: number; style?: StyleProp<ViewStyle>; testID?: string }) {
  const { dictionary } = useI18n();
  const ref = useRef<MapView>(null);
  const lines = useMemo(() => segments(route), [route]);
  const last = route[route.length - 1];
  const first = route[0];
  const lastFollow = useRef(0);

  useEffect(() => {
    if (!nativeMapAvailable || !ref.current || !route.length) return;
    if (live) {
      if (Date.now() - lastFollow.current < 2500) return;
      lastFollow.current = Date.now();
      ref.current.animateCamera({ center: { latitude: last.lat, longitude: last.lng }, zoom: 16 }, { duration: 600 });
    } else {
      ref.current.fitToCoordinates(lines.flat(), { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: false });
    }
  }, [route.length, live, last, lines]);

  if (!nativeMapAvailable) {
    return <View style={[styles.mapBox, { height }, style]} testID={testID}>
      <RouteSketch route={route} height={height} />
      <View style={styles.mapNote}><Txt variant="tab" color={palette.inkMuted}>{dictionary.activity.mapTilesOff}</Txt></View>
    </View>;
  }
  return <View style={[styles.mapBox, { height }, style]} testID={testID}>
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
      showsUserLocation={live}
      followsUserLocation={false}
      showsPointsOfInterests={false}
      showsCompass={false}
      showsBuildings={false}
      pitchEnabled={false}
      toolbarEnabled={false}
      scrollEnabled={!live}
      zoomEnabled={!live}
      initialCamera={first ? { center: { latitude: first.lat, longitude: first.lng }, zoom: 16, heading: 0, pitch: 0 } : undefined}
      onMapReady={() => { if (!live && lines.flat().length) ref.current?.fitToCoordinates(lines.flat(), { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: false }); }}
    >
      {lines.map((coords, i) => <Polyline key={i} coordinates={coords} strokeColor={ROUTE} strokeWidth={5} lineCap="round" lineJoin="round" />)}
      {first ? <Marker coordinate={{ latitude: first.lat, longitude: first.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}><View style={[styles.dot, { backgroundColor: START }]} /></Marker> : null}
      {!live && last && route.length > 1 ? <Marker coordinate={{ latitude: last.lat, longitude: last.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}><View style={[styles.dot, { backgroundColor: ROUTE }]} /></Marker> : null}
    </MapView>
  </View>;
}

/** Tile-free route drawing (equirectangular projection fitted into the box). */
export function RouteSketch({ route, height, color = ROUTE, compact }: { route: Pick<ActivityRoutePoint, 'lat' | 'lng' | 'gap'>[]; height: number; color?: string; compact?: boolean }) {
  const width = 1000;
  const pts = route.length ? route : [];
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs); const maxLng = Math.max(...lngs);
  const k = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const spanX = Math.max(1e-6, (maxLng - minLng) * k);
  const spanY = Math.max(1e-6, maxLat - minLat);
  const box = { w: width, h: (width * height) / 360 };
  const pad = compact ? 40 : 90;
  const scale = Math.min((box.w - pad * 2) / spanX, (box.h - pad * 2) / spanY);
  const ox = (box.w - spanX * scale) / 2;
  const oy = (box.h - spanY * scale) / 2;
  const xy = (p: { lat: number; lng: number }) => [ox + (p.lng - minLng) * k * scale, box.h - (oy + (p.lat - minLat) * scale)] as const;
  const d = pts.map((p, i) => { const [x, y] = xy(p); return `${i === 0 || p.gap ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(' ');
  const [sx, sy] = pts.length ? xy(pts[0]) : [0, 0];
  const [ex, ey] = pts.length ? xy(pts[pts.length - 1]) : [0, 0];
  return <Svg width="100%" height={height} viewBox={`0 0 ${box.w} ${box.h}`} preserveAspectRatio="xMidYMid meet">
    {!compact ? Array.from({ length: 9 }, (_, i) => <Line key={`v${i}`} x1={(i + 1) * box.w / 10} y1={0} x2={(i + 1) * box.w / 10} y2={box.h} stroke="rgba(255,255,255,0.06)" strokeWidth={2} />) : null}
    {!compact ? Array.from({ length: 5 }, (_, i) => <Line key={`h${i}`} x1={0} y1={(i + 1) * box.h / 6} x2={box.w} y2={(i + 1) * box.h / 6} stroke="rgba(255,255,255,0.06)" strokeWidth={2} />) : null}
    {pts.length > 1 ? <Path d={d} stroke={color} strokeWidth={compact ? 22 : 14} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
    {pts.length ? <Circle cx={sx} cy={sy} r={compact ? 26 : 18} fill={START} stroke="#fff" strokeWidth={6} /> : null}
    {pts.length > 1 ? <Circle cx={ex} cy={ey} r={compact ? 26 : 18} fill={color} stroke="#fff" strokeWidth={6} /> : null}
  </Svg>;
}

export function ActivityIcon({ type, size = 44 }: { type: Activity['type']; size?: number }) {
  const info = ACTIVITY_TYPES[type];
  return <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: info.tint, alignItems: 'center', justifyContent: 'center' }}>
    <GlyphIcon glyph={mdi(info.icon)} size={size * 0.52} color={info.color} />
  </View>;
}

/** Where a session came from — subtle, never a "lesser" style for imported sessions. */
export function SourceBadge({ activity }: { activity: Pick<Activity, 'source' | 'sourceName'> }) {
  const { dictionary } = useI18n();
  const label = activity.source === 'GYM_FREAK' ? 'Gym Freak' : activity.sourceName || dictionary.health[activity.source];
  const glyph = activity.source === 'GYM_FREAK' ? 'lightning-bolt' : /watch/i.test(label) ? 'watch-variant' : activity.source === 'APPLE_HEALTH' ? 'heart' : 'heart-pulse';
  return <View style={styles.badge} accessibilityLabel={`${dictionary.activity.source}: ${label}`}>
    <GlyphIcon glyph={mdi(glyph)} size={11} color={palette.inkMuted} />
    <Txt variant="tab" color={palette.inkMuted} numberOfLines={1}>{label}</Txt>
  </View>;
}

export function MetricBlock({ label, value, unit, big, note, align = 'left', testID }: { label: string; value: string; unit?: string; big?: boolean; note?: string; align?: 'left' | 'center'; testID?: string }) {
  return <View style={{ flex: 1, alignItems: align === 'center' ? 'center' : 'flex-start' }} accessible accessibilityLabel={`${label} ${value} ${unit ?? ''}`} testID={testID}>
    <Txt variant="overline" color={palette.inkMuted}>{label.toUpperCase()}</Txt>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
      <Txt variant="number" style={[big ? styles.bigValue : styles.value, styles.tabular]} numberOfLines={1}>{value}</Txt>
      {unit ? <Txt variant="label" color={palette.inkMuted}>{unit}</Txt> : null}
    </View>
    {note ? <Txt variant="tab" color={palette.inkMuted}>{note}</Txt> : null}
  </View>;
}

export function SplitsList({ splits, system }: { splits: ActivitySplit[]; system: UnitSystem }) {
  const unit = system === 'imperial' ? 'mi' : 'km';
  const rows = splits.filter((s) => s.unit === unit).sort((a, b) => a.number - b.number);
  const paces = rows.map((r) => (r.durationMs / 1000) / (r.distanceMeters / 1000));
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);
  return <View>
    {rows.map((r, i) => {
      const full = Math.abs(r.distanceMeters - (unit === 'mi' ? 1609.344 : 1000)) < 5;
      const label = full ? `${r.number} ${distanceUnit(system)}` : `${distanceValue(r.distanceMeters, system, 2)} ${distanceUnit(system)}`;
      const width = slowest > fastest ? 0.35 + 0.65 * (1 - (paces[i] - fastest) / (slowest - fastest)) : 1;
      return <View key={`${r.unit}${r.number}`} style={styles.splitRow} accessible accessibilityLabel={`${label}, ${clock(r.durationMs / 1000)}`}>
        <Txt variant="row" style={{ width: 70 }}>{label}</Txt>
        <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: activityTheme.glass ? activityTheme.fillStrong : palette.grayBg, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(width * 100)}%`, height: 8, borderRadius: 4, backgroundColor: paces[i] === fastest && rows.length > 1 ? START : ROUTE }} />
        </View>
        <Txt variant="row" style={[styles.tabular, { width: 64, textAlign: 'right' }]}>{clock(r.durationMs / 1000)}</Txt>
        <Txt variant="small" color={palette.inkMuted} style={[styles.tabular, { width: 76, textAlign: 'right' }]}>{paceValue(paces[i], system)} {system === 'imperial' ? '/mi' : '/km'}</Txt>
      </View>;
    })}
  </View>;
}

/** History card: type, title, source, distance · time · pace · kcal, date + time. */
export function ActivityRow({ activity, system, onPress }: { activity: Activity; system: UnitSystem; onPress: () => void }) {
  const { dictionary, language } = useI18n();
  const copy = dictionary.activity;
  const typeName = copy.types[activity.type];
  const title = format(copy[timeOfDay(activity.startedAt)], { type: typeName });
  const when = new Date(activity.startedAt);
  const date = when.toLocaleDateString(language, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = when.toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' });
  const gps = ACTIVITY_TYPES[activity.type].gps;
  return <PressableScale onPress={onPress} haptic="light" scaleTo={pressScales.card} accessibilityLabel={`${title}, ${date} ${time}`} style={[styles.row, !activityTheme.glass && shadow(undefined, 0.45)]} testID={`activity-row-${activity.id}`}>
    <ActivityIcon type={activity.type} />
    <View style={{ flex: 1, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt variant="row" numberOfLines={1} style={{ flexShrink: 1 }}>{title}</Txt>
        <SourceBadge activity={activity} />
      </View>
      <View style={styles.rowStats}>
        {gps && activity.distanceMeters != null ? <Txt variant="h3" style={styles.tabular}>{formatDistance(activity.distanceMeters, system)}</Txt> : null}
        <Txt variant="label" color={palette.inkSoft} style={styles.tabular}>{clock(activity.activeDurationMs / 1000)}</Txt>
        {gps && activity.avgPaceSecPerKm ? <Txt variant="label" color={palette.inkSoft} style={styles.tabular}>{formatPace(activity.avgPaceSecPerKm, system)}</Txt> : null}
        {activity.calories != null ? <Txt variant="label" color={palette.inkSoft}>{activity.calories} kcal</Txt> : null}
      </View>
      <Txt variant="tab" color={palette.inkMuted}>{date} · {time}</Txt>
    </View>
    <GlyphIcon glyph={mdi('chevron-right')} size={20} color={palette.inkFaint} />
  </PressableScale>;
}

const styles = StyleSheet.create({
  mapBox: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: activityTheme.glass ? activityTheme.fill : 'rgba(34,184,245,0.12)', borderWidth: activityTheme.glass ? StyleSheet.hairlineWidth * 2 : 1, borderColor: activityTheme.glass ? activityTheme.border : palette.line },
  mapNote: { position: 'absolute', left: 10, right: 10, bottom: 8, alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: palette.line },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: activityTheme.glass ? activityTheme.fillStrong : palette.grayBg, maxWidth: 130 },
  value: { fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  bigValue: { fontSize: 52, lineHeight: 58, letterSpacing: -1.5 },
  tabular: { fontVariant: ['tabular-nums'] },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: activityTheme.glass ? activityTheme.fill : palette.surface, ...(activityTheme.glass ? { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: activityTheme.border, overflow: 'hidden' as const } : null) },
  rowStats: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 12, rowGap: 2 },
});

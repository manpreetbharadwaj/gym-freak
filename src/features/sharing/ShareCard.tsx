import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppLogo, GlyphIcon, mdi, Txt } from '@/components';
import { palette, radius } from '@/theme';
import { ShareCardFormat, ShareCardModel } from './types';

export function ShareCard({ card, format, metrics, referralCode }: { card: ShareCardModel; format: ShareCardFormat; metrics: string[]; referralCode?: string }) {
  const compact = format === 'landscape';
  const shown = card.metrics.filter((metric) => metrics.includes(metric.id));
  return <View collapsable={false} style={[styles.card, styles[format]]}>
    <LinearGradient colors={['#02060B', '#071522', '#0B1220']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    <View style={styles.orbA} /><View style={styles.orbB} />
    <View style={[styles.top, compact && styles.topCompact]}>
      <AppLogo size={compact ? 34 : 44} rounded />
      <View><Txt variant="overline" color={palette.accentSoft}>GYM FREAK</Txt><Txt variant="small" color={palette.inkMuted}>TRAIN · TRACK · PROGRESS</Txt></View>
    </View>
    <View style={[styles.copy, compact && styles.copyCompact]}>
      <Txt variant="overline" color={palette.orange}>{card.eyebrow.toUpperCase()}</Txt>
      <Txt variant={compact ? 'title' : 'display'}>{card.title}</Txt>
      {card.subtitle ? <Txt variant="body" color={palette.inkSoft}>{card.subtitle}</Txt> : null}
      {card.date ? <Txt variant="small" color={palette.inkMuted}>{card.date}</Txt> : null}
    </View>
    {shown.length ? <View style={[styles.metrics, compact && styles.metricsCompact]}>{shown.map((metric) => <View key={metric.id} style={styles.metric}>
      <Txt variant={compact ? 'h3' : 'metric'}>{metric.value}</Txt>
      <Txt variant="small" color={palette.inkMuted}>{metric.label}{metric.estimated ? ' · EST.' : ''}</Txt>
    </View>)}</View> : null}
    <View style={styles.footer}>
      <View style={{ flex: 1 }}><Txt variant="h3">{card.statement}</Txt><Txt variant="small" color={palette.inkMuted}>Powered by Gym Freak</Txt></View>
      {referralCode ? <View style={styles.referral}><Txt variant="overline" color={palette.accentSoft}>JOIN ME</Txt><Txt variant="h3">{referralCode}</Txt></View> : <GlyphIcon glyph={mdi('arrow-up-right')} size={28} color={palette.accentSoft} />}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { width: '100%', overflow: 'hidden', backgroundColor: palette.canvas, borderRadius: radius.xl, borderWidth: 1, borderColor: '#FFFFFF24', padding: 24, justifyContent: 'space-between' },
  story: { aspectRatio: 1080 / 1920 }, portrait: { aspectRatio: 1080 / 1350 }, square: { aspectRatio: 1 }, landscape: { aspectRatio: 1200 / 630 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 }, topCompact: { position: 'absolute', top: 20, left: 22 },
  copy: { gap: 7, marginTop: 28 }, copyCompact: { width: '48%', marginTop: 36 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 18 }, metricsCompact: { position: 'absolute', width: '44%', right: 22, top: 38 },
  metric: { minWidth: '46%', flexGrow: 1, padding: 12, borderRadius: radius.md, backgroundColor: '#FFFFFF0B', borderWidth: 1, borderColor: '#FFFFFF14' },
  footer: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, borderTopWidth: 1, borderTopColor: '#FFFFFF18', paddingTop: 16 },
  referral: { alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: '#63D8FF88' },
  orbA: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#22B8F51C', right: -90, top: -70 },
  orbB: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#FF6B7E12', left: -80, bottom: 30 },
});

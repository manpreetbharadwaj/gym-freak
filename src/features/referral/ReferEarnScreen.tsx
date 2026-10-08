import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Share, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { GlyphIcon, GradientButton, mdi, SecondaryButton, Txt } from '@/components';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Card, Header, Screen, Section } from '@/components/layout';
import { useReferral } from '@/hooks/queries';
import { format, useI18n } from '@/i18n';
import { RootScreenProps } from '@/navigation/types';
import { palette, radius, scenes, shadow } from '@/theme';
import { haptics } from '@/utils/haptics';
import { discountLabel } from '@/utils/money';

const LIME = palette.lime;

/**
 * Refer & Earn. Everything shown — code, link, counts, current discount, next milestone — comes from
 * HealthyMe. Pending referrals are listed separately and never count toward the discount.
 */
export function ReferEarnScreen({ navigation }: RootScreenProps<'ReferEarn'>) {
  const { dictionary, language } = useI18n();
  const copy = dictionary.referral;
  const query = useReferral();
  const r = query.data;
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if (!r) return;
    await Clipboard.setStringAsync(r.code);
    haptics.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const share = () => r && Share.share({ message: `${format(copy.shareMessage, { code: r.code })}\n${r.link}` }).catch(() => undefined);

  const reached = r?.nextMilestone ? r.nextMilestone.referrals - r.nextMilestone.remaining : 0;
  const progress = r?.nextMilestone ? Math.min(1, reached / r.nextMilestone.referrals) : 1;

  return <Screen scene={scenes.violet} header={<Header title={copy.title} onBack={() => navigation.goBack()} />}>
    {query.isLoading ? <View style={{ gap: 14 }}><Skeleton height={210} round={radius.xl} /><Skeleton height={120} round={radius.lg} /></View>
      : query.error || !r ? <ErrorState error={query.error ?? new Error(copy.unavailable)} onRetry={() => query.refetch()} />
      : <>
        <View style={[styles.hero, shadow(palette.violet, 1)]}>
          <LinearGradient colors={['#0D2135', '#0A1422', '#081019']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Txt variant="small" color="rgba(255,255,255,0.85)">{copy.subtitle}</Txt>
          <Txt variant="overline" color="rgba(255,255,255,0.75)" style={{ marginTop: 14 }}>{copy.yourCode.toUpperCase()}</Txt>
          <View style={styles.codeBox} accessible accessibilityLabel={`${copy.yourCode}: ${r.code.split('').join(' ')}`}>
            <Txt variant="number" color={palette.white} style={styles.code}>{r.code}</Txt>
          </View>
          <Txt variant="label" color="rgba(255,255,255,0.8)" numberOfLines={1}>{r.link.replace(/^https:\/\//, '')}</Txt>
          <View style={styles.heroActions}>
            <SecondaryButton label={copied ? copy.copied : copy.copy} icon={copied ? 'checkmark-circle' : 'copy-outline'} iconFirst color={copied ? LIME : palette.violet} onPress={copyCode} style={{ flex: 1 }} />
            <GradientButton label={copy.share} icon="share-social-outline" onPress={share} style={{ flex: 1 }} />
          </View>
        </View>
        {!r.active ? <Card style={styles.notice}><GlyphIcon glyph={mdi('pause-circle-outline')} size={18} color={palette.inkMuted} /><Txt variant="small" color={palette.inkMuted} style={{ flex: 1 }}>{copy.paused}</Txt></Card> : null}

        <View style={styles.stats}>
          <Stat label={copy.successful} value={String(r.successfulReferrals)} color={LIME} glyph="account-check-outline" />
          <Stat label={copy.pending} value={String(r.pendingReferrals)} color={palette.orange} glyph="timer-sand" />
          <Stat label={copy.total} value={String(r.totalReferrals)} color={palette.violet} glyph="account-group-outline" />
        </View>

        <Card style={{ marginTop: 14, gap: 12 }}>
          <View style={styles.rewardRow}>
            <View style={[styles.rewardIcon, { backgroundColor: 'rgba(52,211,153,0.12)' }]}><GlyphIcon glyph={mdi('ticket-percent-outline')} size={22} color={LIME} /></View>
            <View style={{ flex: 1 }}>
              <Txt variant="label" color={palette.inkMuted}>{copy.yourDiscount.toUpperCase()}</Txt>
              <Txt variant="metric" color={r.reward ? LIME : palette.inkMuted}>{r.reward ? discountLabel(r.reward, r.currency, language) : copy.noDiscount}</Txt>
            </View>
          </View>
          {r.nextMilestone ? <View style={{ gap: 8 }}>
            <View style={styles.rewardRow}><Txt variant="row" style={{ flex: 1 }}>{copy.nextReward}</Txt><Txt variant="label" color={palette.violet}>{reached} / {r.nextMilestone.referrals}</Txt></View>
            <MilestoneBar progress={progress} />
            <Txt variant="small" color={palette.inkMuted}>{format(copy.nextRewardBody, { count: r.nextMilestone.remaining, discount: discountLabel(r.nextMilestone, r.currency, language) })}</Txt>
          </View> : r.reward ? <Txt variant="small" color={palette.inkMuted}>{copy.topReward}</Txt> : null}
          {r.pendingReferrals > 0 ? <Txt variant="small" color={palette.inkMuted}>{copy.pendingNote}</Txt> : null}
        </Card>

        <Section title={copy.howTitle}>
          <Card style={{ gap: 12 }}>{[copy.how1, copy.how2, copy.how3].map((step, i) => <View key={step} style={styles.rewardRow}>
            <View style={styles.stepDot}><Txt variant="label" color={palette.white}>{i + 1}</Txt></View><Txt variant="body" style={{ flex: 1 }}>{step}</Txt>
          </View>)}</Card>
        </Section>
      </>}
  </Screen>;
}

function Stat({ label, value, color, glyph }: { label: string; value: string; color: string; glyph: string }) {
  return <View style={[styles.stat, shadow(undefined, 0.4)]} accessible accessibilityLabel={`${label}: ${value}`}>
    <GlyphIcon glyph={mdi(glyph)} size={18} color={color} />
    <Txt variant="metric">{value}</Txt>
    <Txt variant="label" color={palette.inkMuted} numberOfLines={2}>{label}</Txt>
  </View>;
}

/** Milestone progress (timing animation, no bounce). */
function MilestoneBar({ progress }: { progress: number }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(width, { toValue: progress, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [progress, width]);
  return <View style={styles.bar}><Animated.View style={[styles.barFill, { width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}>
    <LinearGradient colors={['#8BE04E', '#5BA82E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
  </Animated.View></View>;
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: 20, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(99,216,255,0.22)' },
  codeBox: { alignSelf: 'flex-start', marginTop: 8, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(99,216,255,0.6)' },
  code: { fontSize: 30, lineHeight: 36, letterSpacing: 2 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 14 },
  stat: { flex: 1, backgroundColor: palette.surface, borderRadius: radius.lg, padding: 12, gap: 4 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rewardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 10, borderRadius: 5, backgroundColor: 'rgba(34,184,245,0.12)', overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5, overflow: 'hidden' },
  stepDot: { width: 26, height: 26, borderRadius: 9, backgroundColor: palette.violet, alignItems: 'center', justifyContent: 'center' },
});

import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { GlyphIcon, mdi, PressableScale, Txt } from '@/components';
import { useLabels } from '@/components/cards';
import { Skeleton } from '@/components/feedback';
import { BottomSheet, LinkRow, ToggleRow } from '@/components/inputs';
import { HeightRuler, heightReadout, UnitToggle, WeightRuler, weightReadout } from '@/components/bodyMetrics';
import { GradientButton } from '@/components';
import { useUnitSystem } from '@/hooks/useUnits';
import { formatHeight, formatWeight } from '@/utils/units';
import { Card, Header, Screen, Section } from '@/components/layout';
import { useAccess, usePreferences, useProfile, useUpdateBodyMetrics, useUpdatePreferences } from '@/hooks/queries';
import { format, useI18n } from '@/i18n';
import { RootStackParamList } from '@/navigation/types';
import { useSession } from '@/store/session';
import { gradients, palette, radius, scenes, shadow, useLayout } from '@/theme';
import { Access } from '@/types/domain';
import { AssetImage } from '@/components/AssetImage';
import { AppImages } from '@/assets';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { account, signOut } = useSession();
  const { meta } = useI18n();
  const { dictionary, difficulty, equipment } = useLabels();
  const copy = dictionary.profile;
  const profile = useProfile();
  const access = useAccess();
  const prefs = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const p = profile.data;
  const system = useUnitSystem();
  const [bodyOpen, setBodyOpen] = useState(false);
  const goalTitle = p?.goal ? dictionary.onboarding.goal.options[p.goal].title : '—';
  const initials = `${account?.firstName?.[0] ?? ''}${account?.lastName && account.lastName !== '-' ? account.lastName[0] : ''}`.toUpperCase() || (account?.email[0] ?? '?').toUpperCase();

  const logout = () => Alert.alert(copy.logoutConfirm, undefined, [{ text: dictionary.common.cancel, style: 'cancel' }, { text: copy.logout, style: 'destructive', onPress: () => signOut() }]);

  const unitsLabel = prefs.data?.units === 'imperial' ? dictionary.units.imperial : prefs.data?.units === 'metric' ? dictionary.units.metric : `${dictionary.units.auto} · ${system === 'imperial' ? dictionary.units.imperial : dictionary.units.metric}`;

  return <Screen scene={scenes.violet} header={<Header title={copy.title} onBack={() => navigation.goBack()} />} refreshing={profile.isRefetching} onRefresh={() => { profile.refetch(); access.refetch(); prefs.refetch(); }}>

    <View style={[styles.cover, shadow('#2B2370', 1.2)]}>
      <AssetImage asset={AppImages.profileCover} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(17,17,54,0.35)', 'rgba(17,17,54,0.85)']} style={StyleSheet.absoluteFill} />
      <View style={styles.coverBody}>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}><Txt variant="title" color={palette.white}>{initials}</Txt></LinearGradient>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt variant="title" color={palette.white} numberOfLines={1}>{[account?.firstName, account?.lastName === '-' ? '' : account?.lastName].filter(Boolean).join(' ') || account?.email}</Txt>
          <Txt variant="small" color="rgba(255,255,255,0.85)" numberOfLines={1}>{account?.email}</Txt>
        </View>
      </View>
      <View style={styles.coverChips}>
        {access.data ? <View style={styles.coverChip}><GlyphIcon glyph={mdi(access.data.status === 'premium' || access.data.status === 'trial' ? 'crown' : 'account-outline')} size={14} color={palette.white} /><Txt variant="label" color={palette.white}>{access.data.status === 'premium' ? dictionary.subscription.premiumActive : access.data.status === 'trial' ? dictionary.subscription.trialActive : dictionary.subscription.free}</Txt></View> : null}
        {p?.goal ? <View style={styles.coverChip}><GlyphIcon glyph={mdi('target')} size={14} color={palette.white} /><Txt variant="label" color={palette.white}>{goalTitle}</Txt></View> : null}
        {account && !account.emailVerified ? <View style={[styles.coverChip, { backgroundColor: 'rgba(255,155,66,0.9)' }]}><GlyphIcon glyph={mdi('email-alert-outline')} size={14} color={palette.white} /><Txt variant="label" color={palette.white}>{copy.emailUnverified}</Txt></View> : null}
      </View>
    </View>

    <SubscriptionCard access={access.data} onPress={() => navigation.navigate('Upgrade')} />

    <Section title={copy.myPreferences} action={dictionary.common.edit} onAction={() => navigation.navigate('TrainingPreferences')}>
      {profile.isLoading ? <Skeleton height={150} round={radius.lg} /> : <PressableScale onPress={() => navigation.navigate('TrainingPreferences')} scaleTo={0.99}>
        <Card style={styles.prefGrid}>
          <Pref label={copy.goal} value={goalTitle} glyph={mdi('bullseye-arrow')} color={palette.violet} />
          <Pref label={copy.experience} value={p?.experience ? difficulty(p.experience) : '—'} glyph={mdi('signal-cellular-2')} color={palette.orange} />
          <Pref label={copy.days} value={p ? format(copy.perWeek, { count: p.daysPerWeek }) : '—'} glyph={mdi('calendar-week')} color={palette.coral} />
          <Pref label={copy.duration} value={p ? `${p.availableMinutes} ${dictionary.common.min}` : '—'} glyph={mdi('timer-outline')} color={palette.blue} />
          <View style={{ width: '100%' }}><Pref label={copy.equipment} value={p?.equipment.length ? p.equipment.map(equipment).join(', ') : '—'} glyph={mdi('dumbbell')} color={palette.inkSoft} /></View>
        </Card>
      </PressableScale>}
    </Section>

    <Section title={dictionary.units.height + ' · ' + dictionary.units.weight} action={dictionary.common.edit} onAction={() => setBodyOpen(true)}>
      <PressableScale onPress={() => setBodyOpen(true)} scaleTo={0.99} testID="profile-body">
        <Card style={styles.prefGrid}>
          <Pref label={copy.height} value={formatHeight(p?.heightCm, system)} glyph={mdi('human-male-height')} color="#0FA89C" />
          <Pref label={copy.weight} value={formatWeight(p?.weightKg ?? p?.bodyWeightKg, system)} glyph={mdi('scale-bathroom')} color={palette.pink} />
        </Card>
      </PressableScale>
    </Section>

    <Section title={copy.activity}><Card padded={false} style={[styles.menu, { marginTop: 0 }]}>
      <LinkRow title={dictionary.activity.history} glyph={mdi('run-fast')} color={palette.aqua} onPress={() => navigation.navigate('ActivityHistory')} />
      <LinkRow title={copy.achievements} glyph={mdi('medal-outline')} color={palette.orange} onPress={() => navigation.navigate('Achievements')} />
      <LinkRow title={copy.favorites} glyph={mdi('heart-outline')} color={palette.coral} onPress={() => navigation.navigate('Favorites')} />
      <LinkRow title={copy.history} glyph={mdi('history')} color={palette.blue} onPress={() => navigation.navigate('History')} />
    </Card></Section>

    <Section title={copy.settings}>
      <Card padded={false} style={styles.menu}>
        <LinkRow title={copy.referEarn} value={copy.referEarnBody} glyph={mdi('gift-outline')} color={palette.lime} onPress={() => navigation.navigate('ReferEarn')} />
        <LinkRow title={copy.language} value={meta.native} glyph={mdi('translate')} color={palette.violet} onPress={() => navigation.navigate('LanguageSettings')} />
        <LinkRow title={copy.notifications} glyph={mdi('bell-outline')} color={palette.orange} onPress={() => navigation.navigate('NotificationSettings')} />
        <ToggleRow title={copy.restTimer} glyph={mdi('timer-sand')} color={palette.blue} value={prefs.data?.restTimerEnabled ?? true} onChange={(restTimerEnabled) => updatePrefs.mutate({ restTimerEnabled })} />
        <ToggleRow title={copy.audioCues} subtitle={copy.audioCuesBody} glyph={mdi('volume-high')} color="#0FA89C" value={prefs.data?.audioCues ?? true} onChange={(audioCues) => updatePrefs.mutate({ audioCues })} />
        <LinkRow title={copy.units} value={unitsLabel} glyph={mdi('ruler')} color={palette.pink} onPress={() => navigation.navigate('Units')} />
        <LinkRow title={dictionary.activity.settings} glyph={mdi('run')} color={palette.aqua} onPress={() => navigation.navigate('ActivitySettings')} />
        <LinkRow title={dictionary.activity.connectedApps} glyph={mdi('heart-pulse')} color={palette.pink} onPress={() => navigation.navigate('ConnectedHealth')} />
      </Card>
    </Section>

    {/* Free utilities: available to every account, never gated by Pro or the trial. */}
    <Section title={copy.utilities}><Card padded={false} style={[styles.menu, { marginTop: 0 }]}>
      <LinkRow title={copy.waterIntake} glyph={mdi('water-outline')} color={palette.sky} onPress={() => navigation.navigate('WaterIntake')} />
      <LinkRow title={copy.stopwatch} glyph={mdi('timer-outline')} color={palette.violet} onPress={() => navigation.navigate('Stopwatch')} />
    </Card></Section>

    <Section title={copy.support}><Card padded={false} style={[styles.menu, { marginTop: 0 }]}>
      <LinkRow title={copy.privacy} glyph={mdi('shield-lock-outline')} color={palette.inkSoft} onPress={() => navigation.navigate('Legal', { topic: 'privacy' })} />
      <LinkRow title={copy.terms} glyph={mdi('file-document-outline')} color={palette.inkSoft} onPress={() => navigation.navigate('Legal', { topic: 'terms' })} />
      <LinkRow title={copy.help} glyph={mdi('lifebuoy')} color={palette.inkSoft} onPress={() => navigation.navigate('Legal', { topic: 'help' })} />
      <LinkRow title={copy.logout} glyph={mdi('logout')} danger onPress={logout} />
    </Card></Section>
    <Txt variant="small" color={palette.inkFaint} align="center" style={{ marginTop: 20 }}>{format(copy.version, { version: Constants.expoConfig?.version ?? '0.1.0' })}</Txt>
    {bodyOpen ? <BodyMetricsSheet heightCm={p?.heightCm} weightKg={p?.weightKg ?? p?.bodyWeightKg} onClose={() => setBodyOpen(false)} /> : null}
  </Screen>;
}

/**
 * Edit height + weight in the selected units. Only a value the user actually moved is converted
 * back (once) and saved in cm / kg — opening and closing never rewrites the stored numbers.
 */
function BodyMetricsSheet({ heightCm, weightKg, onClose }: { heightCm?: number; weightKg?: number; onClose: () => void }) {
  const { dictionary } = useI18n();
  const system = useUnitSystem();
  const save = useUpdateBodyMetrics();
  const { contentWidth } = useLayout();
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const h = height ?? heightCm ?? 170;
  const w = weight ?? weightKg ?? 70;
  const hr = heightReadout(h, system);
  const wr = weightReadout(w, system);
  const changed = height != null || weight != null;
  return <BottomSheet visible onClose={onClose} title={`${dictionary.units.height} · ${dictionary.units.weight}`}
    footer={<GradientButton testID="body-save" label={dictionary.common.save} icon="check" disabled={!changed} loading={save.isPending} onPress={() => save.mutate({ heightCm: height ?? undefined, weightKg: weight ?? undefined }, { onSuccess: onClose })} />}>
    <View style={{ gap: 14 }}>
      <UnitToggle kind="height" system={system} accent={palette.violet} />
      <View style={styles.bodyRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="label" color={palette.inkMuted}>{dictionary.units.height}</Txt>
          <Txt variant="number" testID="body-height">{hr.value}{hr.unit ? ` ${hr.unit}` : ''}</Txt>
        </View>
        <View style={{ width: 110, alignItems: 'center' }}><HeightRuler cm={h} onChange={setHeight} system={system} accent={palette.violet} length={200} label={dictionary.units.height} /></View>
      </View>
      <View style={{ gap: 4 }}>
        <Txt variant="label" color={palette.inkMuted}>{dictionary.units.weight}</Txt>
        <Txt variant="number" testID="body-weight">{wr.value} {wr.unit}</Txt>
        <WeightRuler kg={w} onChange={setWeight} system={system} accent={palette.violet} length={contentWidth - 40} label={dictionary.units.weight} />
      </View>
    </View>
  </BottomSheet>;
}

function SubscriptionCard({ access, onPress }: { access?: Access; onPress: () => void }) {
  const { dictionary } = useI18n();
  const copy = dictionary.subscription;
  const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');
  const [title, body] = !access ? ['', ''] : access.status === 'premium' ? [copy.premiumActive, format(copy.premiumUntil, { date: date(access.premiumUntil) })] : access.status === 'trial' ? [copy.trialActive, format(copy.trialEnds, { date: date(access.trialEndsAt) })] : access.status === 'expired' ? [copy.expired, copy.expiredBody] : access.trialEligible && access.trialDays > 0 ? [format(copy.heroTitle, { days: access.trialDays }), copy.trialNote] : [copy.free, copy.freeBody];
  return <PressableScale onPress={onPress} scaleTo={0.98} containerStyle={{ marginTop: 14 }} accessibilityLabel={dictionary.profile.subscription}>
    <LinearGradient colors={['#1A1408', '#0E1220', '#0B1220']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.sub, shadow(palette.yellow, 0.35)]}>
      <View style={styles.subIcon}><GlyphIcon glyph={mdi('crown')} size={24} color={palette.yellow} /></View>
      <View style={{ flex: 1 }}>
        <Txt variant="overline" color={palette.yellow}>{dictionary.profile.subscription.toUpperCase()}</Txt>
        {access ? <><Txt variant="h3" color={palette.ink}>{title}</Txt><Txt variant="small" color={palette.inkMuted}>{body}</Txt></> : <Skeleton width={140} />}
      </View>
      <GlyphIcon glyph={mdi('chevron-right')} size={22} color={palette.inkFaint} />
    </LinearGradient>
  </PressableScale>;
}

function Pref({ label, value, glyph, color }: { label: string; value: string; glyph: ReturnType<typeof mdi>; color: string }) {
  return <View style={styles.pref}>
    <View style={[styles.prefIcon, { backgroundColor: `${color}18` }]}><GlyphIcon glyph={glyph} size={18} color={color} /></View>
    <View style={{ flex: 1 }}><Txt variant="label" color={palette.inkMuted}>{label}</Txt><Txt variant="row" numberOfLines={2}>{value}</Txt></View>
  </View>;
}

const styles = StyleSheet.create({
  bodyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cover: { marginTop: 16, height: 170, borderRadius: radius.xl, overflow: 'hidden', justifyContent: 'space-between', backgroundColor: palette.ink, padding: 16 },
  coverBody: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  coverChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  coverChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: palette.surface, borderRadius: radius.lg, padding: 16, marginTop: 18 },
  avatar: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' },
  unverified: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(255,209,102,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
  sub: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.lg, padding: 16, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,209,102,0.30)' },
  subIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,209,102,0.12)', borderWidth: 1, borderColor: 'rgba(255,209,102,0.35)', alignItems: 'center', justifyContent: 'center' },
  prefGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  pref: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 8 },
  prefIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menu: { marginTop: 16, paddingVertical: 4 },
});

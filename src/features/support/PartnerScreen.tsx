import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientButton, Txt } from '@/components';
import { CheckBadge } from '@/components/primitives';
import { SecondaryButton } from '@/components/buttons';
import { Icon, IconName } from '@/components/Icon';
import { FilterChip, TextField } from '@/components/inputs';
import { Header, Screen, Section } from '@/components/layout';
import { format, useI18n } from '@/i18n';
import { RootScreenProps } from '@/navigation/types';
import { useRepos } from '@/store/session';
import { palette, radius, scenes, shadow } from '@/theme';
import { brandGradient, logoPalette } from '@/theme/brandAccent';
import { PARTNER_BUDGETS, PARTNER_TYPES, PartnerBudget, PartnerType, SubmissionReceipt } from '@/types/support';
import { haptics } from '@/utils/haptics';
import { SupportScope, accent, isEmail, newClientId, SuccessPanel, TextArea, useSupportError } from './shared';

const TYPE_ICONS: Record<PartnerType, IconName> = {
  BRAND_ADVERTISING: 'megaphone', SPONSORED_STORIES: 'sparkle', AFFILIATE: 'link', MEMBER_OFFERS: 'offer', SPONSORED_CHALLENGES: 'trophy', OTHER: 'lightbulb',
};
/** The collaboration models shown as cards (OTHER is only a form option). */
const SHOWCASE: PartnerType[] = ['BRAND_ADVERTISING', 'SPONSORED_STORIES', 'AFFILIATE', 'MEMBER_OFFERS', 'SPONSORED_CHALLENGES'];

const PHONE = /^\+?[0-9 ()-]{6,24}$/;
const WEBSITE = /^(https?:\/\/)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+(\/\S*)?$/;

/**
 * Profile → Advertise & Collaborate. Presents possible collaboration models (not guaranteed ad products, no
 * audience or performance claims) and collects a business inquiry for the partnerships team.
 */
export function PartnerScreen({ navigation }: RootScreenProps<'PartnerWithUs'>) {
  const { dictionary } = useI18n();
  const copy = dictionary.support;
  const p = copy.partner;
  const { support } = useRepos();
  const errorText = useSupportError();
  const clientId = useRef(newClientId());
  const [form, setForm] = useState({ company: '', name: '', email: '', phone: '', website: '', message: '' });
  const [types, setTypes] = useState<PartnerType[]>([]);
  const [budget, setBudget] = useState<PartnerBudget | null>(null);
  const [consent, setConsent] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const errors = {
    company: form.company.trim().length < 2 ? copy.form.required : undefined,
    name: form.name.trim().length < 2 ? copy.form.required : undefined,
    email: !form.email.trim() ? copy.form.required : !isEmail(form.email) ? copy.form.invalidEmail : undefined,
    phone: form.phone.trim() && !PHONE.test(form.phone.trim()) ? p.invalidPhone : undefined,
    website: form.website.trim() && !WEBSITE.test(form.website.trim()) ? p.invalidWebsite : undefined,
    types: !types.length ? p.pickInterest : undefined,
    message: form.message.trim().length < 20 ? (form.message.trim() ? format(copy.form.tooShort, { count: 20 }) : copy.form.required) : undefined,
    consent: !consent ? p.consentRequired : undefined,
  };
  const shown = (key: keyof typeof errors) => (showErrors ? errors[key] : undefined);

  const submit = async () => {
    if (busy) return;
    if (Object.values(errors).some(Boolean)) { setShowErrors(true); haptics.warning(); return; }
    setBusy(true);
    try {
      const result = await support.sendPartnerInquiry({
        clientId: clientId.current, companyName: form.company.trim(), contactName: form.name.trim(), contactEmail: form.email.trim(),
        contactPhone: form.phone.trim() || undefined, website: form.website.trim() || undefined, collaborationTypes: types,
        budgetRange: budget ?? undefined, message: form.message.trim(), consentToContact: consent,
      });
      haptics.success();
      setReceipt(result);
    } catch (error) {
      haptics.error();
      Alert.alert(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  if (receipt) return <Screen scene={scenes.violet} header={<Header title={p.title} onBack={() => navigation.goBack()} />}>
    <SuccessPanel title={p.sent} body={format(p.sentBody, { reference: receipt.reference })}>
      <SecondaryButton label={copy.done} color={accent} onPress={() => navigation.goBack()} />
    </SuccessPanel>
  </Screen>;

  return <SupportScope><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen scene={scenes.violet} header={<Header onBack={() => navigation.goBack()} />}>
      <View style={styles.hero}>
        <LinearGradient colors={brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.heroIcon, shadow(logoPalette.orange, 1)]}>
          <Icon name="handshake" size="lg" color={palette.white} />
        </LinearGradient>
        <Txt variant="display">{p.title}</Txt>
        <Txt variant="body" color={palette.inkMuted}>{p.intro}</Txt>
      </View>

      <Section title={p.opportunities}>
        <View style={{ gap: 10 }}>
          {SHOWCASE.map((type) => <View key={type} style={styles.card}>
            <View style={styles.cardIcon}><Icon name={TYPE_ICONS[type]} size="sm" color={accent} /></View>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="row">{p.types[type]}</Txt>
              <Txt variant="small" color={palette.inkMuted}>{p.typeBodies[type]}</Txt>
            </View>
          </View>)}
          <View style={styles.disclaimer}><Icon name="info" size="sm" color={palette.inkMuted} /><Txt variant="small" color={palette.inkMuted} style={{ flex: 1 }}>{p.disclaimer}</Txt></View>
        </View>
      </Section>

      <Section title={p.formTitle}>
        <View style={styles.form}>
          <TextField testID="partner-company" label={p.company} value={form.company} onChangeText={set('company')} maxLength={160} autoCapitalize="words" error={shown('company')} />
          <TextField testID="partner-name" label={p.contactName} value={form.name} onChangeText={set('name')} maxLength={120} autoCapitalize="words" autoComplete="name" error={shown('name')} />
          <TextField testID="partner-email" label={p.workEmail} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={shown('email')} />
          <TextField testID="partner-phone" label={p.phone} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" maxLength={24} error={shown('phone')} />
          <TextField testID="partner-website" label={p.website} value={form.website} onChangeText={set('website')} keyboardType="url" autoCapitalize="none" maxLength={300} error={shown('website')} />
          <View style={{ gap: 8 }}>
            <Txt variant="label" color={palette.inkSoft}>{p.interests}</Txt>
            <View style={styles.chips}>{PARTNER_TYPES.map((type) => <FilterChip key={type} label={p.types[type]} active={types.includes(type)} color={accent}
              onPress={() => setTypes((current) => (current.includes(type) ? current.filter((t) => t !== type) : [...current, type]))} />)}</View>
            <Txt variant="small" color={shown('types') ? palette.danger : palette.inkMuted}>{shown('types') ?? p.interestsHint}</Txt>
          </View>
          <View style={{ gap: 8 }}>
            <Txt variant="label" color={palette.inkSoft}>{p.budget}</Txt>
            <View style={styles.chips}>{PARTNER_BUDGETS.map((b) => <FilterChip key={b} label={p.budgets[b]} active={budget === b} color={accent} onPress={() => setBudget(budget === b ? null : b)} />)}</View>
          </View>
          <TextArea testID="partner-message" label={p.message} placeholder={p.messagePlaceholder} value={form.message} onChangeText={set('message')} maxLength={4000} error={shown('message')} />
          <Pressable testID="partner-consent" accessibilityRole="checkbox" accessibilityState={{ checked: consent }} accessibilityLabel={p.consent} onPress={() => { haptics.selection(); setConsent(!consent); }} style={styles.consent}>
            <CheckBadge visible={consent} color={accent} size={24} ring />
            <Txt variant="small" color={palette.inkSoft} style={{ flex: 1 }}>{p.consent}</Txt>
          </Pressable>
          {shown('consent') ? <Txt variant="small" color={palette.danger}>{shown('consent')}</Txt> : null}
          <GradientButton testID="partner-submit" label={p.submit} icon="send" gradient={brandGradient} loading={busy} haptic={null} onPress={submit} />
        </View>
      </Section>
    </Screen>
  </KeyboardAvoidingView></SupportScope>;
}

const styles = StyleSheet.create({
  hero: { gap: 10 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: palette.surface, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  cardIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: `${accent}1A`, borderWidth: 1, borderColor: `${accent}40` },
  disclaimer: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingHorizontal: 4, paddingTop: 4 },
  form: { gap: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  consent: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
});

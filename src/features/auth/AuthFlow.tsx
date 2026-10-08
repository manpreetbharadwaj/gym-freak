import React, { useEffect, useState } from 'react';
import { I18nManager, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { ApiError } from '@/api/client';
import { AppLogo, GlyphIcon, mdi, Txt } from '@/components';
import { FirstRunBackground, firstRunTheme, PremiumCTA, PremiumScreenHeader } from '@/components/firstRun';
import { format, useI18n } from '@/i18n';
import { useSession } from '@/store/session';
import { fonts, gutter, radius } from '@/theme';
import { haptics } from '@/utils/haptics';
import { clearPendingReferral, pendingReferral } from '@/services/storage/pendingLink';
import { ReferralSource } from '@/types/domain';

export type AuthMode = 'signUp' | 'signIn' | 'forgot' | 'reset' | 'verify';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Maps HealthyMe auth failures onto friendly, translated copy. */
function authError(error: unknown, copy: ReturnType<typeof useI18n>['dictionary']['auth']['errors'], mode: AuthMode) {
  if (error instanceof ApiError) {
    if (error.kind === 'network') return copy.network;
    if (error.kind === 'rate-limited') return copy.rateLimited;
    if (error.kind === 'conflict') return copy.exists;
    if (error.kind === 'unauthorized') return copy.invalid;
    if (error.kind === 'validation' || error.kind === 'not-found') return mode === 'reset' || mode === 'verify' ? copy.tokenInvalid : mode === 'signIn' ? copy.invalid : copy.generic;
  }
  return mode === 'signIn' ? copy.invalid : copy.generic;
}

export function AuthFlow({ initialMode = 'signUp', resetToken, onAuthenticated }: { initialMode?: AuthMode; resetToken?: string; onAuthenticated: (isNewAccount: boolean) => void }) {
  const { dictionary } = useI18n();
  const copy = dictionary.auth;
  const { signIn, signUp, repos } = useSession();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  // Optional referral code: typed, or prefilled from an invite / shared-exercise link opened before sign-up.
  const [referral, setReferral] = useState('');
  const [referralSource, setReferralSource] = useState<ReferralSource>('CODE');
  const [prefilled, setPrefilled] = useState<string | null>(null);
  const [referralError, setReferralError] = useState('');
  useEffect(() => { pendingReferral().then((p) => { if (p) { setReferral(p.code); setReferralSource(p.source); setPrefilled(p.code); } }).catch(() => undefined); }, []);
  const set = (key: keyof typeof form) => (value: string) => { setForm((f) => ({ ...f, [key]: value })); setError(''); };
  const go = (next: AuthMode) => { setMode(next); setError(''); setNotice(''); };

  const validate = (): string | null => {
    const email = form.email.trim();
    if (mode !== 'reset' && !email) return copy.errors.required;
    if (mode !== 'reset' && !emailPattern.test(email)) return copy.errors.email;
    if (mode === 'forgot') return null;
    if (!form.password || (mode === 'signUp' && !form.firstName.trim())) return copy.errors.required;
    if (mode !== 'signIn' && form.password.length < 8) return copy.errors.passwordLength;
    if ((mode === 'signUp' || mode === 'reset') && form.password !== form.confirm) return copy.errors.mismatch;
    return null;
  };

  const submit = async () => {
    const problem = validate();
    if (problem) { haptics.press(); setError(problem); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const email = form.email.trim().toLowerCase();
      if (mode === 'signUp') {
        const code = referral.trim().toUpperCase();
        // A mistyped code is caught before the account exists; if the check itself can’t run, sign-up still goes ahead.
        if (code && !(await repos.gym.validateReferralCode(code).catch(() => true))) { setReferralError(dictionary.referral.invalidCode); haptics.press(); return; }
        await signUp({ firstName: form.firstName.trim(), lastName: form.lastName.trim(), email, password: form.password });
        if (code) {
          const source = code === prefilled ? referralSource : 'CODE';
          // Attribution only: the server records it as PENDING and decides later whether it qualifies.
          await repos.gym.claimReferral(code, source).then(() => { clearPendingReferral(); if (source === 'EXERCISE_SHARE') repos.gym.trackShare('exercise_share_signup', undefined, code); }).catch(() => undefined);
        }
        haptics.success(); go('verify');
      }
      else if (mode === 'signIn') { await signIn({ email, password: form.password }); haptics.success(); onAuthenticated(false); }
      else if (mode === 'forgot') { await repos.auth.requestPasswordReset(email); setNotice(copy.linkSent); }
      else if (mode === 'reset' && resetToken) { await repos.auth.resetPassword(resetToken, form.password); setForm((f) => ({ ...f, password: '', confirm: '' })); go('signIn'); setNotice(copy.passwordUpdated); }
    } catch (e) {
      setError(authError(e, copy.errors, mode));
    } finally { setBusy(false); }
  };

  const titles: Record<AuthMode, [string, string]> = {
    signUp: [copy.signUpTitle, copy.signUpBody], signIn: [copy.signInTitle, copy.signInBody], forgot: [copy.forgotTitle, copy.forgotBody], reset: [copy.resetTitle, copy.resetBody], verify: [copy.verifyTitle, format(copy.verifyBody, { email: form.email.trim() })],
  };
  const cta = { signUp: copy.signUp, signIn: copy.signIn, forgot: copy.sendLink, reset: copy.savePassword, verify: copy.checked }[mode];

  // Short forms sit centred on the screen; sign-up (long) and verify read top-down.
  const centred = mode === 'signIn' || mode === 'forgot' || mode === 'reset';
  const inlineError = error === copy.errors.required || error === copy.errors.email || error === copy.errors.passwordLength || error === copy.errors.mismatch;

  return <View style={styles.root}>
    <StatusBar style="light" />
    <FirstRunBackground accent={firstRunTheme.accentAlt} />
    <KeyboardAvoidingView style={styles.keyboard} behavior="padding" keyboardVerticalOffset={insets.top}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, centred && styles.centred, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 }]}> 
        <Animated.View key={`auth-header-${mode}`} entering={FadeIn.duration(260).reduceMotion(ReduceMotion.System)}>
          <View style={styles.brand}>
            <AppLogo size={44} rounded />
            {mode === 'forgot' || mode === 'reset' ? <Pressable onPress={() => go('signIn')} accessibilityRole="button" accessibilityLabel={copy.backToSignIn} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><GlyphIcon glyph={mdi(I18nManager.isRTL ? 'chevron-right' : 'chevron-left')} size={19} color={firstRunTheme.text} /><Txt variant="label" color={firstRunTheme.text} style={styles.linkText}>{copy.backToSignIn}</Txt></Pressable> : null}
          </View>
          {mode === 'verify' ? <VerifyArt /> : null}
          <View style={styles.heading}><PremiumScreenHeader title={titles[mode][0]} subtitle={titles[mode][1]} /></View>
        </Animated.View>

        <Animated.View key={`auth-form-${mode}`} entering={FadeIn.duration(300).delay(60).reduceMotion(ReduceMotion.System)}>
          {mode !== 'verify' ? <View style={styles.form}>
            {mode === 'signUp' ? <PremiumAuthInput testID="auth-first-name" label={copy.firstName} placeholder="John" value={form.firstName} onChangeText={set('firstName')} autoCapitalize="words" autoCorrect={false} autoComplete="given-name" textContentType="givenName" returnKeyType="next" error={error === copy.errors.required && !form.firstName.trim() ? error : undefined} /> : null}
            {mode === 'signUp' ? <PremiumAuthInput label={copy.lastName} placeholder="Doe" value={form.lastName} onChangeText={set('lastName')} autoCapitalize="words" autoCorrect={false} autoComplete="family-name" textContentType="familyName" returnKeyType="next" /> : null}
            {mode !== 'reset' ? <PremiumAuthInput testID="auth-email" label={copy.email} placeholder={mode === 'signUp' ? 'john@xyz.com' : undefined} icon={mdi('email-outline')} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" error={error === copy.errors.email || error === copy.errors.exists || (error === copy.errors.required && !form.email.trim()) ? error : undefined} /> : null}
            {mode !== 'forgot' ? <PremiumAuthInput testID="auth-password" label={mode === 'reset' ? copy.newPassword : copy.password} icon={mdi('lock-outline')} value={form.password} onChangeText={set('password')} secure autoCapitalize="none" autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} textContentType={mode === 'signIn' ? 'password' : 'newPassword'} placeholder={mode === 'signIn' ? undefined : copy.passwordHint} error={error === copy.errors.passwordLength || (error === copy.errors.required && !form.password) ? error : undefined} /> : null}
            {mode === 'signUp' || mode === 'reset' ? <PremiumAuthInput testID="auth-confirm-password" label={copy.confirmPassword} placeholder="Re-enter your password" icon={mdi('lock-check-outline')} value={form.confirm} onChangeText={set('confirm')} secure autoCapitalize="none" autoCorrect={false} textContentType="newPassword" error={error === copy.errors.mismatch ? error : undefined} /> : null}
            {mode === 'signUp' ? <PremiumAuthInput testID="auth-referral" label={`${dictionary.referral.codeLabel} (${dictionary.referral.optional})`} icon={mdi('gift-outline')} value={referral} onChangeText={(v) => { setReferral(v.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16)); setReferralError(''); }} autoCapitalize="characters" autoCorrect={false} placeholder={prefilled && referral === prefilled ? dictionary.referral.fromLink : undefined} error={referralError || undefined} /> : null}
            {mode === 'signUp' && prefilled && referral === prefilled ? <Txt variant="label" color={firstRunTheme.accent}>{dictionary.referral.fromLink}</Txt> : null}
            {mode === 'signIn' ? <Pressable onPress={() => go('forgot')} style={({ pressed }) => [styles.forgot, pressed && styles.pressed]} accessibilityRole="button"><Txt variant="label" color={firstRunTheme.accent} style={styles.linkText}>{copy.forgot}</Txt></Pressable> : null}
          </View> : null}

          {error && !inlineError ? <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.banner, styles.errorBanner]}><GlyphIcon glyph={mdi('alert-circle')} size={19} color={firstRunTheme.danger} /><Txt variant="small" color={firstRunTheme.danger} style={styles.bannerText}>{error}</Txt></View> : null}
          {notice ? <View accessibilityLiveRegion="polite" style={[styles.banner, styles.noticeBanner]}><GlyphIcon glyph={mdi('check-circle')} size={19} color={firstRunTheme.accentCool} /><Txt variant="small" color={firstRunTheme.accentCool} style={styles.bannerText}>{notice}</Txt></View> : null}

          <PremiumCTA label={cta} loading={busy} onPress={mode === 'verify' ? async () => { setBusy(true); try { const me = await repos.auth.me(); if (me.emailVerified) { haptics.success(); onAuthenticated(true); } else setNotice(format(copy.verifyBody, { email: me.email })); } catch { onAuthenticated(true); } finally { setBusy(false); } } : submit} style={{ marginTop: 22 }} />

          {mode === 'verify' ? <Pressable onPress={() => onAuthenticated(true)} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} accessibilityRole="button"><Txt variant="label" color={firstRunTheme.muted} style={styles.linkText}>{copy.verifyLater}</Txt></Pressable> : null}
          {mode === 'signUp' || mode === 'signIn' ? <View style={styles.switchRow}>
            <Txt variant="small" color={firstRunTheme.muted}>{mode === 'signUp' ? copy.haveAccount : copy.noAccount}</Txt>
            <Pressable onPress={() => go(mode === 'signUp' ? 'signIn' : 'signUp')} accessibilityRole="button" style={({ pressed }) => [styles.switchLink, pressed && styles.pressed]}><Txt variant="label" color={firstRunTheme.accent} style={styles.linkText}>{mode === 'signUp' ? copy.switchToSignIn : copy.switchToSignUp}</Txt></Pressable>
          </View> : null}
          {mode === 'signUp' ? <Txt variant="small" color={firstRunTheme.faint} align="center" style={styles.terms}>{copy.terms}</Txt> : null}
        </Animated.View>

      </ScrollView>
    </KeyboardAvoidingView>
  </View>;
}

function VerifyArt() {
  return <View style={styles.verifyArt}>
    <GlyphIcon glyph={mdi('email-fast-outline')} size={28} color={firstRunTheme.accent} />
  </View>;
}

function PremiumAuthInput({ label, error, icon, secure, ...props }: TextInputProps & { label: string; error?: string; icon?: { set: 'mdi' | 'ion'; name: string }; secure?: boolean }) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const { dictionary, meta } = useI18n();
  const direction = meta.rtl && props.keyboardType !== 'email-address' ? 'right' : 'left';
  return <View style={styles.inputRoot}>
    <Txt variant="label" color={firstRunTheme.text} style={styles.inputLabel}>{label}</Txt>
    <View style={[styles.inputField, focused && styles.inputFocused, error && styles.inputInvalid]}>
      {icon ? <GlyphIcon glyph={icon} size={20} color={error ? firstRunTheme.danger : focused ? firstRunTheme.accent : firstRunTheme.muted} /> : null}
      <TextInput
        {...props}
        secureTextEntry={secure ? hidden : props.secureTextEntry}
        accessibilityLabel={label}
        accessibilityHint={error || props.accessibilityHint}
        placeholderTextColor="rgba(255,255,255,0.38)"
        selectionColor={firstRunTheme.accent}
        onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
        style={[styles.authInput, { textAlign: direction }, props.style]}
      />
      {secure ? <Pressable
        onPress={() => setHidden(!hidden)}
        accessibilityRole="button"
        accessibilityLabel={hidden ? dictionary.common.showPassword : dictionary.common.hidePassword}
        testID={props.testID ? `${props.testID}-reveal` : undefined}
        style={({ pressed }) => [styles.reveal, pressed && styles.pressed]}
      ><GlyphIcon glyph={mdi(hidden ? 'eye-outline' : 'eye-off-outline')} size={21} color={firstRunTheme.muted} /></Pressable> : null}
    </View>
    {error ? <View accessibilityLiveRegion="polite"><Txt variant="small" color={firstRunTheme.danger}>{error}</Txt></View> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: firstRunTheme.background },
  keyboard: { flex: 1 },
  content: { paddingHorizontal: gutter, maxWidth: 520, width: '100%', alignSelf: 'center' },
  centred: { flexGrow: 1, justifyContent: 'center' },
  brand: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, minHeight: 44 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 8, flexShrink: 1, borderRadius: radius.sm },
  heading: { marginTop: 28 },
  form: { marginTop: 28, gap: 18 },
  forgot: { alignSelf: 'flex-end', justifyContent: 'center', minHeight: 44, paddingHorizontal: 6, marginTop: -10, borderRadius: radius.sm },
  linkText: { fontSize: 13, lineHeight: 19, letterSpacing: 0, flexShrink: 1 },
  pressed: { opacity: 0.66 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderWidth: 1, borderRadius: radius.sm, marginTop: 18 },
  bannerText: { flex: 1, minWidth: 0 },
  errorBanner: { backgroundColor: 'rgba(255,143,157,0.1)', borderColor: 'rgba(255,143,157,0.36)' },
  noticeBanner: { backgroundColor: 'rgba(82,228,255,0.08)', borderColor: 'rgba(82,228,255,0.28)' },
  switchRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 5, marginTop: 16 },
  switchLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4, maxWidth: '100%' },
  secondary: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', padding: 12, marginTop: 10 },
  terms: { marginTop: 20, paddingHorizontal: 12 },
  verifyArt: { alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', width: 58, height: 58, borderRadius: radius.md, backgroundColor: firstRunTheme.surface, borderWidth: 1, borderColor: firstRunTheme.lineStrong, marginTop: 32 },
  inputRoot: { gap: 8, minWidth: 0 },
  inputLabel: { fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  // Focus only changes values, never which style keys exist: adding shadow keys on focus made iOS
  // (new architecture) rebuild the container, which remounted the TextInput and dropped focus.
  inputField: { minHeight: 56, borderRadius: 16, backgroundColor: firstRunTheme.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: firstRunTheme.lineStrong, shadowColor: firstRunTheme.accent, shadowOpacity: 0, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  inputFocused: { borderColor: firstRunTheme.accent, backgroundColor: firstRunTheme.surfaceRaised, shadowOpacity: 0.14 },
  inputInvalid: { borderColor: firstRunTheme.danger, backgroundColor: 'rgba(255,143,157,0.08)' },
  authInput: { flex: 1, minWidth: 0, minHeight: 52, fontFamily: fonts.medium, fontSize: 15, color: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 0 },
  reveal: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginEnd: -8, borderRadius: 12 },
});

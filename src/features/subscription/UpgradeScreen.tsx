import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/utils/motion';
import { Animated, Easing, Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLogo, BottomBar, GlyphIcon, mdi, Txt } from '@/components';
import { Skeleton } from '@/components/feedback';
import { keys, useAccess, usePlans } from '@/hooks/queries';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepos } from '@/store/session';
import { format, useI18n } from '@/i18n';
import { purchases, StoreProduct } from '@/services/purchases';
import { fonts, gutter, palette, radius, shadow } from '@/theme';
import { Access, CouponReason, Quote } from '@/types/domain';
import { discountLabel, formatMoney } from '@/utils/money';
import { haptics } from '@/utils/haptics';
import { FirstRunBackground, firstRunTheme, PremiumCTA } from '@/components/firstRun';

const benefitGlyphs = ['dumbbell', 'calendar-star', 'play-box-multiple', 'chart-line', 'star-four-points'];

/**
 * Trial/upgrade screen. Status, trial length and eligibility come from HealthyMe (admin-configured);
 * purchases are offered only when the server says billing is enabled — nothing is faked.
 */
export function UpgradeView({ onContinue, onClose, firstRun = false }: { onContinue: () => void; onClose?: () => void; firstRun?: boolean }) {
  const { dictionary } = useI18n();
  const copy = dictionary.subscription;
  const insets = useSafeAreaInsets();
  const access = useAccess();
  const [notice, setNotice] = useState('');
  const shine = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useEffect(() => { if (reduced) return; const loop = Animated.loop(Animated.timing(shine, { toValue: 1, duration: 2600, useNativeDriver: true })); loop.start(); return () => loop.stop(); }, [reduced, shine]);
  const { gym } = useRepos();
  const client = useQueryClient();
  const [starting, setStarting] = useState(false);
  const a = access.data;
  const days = a?.trialDays ?? 0;

  // Pricing country: the store account's storefront when the store answers, else the device region (a hint only).
  const storeCountry = useQuery({ queryKey: ['store-country'], queryFn: () => purchases.storeCountry(), staleTime: Infinity, retry: false });
  const country = storeCountry.data ? storeCountry.data.country : storeCountry.isError ? null : undefined;
  // Server plans + quote for that country: the price row, coupon / referral discount and total are computed by HealthyMe.
  const plans = usePlans(country);
  const plan = plans.data?.[0];
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<string | null>(null);
  const premiumNow = a?.status === 'premium' || a?.status === 'trial';
  const quote = useQuery({ queryKey: ['quote', plan?.key, coupon, country], queryFn: () => gym.quote(plan!.key, coupon, country), enabled: !!plan && !!a && !premiumNow, staleTime: 0, retry: false });
  const q = quote.data;
  // What the App Store / Google Play will actually charge in this storefront (source of truth for paid checkouts).
  const productId = q?.plan.productIds[0] ?? plan?.productIds[0] ?? null;
  const storeProducts = useQuery({ queryKey: ['store-products', plan?.productIds], queryFn: () => purchases.products(plan!.productIds), enabled: !!plan && !!a?.billingEnabled, staleTime: 10 * 60_000, retry: false });
  const storeProduct = productId ? storeProducts.data?.[productId] ?? null : null;
  const free = !!q && q.finalAmount === 0 && q.totalDiscount > 0;
  const [activating, setActivating] = useState(false);
  // Typing a coupon: lift the screen above the keyboard, bring the card into view, hide the bottom bar.
  const scroller = useRef<ScrollView>(null);
  const cardY = useRef(0);
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const activateFree = async () => {
    if (!plan) return;
    setActivating(true); setNotice('');
    try {
      await gym.checkout(plan.key, coupon, country); // server re-checks everything and grants access (no charge)
      haptics.success();
      await client.invalidateQueries();
      onContinue();
    } catch { setNotice(dictionary.coupon.checkoutFailed); quote.refetch(); } finally { setActivating(false); }
  };
  const verify = (input: Parameters<typeof gym.verifyPurchase>[0]) => gym.verifyPurchase(input);
  const upgrade = async () => {
    setNotice('');
    // Opens a server checkout first (records the storefront's price; its coupon is redeemed when the store purchase is verified).
    const checkout = plan ? await gym.checkout(plan.key, coupon, country).catch(() => null) : null;
    const id = checkout?.productIds[0] ?? productId;
    const result = id ? await purchases.purchase(id, verify) : 'unavailable';
    if (result === 'unavailable') setNotice(q && q.totalDiscount > 0 ? dictionary.coupon.paymentUnavailable : copy.unavailable);
    else if (result === 'pending') setNotice(copy.purchasePending);
    else if (result === 'unverified') setNotice(copy.purchaseUnverified);
    else if (result === 'purchased') { haptics.success(); await client.invalidateQueries(); }
  };
  const restore = async () => {
    setNotice('');
    const result = await purchases.restore(verify);
    setNotice(result === 'unavailable' ? copy.unavailable : result === 'restored' ? copy.restored : copy.nothingToRestore);
    if (result === 'restored') await client.invalidateQueries();
  };
  const startTrial = async () => {
    setStarting(true); setNotice('');
    try {
      client.setQueryData(keys.access, await gym.startTrial());
      // Premium content unlocks everywhere once the server confirms the trial.
      await client.invalidateQueries();
      onContinue();
    } catch { setNotice(copy.trialFailed); access.refetch(); } finally { setStarting(false); }
  };
  const premium = a?.status === 'premium' || a?.status === 'trial';
  const canTrial = !!a && a.status === 'free' && a.trialEligible && a.trialDays > 0;
  const canBuy = !!a?.billingEnabled;

  const cta = (label: string, icon: string, onPress: () => void, extra?: { loading?: boolean; disabled?: boolean }) => <PremiumCTA label={label} icon={icon} onPress={onPress} {...extra} />;
  return <KeyboardAvoidingView style={styles.root} behavior="padding">
    <StatusBar style="light" />
    <FirstRunBackground accent={firstRun ? firstRunTheme.accentAlt : firstRunTheme.accent} />
    <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: keyboard ? 24 : insets.bottom + 170 }]} showsVerticalScrollIndicator={false}>
      {onClose ? <Pressable onPress={onClose} hitSlop={12} style={styles.close} accessibilityRole="button" accessibilityLabel={dictionary.common.close}><GlyphIcon glyph={mdi('close')} size={22} color={palette.white} /></Pressable> : null}
      {firstRun ? <View style={styles.crownWrap}><AppLogo size={88} glow animated rounded /></View> : <View style={styles.crownWrap}>
        <View style={[styles.crownHalo, shadow('#FFB443', 1.2)]}>
          <LinearGradient colors={['#FFE27A', '#FFB443', '#FF8A3D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.crown}><GlyphIcon glyph={mdi('crown')} size={44} color={palette.onAccent} /></LinearGradient>
        </View>
        <Animated.View style={[styles.sparkle, { opacity: shine.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 1, 0.2] }) }]}><GlyphIcon glyph={mdi('star-four-points')} size={20} color="#FFE27A" /></Animated.View>
      </View>}
      <Txt variant="overline" color={firstRun ? firstRunTheme.accentCool : '#FFD166'} align="center" style={{ marginTop: 18 }}>{copy.title.toUpperCase()}</Txt>
      {!a ? <View style={{ alignItems: 'center', gap: 10, marginTop: 10 }}><Skeleton width={260} height={34} style={{ backgroundColor: firstRunTheme.surfaceRaised }} /><Skeleton width={200} style={{ backgroundColor: firstRunTheme.surfaceRaised }} /></View> : <>
        <Txt variant="display" color={palette.white} align="center" style={{ marginTop: 6 }}>{statusTitle(a, copy, days)}</Txt>
        <Txt variant="body" color={firstRunTheme.muted} align="center" style={{ marginTop: 8 }}>{statusBody(a, copy)}</Txt>
      </>}
      {plan && a && !premiumNow ? <View onLayout={(e) => { cardY.current = e.nativeEvent.layout.y; }}><CheckoutCard dark quote={q} store={storeProduct} deviceCountry={storeCountry.data?.source === 'device' ? storeCountry.data.country : null} loading={quote.isFetching} couponInput={couponInput} setCouponInput={setCouponInput} applied={coupon}
        onApply={() => { const code = couponInput.trim().toUpperCase(); if (code) { setCoupon(code); Keyboard.dismiss(); } }} onRemove={() => { setCoupon(null); setCouponInput(''); }}
        onFocus={() => setTimeout(() => scroller.current?.scrollTo({ y: Math.max(0, cardY.current - 24), animated: true }), 250)} /></View> : null}
      <View style={styles.benefits}>{copy.benefits.map((benefit, i) => <View key={benefit} style={styles.benefit}>
        <View style={styles.benefitIcon}><GlyphIcon glyph={mdi(benefitGlyphs[i] ?? 'check')} size={20} color={firstRunTheme.accentCool} /></View>
        <Txt variant="h3" color={palette.white} style={{ flex: 1 }}>{benefit}</Txt>
        <GlyphIcon glyph={mdi('check-circle')} size={20} color={firstRunTheme.accentCool} />
      </View>)}</View>
      {notice ? <View style={styles.notice}><GlyphIcon glyph={mdi('information-outline')} size={18} color={palette.white} /><Txt variant="small" color={palette.white} style={{ flex: 1 }}>{notice}</Txt></View> : null}
    </ScrollView>
    {!keyboard ? <BottomBar background={firstRunTheme.background}>
      {free && !premium ? cta(dictionary.coupon.activateFree, 'sparkles', activateFree, { loading: activating })
        : premium || (!canTrial && !canBuy) ? cta(copy.continue, 'arrow-forward', onContinue, { disabled: !a })
        : canTrial ? cta(format(copy.startTrial, { days }), 'sparkles', startTrial, { loading: starting })
        : cta(copy.upgrade, 'sparkles', upgrade)}
      <View style={styles.links}>
        {!premium && (canTrial || canBuy || free) ? <Pressable onPress={onContinue} hitSlop={8} accessibilityRole="button"><Txt variant="label" color={firstRunTheme.muted}>{copy.continueFree}</Txt></Pressable> : null}
        {canBuy ? <Pressable onPress={restore} hitSlop={8} accessibilityRole="button"><Txt variant="label" color={firstRunTheme.faint}>{copy.restore}</Txt></Pressable> : null}
      </View>
      <Txt variant="label" color={firstRunTheme.faint} align="center" style={{ marginTop: 6 }}>{canTrial ? copy.trialNote : canBuy ? copy.terms : ''}</Txt>
    </BottomBar> : null}
  </KeyboardAvoidingView>;
}

const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : '');
function statusTitle(a: Access, copy: ReturnType<typeof useI18n>['dictionary']['subscription'], days: number) {
  if (a.status === 'trial') return copy.trialActive;
  if (a.status === 'premium') return copy.premiumActive;
  if (a.status === 'expired') return copy.expired;
  return a.trialEligible && days > 0 ? format(copy.heroTitle, { days }) : copy.free;
}
function statusBody(a: Access, copy: ReturnType<typeof useI18n>['dictionary']['subscription']) {
  if (a.status === 'trial') return format(copy.trialEnds, { date: date(a.trialEndsAt) });
  if (a.status === 'premium') return format(copy.premiumUntil, { date: date(a.premiumUntil) });
  if (a.status === 'expired') return copy.expiredBody;
  return a.trialEligible && a.trialDays > 0 ? copy.heroBody : copy.freeBody;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: firstRunTheme.background },
  content: { paddingHorizontal: gutter, maxWidth: 560, width: '100%', alignSelf: 'center' },
  close: { alignSelf: 'flex-end', width: 40, height: 40, borderRadius: 20, backgroundColor: firstRunTheme.surfaceRaised, borderWidth: 1, borderColor: firstRunTheme.line, alignItems: 'center', justifyContent: 'center' },
  crownWrap: { alignItems: 'center', marginTop: 10 },
  crownHalo: { width: 112, height: 112, borderRadius: 56, padding: 12, backgroundColor: 'rgba(255,180,67,0.10)', borderWidth: 1, borderColor: 'rgba(255,209,102,0.28)' },
  crown: { flex: 1, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  sparkle: { position: 'absolute', right: '30%', top: -6 },
  benefits: { marginTop: 28, gap: 10 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: firstRunTheme.surface, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: firstRunTheme.line },
  benefitIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: `${firstRunTheme.accentAlt}20`, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: firstRunTheme.surface, borderWidth: 1, borderColor: firstRunTheme.line, borderRadius: radius.md, padding: 14, marginTop: 16 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 14 },
  checkout: { marginTop: 22, backgroundColor: palette.surface, borderRadius: radius.lg, padding: 16, gap: 12 },
  firstRunCheckout: { backgroundColor: firstRunTheme.surface, borderWidth: 1, borderColor: firstRunTheme.line },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#C9C0FF', paddingHorizontal: 14, fontFamily: fonts.medium, fontSize: 15, letterSpacing: 1, color: palette.ink, backgroundColor: palette.surfaceRaised },
  firstRunCouponInput: { borderColor: firstRunTheme.lineStrong, color: firstRunTheme.text, backgroundColor: firstRunTheme.surfaceRaised },
  applyButton: { height: 48, paddingHorizontal: 18, borderRadius: 14, backgroundColor: palette.violet, alignItems: 'center', justifyContent: 'center' },
  firstRunApplyButton: { backgroundColor: firstRunTheme.accentAlt },
  couponApplied: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  couponTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: palette.violet, backgroundColor: palette.surfaceRaised },
  firstRunCouponTag: { borderColor: firstRunTheme.accentAlt, backgroundColor: `${firstRunTheme.accentAlt}16` },
  couponError: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 12, backgroundColor: palette.surfaceRaised },
  firstRunCouponError: { backgroundColor: `${firstRunTheme.danger}12`, borderWidth: 1, borderColor: `${firstRunTheme.danger}35` },
  breakdown: { gap: 8, paddingTop: 4 },
  divider: { height: 1, backgroundColor: palette.line, marginVertical: 2 },
});

/** Coupon entry + server price breakdown (base, referral reward, coupon, total). */
function CheckoutCard({ quote, store, deviceCountry, loading, couponInput, setCouponInput, applied, onApply, onRemove, onFocus, dark = false }: {
  quote?: Quote; store: StoreProduct | null; deviceCountry: string | null; loading: boolean; couponInput: string; setCouponInput: (v: string) => void; applied: string | null; onApply: () => void; onRemove: () => void; onFocus?: () => void; dark?: boolean;
}) {
  const { dictionary, language } = useI18n();
  const copy = dictionary.coupon;
  const money = (minor: number) => (quote ? formatMoney(minor, quote.currency, language) : '');
  const ok = !!quote?.appliedCoupon && quote.coupon?.valid;
  const check = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (ok) { check.setValue(0); Animated.timing(check, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); } }, [check, ok, quote?.appliedCoupon?.code]);
  const reasonText: Record<CouponReason, string> = {
    NOT_FOUND: copy.invalid, EXPIRED: copy.expired, NOT_STARTED: copy.notStarted, INACTIVE: copy.inactive, LIMIT_REACHED: copy.limit, USER_LIMIT_REACHED: copy.userLimit,
    PLAN_NOT_ELIGIBLE: copy.plan, MIN_PURCHASE: copy.minPurchase, NEW_USERS_ONLY: copy.newUsers, EXISTING_USERS_ONLY: copy.existingUsers, CURRENCY_MISMATCH: copy.currency, NOT_COMBINABLE: copy.notCombinable,
  };
  const problem = quote?.coupon && !quote.coupon.valid && quote.coupon.reason ? reasonText[quote.coupon.reason] : null;
  const sub = dictionary.subscription;
  // The store charges its own localised price. When it differs from the server total (a discount, or an admin
  // price that doesn't mirror the store tier), say exactly what will be charged instead of implying the server total.
  const storeDiffers = !!quote && !!store && quote.payment.required && (store.currency !== quote.currency || (store.priceMinor !== null && store.priceMinor !== quote.finalAmount));
  const regionName = (code: string) => { try { return new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? code; } catch { return code; } };
  return <View style={[styles.checkout, dark && styles.firstRunCheckout, shadow(dark ? firstRunTheme.accentAlt : '#2B1C8F', 0.8)]}>
    <Txt variant="label" color={dark ? firstRunTheme.muted : palette.inkMuted}>{copy.haveCoupon.toUpperCase()}</Txt>
    {ok && quote?.appliedCoupon ? <View style={styles.couponApplied}>
      <View style={[styles.couponTag, dark && styles.firstRunCouponTag]}><GlyphIcon glyph={mdi('ticket-percent-outline')} size={16} color={dark ? firstRunTheme.accent : palette.violet} /><Txt variant="row" color={dark ? firstRunTheme.accent : palette.violet}>{quote.appliedCoupon.code}</Txt></View>
      <View style={{ flex: 1 }}>
        <Txt variant="row" color={dark ? firstRunTheme.text : palette.ink}>{format(copy.off, { value: discountLabel(quote.appliedCoupon, quote.currency, language) })}</Txt>
        <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: check, transform: [{ scale: check.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
          <GlyphIcon glyph={mdi('check-circle')} size={14} color="#22A35A" /><Txt variant="label" color="#22A35A">{copy.applied}</Txt>
        </Animated.View>
      </View>
       <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${copy.remove} ${quote.appliedCoupon.code}`}><Txt variant="label" color={dark ? firstRunTheme.danger : palette.coral}>{copy.remove}</Txt></Pressable>
    </View> : <View style={styles.couponRow}>
      <TextInput value={couponInput} onChangeText={(v) => setCouponInput(v.replace(/\s/g, '').toUpperCase())} placeholder={copy.placeholder} placeholderTextColor={dark ? firstRunTheme.faint : palette.inkFaint} autoCapitalize="characters" autoCorrect={false}
        accessibilityLabel={copy.label} style={[styles.couponInput, dark && styles.firstRunCouponInput]} returnKeyType="done" onSubmitEditing={onApply} onFocus={onFocus} testID="coupon-input" />
      <Pressable onPress={onApply} disabled={!couponInput.trim() || loading} accessibilityRole="button" accessibilityLabel={copy.apply} style={({ pressed }) => [styles.applyButton, dark && styles.firstRunApplyButton, (!couponInput.trim() || loading) && { opacity: 0.5 }, pressed && { transform: [{ scale: 0.97 }] }]}> 
        <Txt variant="button" color={palette.white}>{copy.apply}</Txt>
      </Pressable>
    </View>}
    {problem && applied ? <View style={[styles.couponError, dark && styles.firstRunCouponError]}><GlyphIcon glyph={mdi('alert-circle-outline')} size={16} color={dark ? firstRunTheme.danger : '#C0263A'} /><Txt variant="small" color={dark ? firstRunTheme.danger : '#C0263A'} style={{ flex: 1 }}>{problem}</Txt><Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button"><Txt variant="label" color={dark ? firstRunTheme.muted : palette.inkMuted}>{copy.remove}</Txt></Pressable></View> : null}
    {quote ? <View style={styles.breakdown} accessibilityLabel={copy.breakdown}>
      <Line dark={dark} label={quote.plan.name} value={money(quote.baseAmount)} />
      {quote.referralDiscount > 0 ? <Line dark={dark} label={copy.referralReward} value={`−${money(quote.referralDiscount)}`} accent={palette.lime} /> : null}
      {quote.couponDiscount > 0 ? <Line dark={dark} label={`${dictionary.coupon.label} · ${quote.appliedCoupon?.code ?? ''}`} value={`−${money(quote.couponDiscount)}`} accent={dark ? firstRunTheme.accent : palette.violet} /> : null}
      {quote.appliedCoupon && !quote.appliedCoupon.applied && quote.referralDiscount > 0 ? <Txt variant="label" color={dark ? firstRunTheme.muted : palette.inkMuted}>{copy.referralBetter}</Txt> : null}
      <View style={[styles.divider, dark && { backgroundColor: firstRunTheme.line }]} />
      <Line dark={dark} label={copy.total} value={quote.finalAmount === 0 ? copy.free : money(quote.finalAmount)} strong />
      {store && quote.payment.required ? <Line dark={dark} label={format(sub.storePrice, { store: store.store })} value={store.displayPrice} /> : null}
      {storeDiffers && store ? <Txt variant="label" color={dark ? firstRunTheme.accentCool : palette.accent} testID="store-price-note">{format(quote.totalDiscount > 0 ? sub.storeDiscountNote : sub.storeCharges, { store: store.store, price: store.displayPrice })}</Txt> : null}
      {!store && deviceCountry && quote.payment.required ? <Txt variant="label" color={dark ? firstRunTheme.faint : palette.inkFaint}>{format(sub.deviceRegionNote, { country: regionName(deviceCountry) })}</Txt> : null}
    </View> : loading ? <Skeleton height={60} style={dark ? { backgroundColor: firstRunTheme.surfaceRaised } : undefined} /> : null}
  </View>;
}

const Line = ({ label, value, accent, strong, dark = false }: { label: string; value: string; accent?: string; strong?: boolean; dark?: boolean }) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <Txt variant={strong ? 'h3' : 'small'} color={strong ? (dark ? firstRunTheme.text : palette.ink) : (dark ? firstRunTheme.muted : palette.inkMuted)} style={{ flex: 1 }} numberOfLines={1}>{label}</Txt>
  <Txt variant={strong ? 'metric' : 'row'} color={accent ?? (dark ? firstRunTheme.text : palette.ink)}>{value}</Txt>
</View>;

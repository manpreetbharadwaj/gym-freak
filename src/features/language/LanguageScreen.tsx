import React, { useMemo, useRef, useState } from 'react';
import { I18nManager, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Extrapolation, FadeIn, interpolate, ReduceMotion, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { FlatList } from 'react-native';
import { format, Language, LanguageMeta, languages, useI18n } from '@/i18n';
import { AppLogo, CheckBadge, GlyphIcon, GradientButton, mdi, PressableScale, SelectableSurface, Txt } from '@/components';
import { CountryFlag } from '@/components/CountryFlag';
import { FirstRunBackground, firstRunTheme, PremiumCTA, PremiumScreenHeader, ScreenHeader, SurfaceBackground } from '@/components/firstRun';
import { IconCircle } from '@/components/layout';
import { controls, fonts, gradients, gutter, palette, radius, useLayout } from '@/theme';
import { haptics } from '@/utils/haptics';
import { useReducedMotion } from '@/utils/motion';

const ITEM_HEIGHT = 76;
const WHEEL_HEIGHT = ITEM_HEIGHT * 3.6;

function normalize(value: string) {
  try { return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); } catch { return value.toLowerCase(); }
}

export function LanguageScreen({ onContinue, onBack, firstRun = false }: { onContinue: () => void; onBack?: () => void; firstRun?: boolean }) {
  return firstRun ? <FirstRunLanguageScreen onContinue={onContinue} onBack={onBack} /> : <LegacyLanguageScreen onContinue={onContinue} onBack={onBack} />;
}

function FirstRunLanguageScreen({ onContinue, onBack }: { onContinue: () => void; onBack?: () => void }) {
  const { language, meta, setLanguage, dictionary } = useI18n();
  const copy = dictionary.language;
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return q ? languages.filter((item) => [item.name, item.native, item.code].some((field) => normalize(field).includes(q))) : languages;
  }, [query]);
  const select = (code: Language) => { if (code !== language) setLanguage(code); };

  return <View style={styles.root}>
    <StatusBar style="light" />
    <FirstRunBackground accent={firstRunTheme.accentCool} />
    <KeyboardAvoidingView style={styles.keyboard} behavior="padding" keyboardVerticalOffset={insets.top}>
      {/* A plain column: the language wheel is the only scroller (no list nested in a ScrollView). */}
      <View style={[styles.scroll, styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 102 }]}>
        <Animated.View entering={FadeIn.duration(260).reduceMotion(ReduceMotion.System)}>
          <View style={styles.header}>
            {onBack ? <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={dictionary.common.back} hitSlop={10} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><GlyphIcon glyph={mdi(I18nManager.isRTL ? 'chevron-right' : 'chevron-left')} size={24} color={firstRunTheme.text} /></Pressable> : <AppLogo size={44} rounded />}
            <View style={styles.currentLanguage}><CountryFlag code={language} width={26} /><Txt variant="small" color={firstRunTheme.muted} style={styles.currentLanguageText}>{meta.native}</Txt></View>
          </View>
          <PremiumScreenHeader title={copy.title} subtitle={copy.body} style={styles.heading} />
        </Animated.View>

        <View style={[styles.search, searchFocused && styles.searchFocused]}>
          <GlyphIcon glyph={mdi('magnify')} size={22} color={searchFocused ? firstRunTheme.accent : firstRunTheme.muted} />
          <TextInput value={query} onChangeText={setQuery} placeholder={copy.search} placeholderTextColor={firstRunTheme.faint} selectionColor={firstRunTheme.accent} style={[styles.searchInput, { textAlign: meta.rtl ? 'right' : 'left' }]} autoCorrect={false} autoCapitalize="none" returnKeyType="search" accessibilityLabel={copy.search} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
          {query ? <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={dictionary.common.cancel} style={({ pressed }) => [styles.clearSearch, pressed && styles.pressed]}><GlyphIcon glyph={mdi('close-circle')} size={20} color={firstRunTheme.muted} /></Pressable> : null}
        </View>

        <Txt variant="label" color={firstRunTheme.muted} style={styles.section}>{query ? copy.results.toUpperCase() : copy.all.toUpperCase()}</Txt>
        {results.length ? <LanguageWheel key={results.map((item) => item.code).join('|')} items={results} selected={language} onSelect={select} rtl={!!meta.rtl} /> : <View accessibilityLiveRegion="polite" style={styles.empty}><GlyphIcon glyph={mdi('translate')} size={28} color={firstRunTheme.muted} /><Txt variant="body" color={firstRunTheme.muted} align="center">{format(copy.noResults, { query: query.trim() })}</Txt></View>}
      </View>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) + 6 }]}>
        <PremiumCTA label={onBack ? dictionary.common.save : format(copy.continueIn, { language: meta.native })} icon={onBack ? 'checkmark' : 'arrow-forward'} onPress={onContinue} />
      </View>
    </KeyboardAvoidingView>
  </View>;
}

function LanguageWheel({ items, selected, onSelect, rtl }: { items: readonly LanguageMeta[]; selected: Language; onSelect: (code: Language) => void; rtl: boolean }) {
  const listRef = useRef<FlatList<LanguageMeta>>(null);
  const selectedIndex = Math.max(0, items.findIndex((item) => item.code === selected));
  const lastIndex = useRef(selectedIndex);
  const scrollY = useSharedValue(selectedIndex * ITEM_HEIGHT);
  const reducedMotion = useReducedMotion();
  const onScroll = useAnimatedScrollHandler({ onScroll: (event) => { scrollY.value = event.contentOffset.y; } });

  const choose = (item: LanguageMeta, index: number) => {
    onSelect(item.code as Language);
    listRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: !reducedMotion });
  };

  return <View style={styles.wheelShell}>
    <Animated.FlatList
      ref={listRef}
      data={items}
      keyExtractor={(item) => item.code}
       renderItem={({ item, index }) => <WheelItem item={item} index={index} scrollY={scrollY} onPress={() => choose(item, index)} selected={item.code === selected} rtl={rtl} reducedMotion={reducedMotion} />}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bounces={false}
      nestedScrollEnabled
      snapToInterval={ITEM_HEIGHT}
      snapToAlignment="start"
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={onScroll}
      onLayout={() => listRef.current?.scrollToOffset({ offset: selectedIndex * ITEM_HEIGHT, animated: false })}
      getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
      contentContainerStyle={styles.wheelContent}
      style={styles.wheel}
      onMomentumScrollEnd={(event) => {
        const index = Math.max(0, Math.min(items.length - 1, Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT)));
        const item = items[index];
        if (item) {
          if (index !== lastIndex.current) { lastIndex.current = index; haptics.select(); }
          onSelect(item.code as Language);
        }
      }}
    />
    <View pointerEvents="none" style={styles.wheelCenter} />
    <View pointerEvents="none" style={styles.wheelTopFade} />
    <View pointerEvents="none" style={styles.wheelBottomFade} />
  </View>;
}

function WheelItem({ item, index, scrollY, onPress, selected, rtl, reducedMotion }: { item: LanguageMeta; index: number; scrollY: ReturnType<typeof useSharedValue<number>>; onPress: () => void; selected: boolean; rtl: boolean; reducedMotion: boolean }) {
  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: 1, transform: [] };
    const distance = scrollY.value - index * ITEM_HEIGHT;
    return {
      opacity: interpolate(distance, [-ITEM_HEIGHT * 2, -ITEM_HEIGHT, 0, ITEM_HEIGHT, ITEM_HEIGHT * 2], [0.2, 0.58, 1, 0.58, 0.2], Extrapolation.CLAMP),
      transform: [
        { perspective: 720 },
        { rotateX: `${interpolate(distance, [-ITEM_HEIGHT * 2, -ITEM_HEIGHT, 0, ITEM_HEIGHT, ITEM_HEIGHT * 2], [68, 34, 0, -34, -68], Extrapolation.CLAMP)}deg` },
        { scale: interpolate(distance, [-ITEM_HEIGHT * 2, -ITEM_HEIGHT, 0, ITEM_HEIGHT, ITEM_HEIGHT * 2], [0.72, 0.9, 1, 0.9, 0.72], Extrapolation.CLAMP) },
      ],
    };
  });

  return <Animated.View style={[styles.wheelItem, animatedStyle]}>
    <PressableScale onPress={onPress} scaleTo={0.98} haptic="select" accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${item.name}, ${item.native}`} style={[styles.wheelRow, selected && styles.wheelRowSelected]}>
      <CountryFlag code={item.code} width={34} />
      <View style={[styles.wheelCopy, rtl && styles.wheelCopyRtl]}><Txt variant="h3" color={firstRunTheme.text} style={styles.languageName}>{item.name}</Txt><Txt variant="small" color={firstRunTheme.muted}>{item.native}</Txt></View>
      {selected ? <GlyphIcon glyph={mdi('check-circle')} size={22} color={firstRunTheme.accent} /> : null}
    </PressableScale>
  </Animated.View>;
}

/** The post-login settings page intentionally keeps its existing light treatment. */
function LegacyLanguageScreen({ onContinue, onBack }: { onContinue: () => void; onBack?: () => void }) {
  const { language, meta, setLanguage, dictionary } = useI18n();
  const copy = dictionary.language;
  const { contentWidth } = useLayout();
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const select = (code: Language) => { if (code !== language) setLanguage(code); };
  const popular = languages.filter((item) => 'popular' in item && item.popular);
  const results = useMemo(() => {
    const q = normalize(query.trim());
    return q ? languages.filter((item) => [item.name, item.native, item.code].some((field) => normalize(field).includes(q))) : [];
  }, [query]);
  const cardWidth = contentWidth < 300 || fontScale > 1.2 ? contentWidth : (contentWidth - 12) / 2;

  return <View style={legacyStyles.root}>
    <StatusBar style="light" />
    <SurfaceBackground accent={palette.blue} />
    <KeyboardAvoidingView style={legacyStyles.keyboard} behavior="padding">
      <ScrollView style={legacyStyles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={[legacyStyles.content, { paddingTop: insets.top + 20 }]}> 
        <Animated.View entering={FadeIn.duration(260).reduceMotion(ReduceMotion.System)}>
          <View style={legacyStyles.header}>
            {onBack ? <IconCircle glyph={mdi(I18nManager.isRTL ? 'chevron-right' : 'chevron-left')} label={dictionary.common.back} onPress={onBack} /> : <AppLogo size={44} rounded />}
            <View style={legacyStyles.currentLanguage}><CountryFlag code={language} width={26} /><Txt variant="small" color={palette.inkSoft} style={legacyStyles.currentLanguageText}>{meta.native}</Txt></View>
          </View>
          <View style={legacyStyles.heading}><ScreenHeader title={copy.title} subtitle={copy.body} /></View>
        </Animated.View>

        <View style={[legacyStyles.search, searchFocused && legacyStyles.searchFocused]}>
          <GlyphIcon glyph={mdi('magnify')} size={22} color={palette.inkMuted} />
          <TextInput value={query} onChangeText={setQuery} placeholder={copy.search} placeholderTextColor={palette.inkMuted} selectionColor={palette.blue} style={[legacyStyles.searchInput, { textAlign: meta.rtl ? 'right' : 'left' }]} autoCorrect={false} autoCapitalize="none" returnKeyType="search" accessibilityLabel={copy.search} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
          {query ? <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={dictionary.common.cancel} style={({ pressed }) => [legacyStyles.clearSearch, pressed && legacyStyles.pressed]}><GlyphIcon glyph={mdi('close-circle')} size={20} color={palette.inkMuted} /></Pressable> : null}
        </View>

        {query ? <>
          <Txt variant="label" color={palette.inkMuted} style={legacyStyles.section}>{copy.results.toUpperCase()}</Txt>
          {results.length ? <LegacyLanguageList items={results} selected={language} onSelect={select} /> : <View accessibilityLiveRegion="polite" style={legacyStyles.empty}><GlyphIcon glyph={mdi('translate')} size={28} color={palette.inkMuted} /><Txt variant="body" color={palette.inkMuted} align="center">{format(copy.noResults, { query: query.trim() })}</Txt></View>}
        </> : <>
          <Txt variant="label" color={palette.inkMuted} style={legacyStyles.section}>{copy.popular.toUpperCase()}</Txt>
          <View style={legacyStyles.grid}>{popular.map((item) => <LegacyPopularCard key={item.code} item={item} width={cardWidth} selected={item.code === language} onPress={() => select(item.code as Language)} />)}</View>
          <Txt variant="label" color={palette.inkMuted} style={legacyStyles.section}>{copy.all.toUpperCase()}</Txt>
          <LegacyLanguageList items={languages} selected={language} onSelect={select} />
        </>}
      </ScrollView>
      <View style={[legacyStyles.footer, { paddingBottom: Math.max(insets.bottom, 14) + 6 }]}>
        <View style={legacyStyles.footerContent}><GradientButton label={onBack ? dictionary.common.save : format(copy.continueIn, { language: meta.native })} icon={onBack ? 'checkmark' : 'arrow-forward'} gradient={gradients.primary} onPress={onContinue} /></View>
      </View>
    </KeyboardAvoidingView>
  </View>;
}

function LegacyPopularCard({ item, width, selected, onPress }: { item: LanguageMeta; width: number; selected: boolean; onPress: () => void }) {
  return <SelectableSurface selected={selected} accent={palette.blue} onPress={onPress} label={`${item.name}, ${item.native}`} containerStyle={{ width }} cornerRadius={radius.md} style={[legacyStyles.popular, selected && legacyStyles.popularActive]}>
    <View style={legacyStyles.popularTop}><CountryFlag code={item.code} width={42} /><CheckBadge visible={selected} color={palette.blue} size={22} ring /></View>
    <View style={legacyStyles.languageCopy}><Txt variant="h3" style={legacyStyles.languageName}>{item.name}</Txt><Txt variant="small" color={palette.inkMuted}>{item.native}</Txt></View>
  </SelectableSurface>;
}

function LegacyLanguageList({ items, selected, onSelect }: { items: readonly LanguageMeta[]; selected: string; onSelect: (code: Language) => void }) {
  return <View style={legacyStyles.list}>{items.map((item, i) => {
    const active = item.code === selected;
    return <PressableScale key={item.code} haptic="select" scaleTo={1} accessibilityRole="radio" accessibilityState={{ selected: active }} accessibilityLabel={`${item.name}, ${item.native}`} onPress={() => onSelect(item.code as Language)} style={[legacyStyles.row, i > 0 && legacyStyles.rowDivider, active && legacyStyles.rowActive]}>
      <CountryFlag code={item.code} width={36} />
      <View style={legacyStyles.rowCopy}><Txt variant="h3" style={legacyStyles.languageName}>{item.name}</Txt><Txt variant="small" color={palette.inkMuted}>{item.native}</Txt></View>
      <CheckBadge visible={active} color={palette.blue} size={24} ring />
    </PressableScale>;
  })}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: firstRunTheme.background },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, maxWidth: 520, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, gap: 20 },
  currentLanguage: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, paddingVertical: 8 },
  currentLanguageText: { flexShrink: 1 },
  back: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: firstRunTheme.lineStrong, backgroundColor: firstRunTheme.surface, alignItems: 'center', justifyContent: 'center' },
  heading: { marginTop: 28 },
  search: { marginTop: 24, minHeight: 58, borderRadius: 18, backgroundColor: firstRunTheme.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: firstRunTheme.lineStrong },
  searchFocused: { borderColor: firstRunTheme.accent, backgroundColor: firstRunTheme.surfaceRaised },
  searchInput: { flex: 1, minWidth: 0, minHeight: 52, fontSize: 15, color: firstRunTheme.text, paddingVertical: 12, paddingHorizontal: 0 },
  clearSearch: { width: 44, minHeight: 44, marginEnd: -8, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  pressed: { opacity: 0.6 },
  section: { marginTop: 26, marginBottom: 10, letterSpacing: 1.1 },
  wheelShell: { height: WHEEL_HEIGHT, borderRadius: 26, overflow: 'hidden', backgroundColor: 'rgba(16,24,38,0.82)', borderWidth: 1, borderColor: firstRunTheme.line },
  wheel: { flex: 1 },
  wheelContent: { paddingVertical: WHEEL_HEIGHT / 2 - ITEM_HEIGHT / 2 },
  wheelItem: { height: ITEM_HEIGHT, justifyContent: 'center', paddingHorizontal: 12 },
  wheelRow: { height: ITEM_HEIGHT - 10, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16 },
  wheelRowSelected: { backgroundColor: firstRunTheme.surfaceRaised, borderWidth: 1, borderColor: `${firstRunTheme.accent}55` },
  wheelCopy: { flex: 1, minWidth: 0, gap: 2 },
  wheelCopyRtl: { alignItems: 'flex-end' },
  languageName: { fontSize: 16, lineHeight: 21 },
  wheelCenter: { position: 'absolute', left: 10, right: 10, top: WHEEL_HEIGHT / 2 - ITEM_HEIGHT / 2, height: ITEM_HEIGHT - 10, borderRadius: 18, borderWidth: 1, borderColor: `${firstRunTheme.accent}85` },
  wheelTopFade: { position: 'absolute', left: 0, right: 0, top: 0, height: ITEM_HEIGHT * 0.8, backgroundColor: 'rgba(20,24,34,0.72)' },
  wheelBottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: ITEM_HEIGHT * 0.8, backgroundColor: 'rgba(20,24,34,0.72)' },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 32, paddingHorizontal: 24, backgroundColor: firstRunTheme.surface, borderWidth: 1, borderColor: firstRunTheme.line, borderRadius: 22 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 18, backgroundColor: `${firstRunTheme.background}F2` },
});

const legacyStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.surface },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: gutter, maxWidth: 520, width: '100%', alignSelf: 'center', paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, gap: 20 },
  currentLanguage: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, paddingVertical: 8 },
  currentLanguageText: { flexShrink: 1 },
  heading: { marginTop: 28 },
  search: { marginTop: 24, minHeight: controls.input.height, borderRadius: radius.sm, backgroundColor: palette.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: 1.5, borderColor: palette.lineStrong },
  searchFocused: { borderColor: palette.blue },
  searchInput: { flex: 1, minWidth: 0, minHeight: controls.input.height - 4, fontFamily: fonts.medium, fontSize: 15, color: palette.ink, paddingVertical: 12, paddingHorizontal: 0 },
  clearSearch: { width: 44, minHeight: 44, marginEnd: -8, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  pressed: { opacity: 0.6 },
  section: { marginTop: 26, marginBottom: 12, letterSpacing: 0.7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  popular: { padding: 14, gap: 14, minHeight: 126 },
  popularActive: { backgroundColor: `${palette.blue}08` },
  popularTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  languageCopy: { gap: 2, minWidth: 0 },
  languageName: { fontSize: 15, lineHeight: 20 },
  list: { backgroundColor: palette.surface, borderRadius: radius.md, borderWidth: 1, borderColor: palette.lineStrong, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 12, minHeight: 64, borderStartWidth: 3, borderStartColor: 'transparent' },
  rowCopy: { flex: 1, minWidth: 0, gap: 2 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  rowActive: { backgroundColor: `${palette.blue}08`, borderStartColor: palette.blue },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 32, paddingHorizontal: 24, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, borderRadius: radius.md },
  footer: { backgroundColor: palette.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line, paddingTop: 14 },
  footerContent: { paddingHorizontal: gutter, maxWidth: 520, width: '100%', alignSelf: 'center' },
});

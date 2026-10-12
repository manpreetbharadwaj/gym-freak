import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, FlatList, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, SharedValue, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/i18n';
import { AppLogo, Txt } from '@/components';
import { AnimatedCard, FirstRunBackground, PremiumCTA, firstRunTheme } from '@/components/firstRun';
import { useRepos } from '@/store/session';
import { OnboardingCard } from '@/types/domain';
import { haptics } from '@/utils/haptics';
import { useReducedMotion } from '@/utils/motion';
import { fonts, gutter, motion, radius, useLayout } from '@/theme';
import { clampIndex } from './onboardingContent';
import { useOnboardingCards } from './useOnboardingCards';

/** Accent per position when a card sets none (the cycle the bundled cards used). */
const defaultAccents = [firstRunTheme.accentAlt, firstRunTheme.accentCool, firstRunTheme.accentBlue, firstRunTheme.accent];
const accentOf = (cards: OnboardingCard[], i: number) => cards[i]?.accentColor ?? defaultAccents[i % defaultAccents.length];
/** White text keeps the theme's muted body; any other text colour uses itself at the same 72% strength. */
const bodyColor = (card: OnboardingCard) => (card.textColor.slice(0, 7).toUpperCase() === '#FFFFFF' ? firstRunTheme.muted : `${card.textColor.slice(0, 7)}B8`);
/** CSS-style angle (180 = top → bottom) to expo-linear-gradient start/end points. */
function gradientPoints(angle: number) {
  const rad = (angle * Math.PI) / 180;
  const x = Math.sin(rad) / 2;
  const y = -Math.cos(rad) / 2;
  return { start: { x: 0.5 - x, y: 0.5 - y }, end: { x: 0.5 + x, y: 0.5 + y } };
}

/**
 * First-launch onboarding cards (after the splash). Content is admin-managed (HealthyMe `GET /v1/app/onboarding`):
 * any number of cards, in admin order. With no published cards and nothing cached, it finishes immediately.
 */
export function IntroScreen({ onDone }: { onDone: () => void }) {
  const { dictionary } = useI18n();
  const { gym } = useRepos();
  const { status, cards } = useOnboardingCards(gym);
  const { width, height } = useLayout();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [rawIndex, setIndex] = useState(0);
  // Cached cards can be replaced by fresher ones mid-flow; never point past the end of the list.
  const index = clampIndex(rawIndex, cards.length);
  const scrollX = useSharedValue(0);
  const list = useRef<FlatList<OnboardingCard>>(null);
  const previousWidth = useRef(width);
  const finished = useRef(false);
  const last = index === cards.length - 1;
  const done = () => { if (finished.current) return; finished.current = true; onDone(); };

  const contentWidth = Math.min(width - insets.left - insets.right - gutter * 2, 480);
  const heroH = Math.max(250, Math.min(400, height * 0.4, contentWidth * 1.04));

  // Nothing to show (no published cards, offline with no cache): continue to the next screen.
  useEffect(() => { if (status === 'ready' && !cards.length) done(); });

  useEffect(() => {
    if (rawIndex === index) return;
    setIndex(index);
    list.current?.scrollToOffset({ offset: index * width, animated: false });
    scrollX.value = index * width;
  }, [index, rawIndex, scrollX, width]);

  // Android back steps to the previous card; on the first card it behaves as before (leaves the app).
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index === 0) return false;
      go(index - 1);
      return true;
    });
    return () => sub.remove();
  });

  useEffect(() => {
    if (previousWidth.current === width) return;
    previousWidth.current = width;
    list.current?.scrollToOffset({ offset: index * width, animated: false });
    scrollX.value = index * width;
  }, [index, scrollX, width]);

  const go = (next: number) => {
    list.current?.scrollToOffset({ offset: next * width, animated: !reduced });
    // Non-animated scrolling does not emit a momentum-end event on every platform.
    if (reduced && next !== index) { haptics.select(); setIndex(next); }
  };
  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = clampIndex(Math.round(event.nativeEvent.contentOffset.x / width), cards.length);
    if (next !== index) { haptics.select(); setIndex(next); }
  };
  const onScroll = useAnimatedScrollHandler((event) => { scrollX.value = event.contentOffset.x; });

  if (!cards.length) return <View style={styles.root}><StatusBar style="light" /><FirstRunBackground accent={firstRunTheme.accentAlt} /></View>;

  return <View style={styles.root}>
    <StatusBar style="light" />
    <FirstRunBackground accent={firstRunTheme.accentAlt} />
    {cards.map((card, i) => (card.backgroundColor || card.gradient ? <CardBackdrop key={card.id} card={card} index={i} width={width} scrollX={scrollX} reduced={reduced} /> : null))}

    <View style={{ paddingTop: insets.top + 8, paddingLeft: insets.left + gutter, paddingRight: insets.right + gutter }}>
      <View style={[styles.topBar, { width: contentWidth }]}>
        <View style={styles.brand}><AppLogo size={32} rounded /><Txt variant="h3" color={firstRunTheme.text} style={styles.brandLabel}>Gym Freak</Txt></View>
         {!last ? <Pressable
          accessibilityRole="button"
          accessibilityLabel={dictionary.common.skip}
          hitSlop={8}
          onPress={() => { haptics.tap(); done(); }}
          style={styles.skip}
         ><Txt variant="small" color={firstRunTheme.muted}>{dictionary.common.skip}</Txt></Pressable> : null}
      </View>
    </View>

    <Animated.FlatList
      ref={list}
      data={cards}
      extraData={index}
      keyExtractor={(card) => card.id}
      style={styles.list}
      horizontal
      pagingEnabled
      bounces={false}
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onMomentumScrollEnd={onMomentumEnd}
      getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      renderItem={({ item, index: i }) => <IntroPage
        item={item}
        index={i}
        accent={accentOf(cards, i)}
        active={index === i}
        width={width}
        contentWidth={contentWidth}
        heroHeight={heroH}
        safeLeft={insets.left}
        safeRight={insets.right}
        scrollX={scrollX}
        reduced={reduced}
      />}
    />

    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) + 6, paddingLeft: insets.left + gutter, paddingRight: insets.right + gutter }]}>
      <View style={[styles.controls, { width: contentWidth }]}>
        <View style={styles.dots}>
          {cards.map((card, i) => <PageDot key={card.id} index={i} current={index} total={cards.length} color={accentOf(cards, i)} width={width} scrollX={scrollX} onPress={() => go(i)} />)}
        </View>
         <PremiumCTA label={last ? dictionary.intro.start : dictionary.common.next} icon={last ? 'flash' : 'arrow-forward'} onPress={() => (last ? done() : go(index + 1))} />
      </View>
    </View>
  </View>;
}

/** Fades a card's own background in as it scrolls into view (cards without one show the theme background). */
function CardBackdrop({ card, index, width, scrollX, reduced }: { card: OnboardingCard; index: number; width: number; scrollX: SharedValue<number>; reduced: boolean }) {
  const style = useAnimatedStyle(() => {
    const distance = Math.min(Math.abs(scrollX.value / width - index), 1);
    return { opacity: reduced ? (distance < 0.5 ? 1 : 0) : 1 - distance };
  });
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, card.backgroundColor ? { backgroundColor: card.backgroundColor } : null, style]}>
    {card.gradient ? <LinearGradient colors={card.gradient.colors as unknown as readonly [string, string, ...string[]]} {...gradientPoints(card.gradient.angle)} style={StyleSheet.absoluteFill} /> : null}
  </Animated.View>;
}

/** The hero image: remote, disk-cached, aspect ratio kept (cropped to fill, or letterboxed), with a calm fallback if it fails. */
function CardImage({ card, width, height }: { card: OnboardingCard; width: number; height: number }) {
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();
  return <AnimatedCard style={[styles.photoCard, { width, height }, card.backgroundColor ? { backgroundColor: card.backgroundColor } : null]}>
    {failed
      ? <View style={styles.imageFallback} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Icon name="image" size="lg" color={firstRunTheme.faint} /></View>
      : <Image
        source={{ uri: card.imageUrl }}
        style={StyleSheet.absoluteFill}
        contentFit={card.imageFit}
        cachePolicy="memory-disk"
        recyclingKey={card.id}
        transition={reduced ? 0 : motion.fast}
        allowDownscaling
        accessible={false}
        onError={() => setFailed(true)}
      />}
  </AnimatedCard>;
}

function IntroPage({ item, index, accent, active, width, contentWidth, heroHeight, safeLeft, safeRight, scrollX, reduced }: {
  item: OnboardingCard;
  index: number;
  accent: string;
  active: boolean;
  width: number;
  contentWidth: number;
  heroHeight: number;
  safeLeft: number;
  safeRight: number;
  scrollX: SharedValue<number>;
  reduced: boolean;
}) {
  const artStyle = useAnimatedStyle(() => {
    const distance = Math.min(Math.abs(scrollX.value / width - index), 1);
    return { opacity: reduced ? 1 : 1 - distance * 0.35, transform: [{ scale: reduced ? 1 : 1 - distance * 0.025 }] };
  });
  const copyStyle = useAnimatedStyle(() => {
    const offset = Math.max(-1, Math.min(1, scrollX.value / width - index));
    return { opacity: reduced ? 1 : 1 - Math.abs(offset) * 0.5, transform: [{ translateX: reduced ? 0 : -offset * 14 }] };
  });

  return <View style={{ width, flex: 1 }} accessibilityElementsHidden={!active} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}>
    <ScrollView bounces={false} showsVerticalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={[styles.pageContent, { paddingLeft: safeLeft + gutter, paddingRight: safeRight + gutter }]}>
      <View style={{ width: contentWidth }}>
        <Animated.View style={artStyle}><CardImage card={item} width={contentWidth} height={heroHeight} /></Animated.View>
        <Animated.View style={[styles.editorial, copyStyle]}>
          <View style={styles.eyebrowRow}>
            <View style={[styles.eyebrowRule, { backgroundColor: accent }]} />
            <Txt variant="label" color={accent} style={styles.eyebrow}>{item.tag ? item.tag.toLocaleUpperCase() : ''}</Txt>
            <Txt variant="label" color={firstRunTheme.faint}>{String(index + 1).padStart(2, '0')}</Txt>
          </View>
          <Txt variant="question" color={item.textColor} style={styles.title}>{item.title}</Txt>
          {item.description ? <Txt variant="body" color={bodyColor(item)} style={styles.body}>{item.description}</Txt> : null}
        </Animated.View>
      </View>
    </ScrollView>
  </View>;
}

function PageDot({ index, current, total, color, width, scrollX, onPress }: { index: number; current: number; total: number; color: string; width: number; scrollX: SharedValue<number>; onPress: () => void }) {
  const style = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, [(index - 1) * width, index * width, (index + 1) * width], [6, 24, 6], Extrapolation.CLAMP),
    opacity: interpolate(scrollX.value, [(index - 1) * width, index * width, (index + 1) * width], [0.22, 1, 0.22], Extrapolation.CLAMP),
  }));
  return <Pressable accessibilityRole="button" accessibilityLabel={`${index + 1} / ${total}`} accessibilityState={{ selected: current === index }} onPress={onPress} style={styles.dotTarget}>
    <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />
  </Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: firstRunTheme.background },
  topBar: { alignSelf: 'center', minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  brandLabel: { flexShrink: 1 },
  skip: { minHeight: 44, minWidth: 44, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 1 },
  list: { flex: 1 },
  photoCard: { padding: 0, borderWidth: 1, borderColor: firstRunTheme.line, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: firstRunTheme.surface },
  imageFallback: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  pageContent: { flexGrow: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 20 },
  editorial: { paddingTop: 24 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrowRule: { width: 18, height: 2, borderRadius: 1 },
  eyebrow: { flex: 1, letterSpacing: 1.2 },
  title: { marginTop: 10, fontFamily: fonts.display, letterSpacing: -0.8 },
  body: { marginTop: 9, maxWidth: 440 },
  footer: { backgroundColor: firstRunTheme.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: firstRunTheme.line, paddingHorizontal: gutter, paddingTop: 8 },
  controls: { alignSelf: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', minHeight: 44, marginBottom: 3 },
  dotTarget: { minWidth: 38, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { height: 6, borderRadius: 3 },
});

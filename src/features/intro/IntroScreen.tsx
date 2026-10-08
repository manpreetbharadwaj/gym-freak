import React, { useEffect, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, SharedValue, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/i18n';
import { Dictionary } from '@/i18n/types';
import { ConsistencyArt, GuidanceArt, PersonalizedArt, ProgressArt } from './art';
import { AppLogo, Txt } from '@/components';
import { FirstRunBackground, PremiumCTA, firstRunTheme } from '@/components/firstRun';
import { haptics } from '@/utils/haptics';
import { useReducedMotion } from '@/utils/motion';
import { fonts, gutter, Scene, scenes, useLayout } from '@/theme';

const slideScenes: Scene[] = [
  { ...scenes.violet, accent: firstRunTheme.accentAlt },
  { ...scenes.aqua, accent: firstRunTheme.accentCool },
  { ...scenes.coral, accent: firstRunTheme.accentBlue },
  { ...scenes.lime, accent: firstRunTheme.accent },
];
const slideArt = [PersonalizedArt, GuidanceArt, ProgressArt, ConsistencyArt];
type Slide = Dictionary['intro']['slides'][number];

export function IntroScreen({ onDone }: { onDone: () => void }) {
  const { dictionary } = useI18n();
  const { width, height } = useLayout();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const slides = dictionary.intro.slides;
  const [index, setIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const list = useRef<FlatList<Slide>>(null);
  const previousWidth = useRef(width);
  const last = index === slides.length - 1;
  const scene = slideScenes[index];

  const contentWidth = Math.min(width - insets.left - insets.right - gutter * 2, 480);
  const heroH = Math.max(250, Math.min(400, height * 0.4, contentWidth * 1.04));

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
    const next = Math.max(0, Math.min(slides.length - 1, Math.round(event.nativeEvent.contentOffset.x / width)));
    if (next !== index) { haptics.select(); setIndex(next); }
  };
  const onScroll = useAnimatedScrollHandler((event) => { scrollX.value = event.contentOffset.x; });

  return <View style={styles.root}>
    <StatusBar style="light" />
    <FirstRunBackground accent={firstRunTheme.accentAlt} />

    <View style={{ paddingTop: insets.top + 8, paddingLeft: insets.left + gutter, paddingRight: insets.right + gutter }}>
      <View style={[styles.topBar, { width: contentWidth }]}>
        <View style={styles.brand}><AppLogo size={32} rounded /><Txt variant="h3" color={firstRunTheme.text} style={styles.brandLabel}>Gym Freak</Txt></View>
         {!last ? <Pressable
          accessibilityRole="button"
          accessibilityLabel={dictionary.common.skip}
          hitSlop={8}
          onPress={() => { haptics.tap(); onDone(); }}
          style={styles.skip}
         ><Txt variant="small" color={firstRunTheme.muted}>{dictionary.common.skip}</Txt></Pressable> : null}
      </View>
    </View>

    <Animated.FlatList
      ref={list}
      data={slides}
      extraData={index}
      keyExtractor={(_, i) => String(i)}
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
        active={index === i}
        width={width}
        contentWidth={contentWidth}
        heroHeight={heroH}
        safeLeft={insets.left}
        safeRight={insets.right}
        scrollX={scrollX}
        reduced={reduced}
        copy={dictionary.intro.visual}
      />}
    />

    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) + 6, paddingLeft: insets.left + gutter, paddingRight: insets.right + gutter }]}>
      <View style={[styles.controls, { width: contentWidth }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => <PageDot key={i} index={i} current={index} total={slides.length} width={width} scrollX={scrollX} onPress={() => go(i)} />)}
        </View>
         <PremiumCTA label={last ? dictionary.intro.start : dictionary.common.next} icon={last ? 'flash' : 'arrow-forward'} onPress={() => (last ? onDone() : go(index + 1))} />
      </View>
    </View>
  </View>;
}

function IntroPage({ item, index, active, width, contentWidth, heroHeight, safeLeft, safeRight, scrollX, reduced, copy }: {
  item: Slide;
  index: number;
  active: boolean;
  width: number;
  contentWidth: number;
  heroHeight: number;
  safeLeft: number;
  safeRight: number;
  scrollX: SharedValue<number>;
  reduced: boolean;
  copy: Dictionary['intro']['visual'];
}) {
  const Art = slideArt[index];
  const scene = slideScenes[index];
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
        <Animated.View style={artStyle}><Art width={contentWidth} height={heroHeight} copy={copy} photoLabel={item.title} /></Animated.View>
        <Animated.View style={[styles.editorial, copyStyle]}>
          <View style={styles.eyebrowRow}>
            <View style={[styles.eyebrowRule, { backgroundColor: scene.accent }]} />
            <Txt variant="label" color={scene.accent} style={styles.eyebrow}>{item.tag.toUpperCase()}</Txt>
            <Txt variant="label" color={firstRunTheme.faint}>{String(index + 1).padStart(2, '0')}</Txt>
          </View>
          <Txt variant="question" color={firstRunTheme.text} style={styles.title}>{item.title}</Txt>
          <Txt variant="body" color={firstRunTheme.muted} style={styles.body}>{item.body}</Txt>
        </Animated.View>
      </View>
    </ScrollView>
  </View>;
}

function PageDot({ index, current, total, width, scrollX, onPress }: { index: number; current: number; total: number; width: number; scrollX: SharedValue<number>; onPress: () => void }) {
  const style = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, [(index - 1) * width, index * width, (index + 1) * width], [6, 24, 6], Extrapolation.CLAMP),
    opacity: interpolate(scrollX.value, [(index - 1) * width, index * width, (index + 1) * width], [0.22, 1, 0.22], Extrapolation.CLAMP),
  }));
  return <Pressable accessibilityRole="button" accessibilityLabel={`${index + 1} / ${total}`} accessibilityState={{ selected: current === index }} onPress={onPress} style={styles.dotTarget}>
    <Animated.View style={[styles.dot, { backgroundColor: slideScenes[index].accent }, style]} />
  </Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: firstRunTheme.background },
  topBar: { alignSelf: 'center', minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  brandLabel: { flexShrink: 1 },
  skip: { minHeight: 44, minWidth: 44, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 1 },
  list: { flex: 1 },
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

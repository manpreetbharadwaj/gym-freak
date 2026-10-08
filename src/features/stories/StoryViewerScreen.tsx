import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlyphIcon, mdi, Txt } from '@/components';
import { ExerciseMedia } from '@/components/media';
import { useMarkStoryViewed, useStories } from '@/hooks/queries';
import { useI18n } from '@/i18n';
import { linkForCta, openLink } from '@/navigation/deepLinks';
import { RootScreenProps } from '@/navigation/types';
import * as Linking from 'expo-linking';
import { controls, palette } from '@/theme';
import { haptics } from '@/utils/haptics';
import { startIndex } from './storyGroups';
import { storyStyle } from './storyStyle';

const STORY_MS = 6500;
/** Video stories play for their length (bounded), images and text for a fixed time. */
const durationOf = (story?: { mediaType?: string; media: { durationSeconds?: number } }) =>
  story?.mediaType === 'VIDEO' && story.media.durationSeconds ? Math.min(30_000, Math.max(STORY_MS, story.media.durationSeconds * 1000)) : STORY_MS;

export function StoryViewerScreen({ route, navigation }: RootScreenProps<'StoryViewer'>) {
  const { dictionary } = useI18n();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const feed = useStories();
  const markViewed = useMarkStoryViewed();
  // Only the tapped category plays (a deep link to one story plays that story's category).
  const category = route.params.category ?? feed.data?.find((s) => s.id === route.params.startId)?.category;
  const stories = useMemo(() => (feed.data ?? []).filter((s) => s.category === category), [feed.data, category]);
  const [index, setIndex] = useState(-1);
  // Position once the list is available (it may still be loading on a cold open): the requested story, else the first unseen.
  useEffect(() => { if (index < 0 && stories.length) setIndex(startIndex(stories, route.params.startId)); }, [index, route.params.startId, stories]);
  // Nothing (left) to show in this category — e.g. it was unpublished: leave instead of a blank screen.
  useEffect(() => { if (feed.isSuccess && !stories.length) navigation.goBack(); }, [feed.isSuccess, stories.length, navigation]);
  const progress = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const paused = useRef(false);
  const story = stories[index];

  const close = useCallback(() => navigation.goBack(), [navigation]);
  const go = useCallback((next: number) => {
    if (next < 0) { progress.setValue(0); return; }
    if (next >= stories.length) { close(); return; }
    haptics.select();
    setIndex(next);
  }, [close, progress, stories.length]);

  const run = useCallback((from = 0) => {
    Animated.timing(progress, { toValue: 1, duration: durationOf(story) * (1 - from), easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => {
      if (!finished) return;
      // Watched to the end: recorded server-side as completed.
      if (story) markViewed.mutate({ id: story.id, completed: true });
      go(index + 1);
    });
  }, [go, index, markViewed, progress, story]);

  useEffect(() => {
    if (!story) return;
    if (!story.viewed) markViewed.mutate({ id: story.id, completed: false });
    progress.setValue(0);
    run();
    return () => progress.stopAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  const pause = () => { paused.current = true; progress.stopAnimation(); };
  const resume = () => { if (!paused.current) return; paused.current = false; progress.stopAnimation((value) => run(value)); };

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderGrant: () => { paused.current = true; progress.stopAnimation(); },
    onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120 || g.vy > 1.2) { close(); return; }
      Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
      paused.current = false; progress.stopAnimation((value) => run(value));
    },
  })).current;

  const openCta = () => {
    const link = story?.cta ? linkForCta(story.cta) : null;
    if (!link) return;
    haptics.press();
    if (/^https:\/\//.test(link)) { Linking.openURL(link).catch(() => undefined); return; }
    navigation.goBack();
    openLink(link);
  };

  if (!story) return <View style={styles.root} />;
  const look = storyStyle(story.category);
  const scale = drag.interpolate({ inputRange: [0, height], outputRange: [1, 0.85], extrapolate: 'clamp' });

  return <View style={styles.root}>
    <StatusBar style="light" />
    <Animated.View {...pan.panHandlers} style={[styles.card, { transform: [{ translateY: drag }, { scale }], borderRadius: drag.interpolate({ inputRange: [0, 80], outputRange: [0, 32], extrapolate: 'clamp' }) }]}>
      {story.media.videoUrl || story.media.thumbnailUrl ? <ExerciseMedia media={story.media} height={height} rounded={0} style={StyleSheet.absoluteFill} sound /> : <LinearGradient colors={look.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
      <LinearGradient colors={['rgba(23,20,61,0.45)', 'rgba(23,20,61,0)', 'rgba(23,20,61,0.1)', 'rgba(23,20,61,0.72)']} locations={[0, 0.25, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.bars}>{stories.map((s, i) => <View key={s.id} style={styles.bar}>
          <Animated.View style={[styles.barFill, { width: i < index ? '100%' : i > index ? '0%' : progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>)}</View>
        <View style={styles.meta}>
          <View style={styles.categoryChip}><GlyphIcon glyph={look.glyph} size={14} color={palette.white} /><Txt variant="label" color={palette.white}>{(dictionary.stories.categories[story.category] ?? story.category).toUpperCase()}</Txt></View>
          <Pressable hitSlop={12} onPress={close} accessibilityRole="button" accessibilityLabel={dictionary.common.close}><GlyphIcon glyph={mdi('close')} size={28} color={palette.white} /></Pressable>
        </View>
      </View>

      {!story.media.thumbnailUrl && !story.media.videoUrl ? <View style={styles.art}><View style={styles.artRing}><GlyphIcon glyph={look.glyph} size={92} color={palette.white} /></View></View> : null}

      <View style={[styles.copy, { paddingBottom: insets.bottom + 28 }]}>
        <Txt variant="display" color={palette.white}>{story.title}</Txt>
        {story.summary ? <Txt variant="h3" color="rgba(255,255,255,0.92)" style={{ marginTop: 10 }}>{story.summary}</Txt> : null}
        {story.locked ? <Txt variant="body" color="rgba(255,255,255,0.85)" style={{ marginTop: 10 }}>{dictionary.stories.locked}</Txt> : story.body ? <Txt variant="body" color="rgba(255,255,255,0.85)" style={{ marginTop: 10 }}>{story.body}</Txt> : null}
        {story.cta && !story.locked ? <Pressable onPress={openCta} style={styles.cta} accessibilityRole="button"><Txt variant="button" color={palette.ink}>{story.cta.label}</Txt><GlyphIcon glyph={mdi('arrow-right')} size={20} color={palette.ink} /></Pressable> : null}
      </View>

      {/* Tap zones sit under the copy so the CTA stays tappable. */}
      <View style={[styles.zones, { top: insets.top + 80, bottom: story.cta ? 170 : 40 }]} pointerEvents="box-none">
        <Pressable style={{ flex: 1 }} onPress={() => go(index - 1)} onLongPress={pause} onPressOut={resume} delayLongPress={180} accessibilityLabel={dictionary.common.back} />
        <Pressable style={{ flex: 2 }} onPress={() => go(index + 1)} onLongPress={pause} onPressOut={resume} delayLongPress={180} accessibilityLabel={dictionary.common.next} />
      </View>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#17143D' },
  card: { flex: 1, overflow: 'hidden' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 12, zIndex: 3, gap: 12 },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: palette.white },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  art: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingBottom: 160 },
  artRing: { width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  copy: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22, zIndex: 3 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: palette.surface, height: controls.button.height, borderRadius: controls.button.radius, marginTop: 22 },
  zones: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', zIndex: 2 },
});

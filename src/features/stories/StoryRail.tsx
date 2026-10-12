import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { createVideoPlayer, type VideoThumbnail } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { GlyphIcon, PressableScale, Txt } from '@/components';
import { HorizontalRail } from '@/components/layout';
import { useI18n } from '@/i18n';
import { palette } from '@/theme';
import { useAccentScope } from '@/components/accentScope';
import { Story } from '@/types/domain';
import { coverStory, groupStories } from './storyGroups';
import { storyStyle } from './storyStyle';

/**
 * Instagram-style circles, one per category: every story in "Coach Tips" sits behind a single card and
 * plays in sequence when it's tapped. Unseen groups get a gradient ring; fully seen ones fade to a hairline.
 */
export function StoryRail({ stories, onOpen }: { stories: Story[]; onOpen: (category: string) => void }) {
  const { dictionary } = useI18n();
  const groups = groupStories(stories);
  const scope = useAccentScope();
  return <HorizontalRail gap={14}>{groups.map((group) => {
    const look = storyStyle(group.category);
    const name = dictionary.stories.categories[group.category] ?? coverStory(group).title;
    return <PressableScale key={group.category} onPress={() => onOpen(group.category)} haptic="select" accessibilityLabel={`${name}, ${group.stories.length}`} testID={`story-group-${group.category}`} containerStyle={{ width: 78 }}>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <LinearGradient colors={group.viewed ? ['#FFFFFF29', '#FFFFFF29'] : scope.storyRing} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={[styles.ring, group.viewed && { padding: 1.5 }]}>
          <View style={[styles.gap, scope.canvas ? { backgroundColor: scope.canvas } : null]}>
            <LinearGradient colors={[`${look.gradient[0]}33`, `${look.gradient[look.gradient.length - 1]}14`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.thumb}>
              <StoryCover story={coverStory(group)} fallback={<GlyphIcon glyph={look.glyph} size={26} color={look.gradient[0]} />} />
            </LinearGradient>
          </View>
        </LinearGradient>
        <Txt variant="tab" color={group.viewed ? palette.inkMuted : palette.ink} numberOfLines={1}>{name}</Txt>
      </View>
    </PressableScale>;
  })}</HorizontalRail>;
}

const styles = StyleSheet.create({
  ring: { width: 74, height: 74, borderRadius: 37, padding: 3 },
  gap: { flex: 1, borderRadius: 37, backgroundColor: palette.canvas, padding: 3 },
  thumb: { flex: 1, borderRadius: 32, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: palette.surfaceRaised },
});

/** One frame per video URL, shared across renders; failures resolve to null (the category art stays). */
const posters = new Map<string, Promise<VideoThumbnail | null>>();
function videoPoster(uri: string) {
  let poster = posters.get(uri);
  if (!poster) {
    poster = (async () => {
      const player = createVideoPlayer({ uri, useCaching: true });
      try {
        player.muted = true;
        // Frames can only be read once the stream has loaded.
        if (player.status !== 'readyToPlay') {
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => { sub.remove(); reject(new Error('timeout')); }, 15_000);
            const sub = player.addListener('statusChange', ({ status }) => {
              if (status === 'readyToPlay') { clearTimeout(timer); sub.remove(); resolve(); }
              if (status === 'error') { clearTimeout(timer); sub.remove(); reject(new Error('load failed')); }
            });
          });
        }
        const [frame] = await player.generateThumbnailsAsync(1, { maxWidth: 240 });
        return frame ?? null;
      } catch { posters.delete(uri); return null; } finally { player.release(); }
    })();
    posters.set(uri, poster);
  }
  return poster;
}

/**
 * Story card art: the admin's cover (or the story image); for a video without a cover, a frame taken
 * from the video on the device; otherwise the category icon.
 */
function StoryCover({ story, fallback }: { story: Story; fallback: React.ReactNode }) {
  const cover = story.media.thumbnailUrl;
  const video = !cover ? story.media.videoUrl : undefined;
  const [frame, setFrame] = useState<VideoThumbnail | null>(null);
  useEffect(() => {
    if (!video) return;
    let live = true;
    videoPoster(video).then((f) => { if (live) setFrame(f); });
    return () => { live = false; };
  }, [video]);
  if (cover) return <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />;
  if (frame) return <Image source={frame} style={StyleSheet.absoluteFill} contentFit="cover" />;
  return <>{fallback}</>;
}

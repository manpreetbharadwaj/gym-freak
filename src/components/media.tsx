import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useEventListener } from 'expo';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Glyph, mdi } from './primitives';
import { GradientPair, gradients, palette } from '@/theme';
import { Media } from '@/types/domain';
import { AssetKey, muscleImage } from '@/assets';
import { AssetImage } from './AssetImage';

/** Visual identity per muscle group: used for illustrations, chips and charts. */
export const muscleVisuals: Record<string, { glyph: Glyph; gradient: GradientPair; color: string }> = {
  chest: { glyph: mdi('weight-lifter'), gradient: gradients.berry, color: palette.accent },
  back: { glyph: mdi('human-handsup'), gradient: gradients.sky, color: palette.accent },
  shoulders: { glyph: mdi('arm-flex'), gradient: gradients.primary, color: palette.accent },
  biceps: { glyph: mdi('arm-flex'), gradient: gradients.sunrise, color: '#FF5E6E' },
  triceps: { glyph: mdi('arm-flex-outline'), gradient: gradients.citrus, color: '#F07A1A' },
  legs: { glyph: mdi('run'), gradient: gradients.ocean, color: '#1E9FD8' },
  glutes: { glyph: mdi('human'), gradient: ['#FF8FB8', '#FF5FA2'], color: '#F0508F' },
  core: { glyph: mdi('human-male'), gradient: gradients.lime, color: '#22A35A' },
  cardio: { glyph: mdi('heart-pulse'), gradient: gradients.sunrise, color: palette.danger },
  mobility: { glyph: mdi('yoga'), gradient: gradients.lavender, color: '#8C6CFF' },
  'full-body': { glyph: mdi('run-fast'), gradient: ['#5B5CF0', '#9A3CE6'], color: palette.accent },
};
export const visualFor = (muscle?: string) => muscleVisuals[muscle ?? ''] ?? muscleVisuals['full-body'];

/** Warm the image cache before a screen needs it (e.g. the next exercise's poster in the player). */
export function prefetchMedia(media: Media[]) {
  const urls = media.flatMap((m) => [m.thumbnailUrl, m.imageUrl]).filter((url): url is string => !!url);
  if (urls.length) Image.prefetch([...new Set(urls)], 'memory-disk').catch(() => undefined);
}

/**
 * Exercise / workout media: streams the admin-uploaded video when present (video only, no player UI),
 * otherwise a cached thumbnail, otherwise a realistic muscle-group photo, so nothing exercise-specific
 * ships in the bundle. Used everywhere a demo plays: exercise detail, the workout player, cards, stories.
 */
export function ExerciseMedia({ media, muscle, height, rounded = 28, style, autoPlay = true, fallback, sound = false }: { media: Media; muscle?: string; height: number; rounded?: number; style?: StyleProp<ViewStyle>; autoPlay?: boolean; fallback?: AssetKey; /** Play the video's own audio (stories). Exercise demos stay muted. */ sound?: boolean }) {
  return <View style={[{ height, borderRadius: rounded, overflow: 'hidden' }, style]}>
    {/* Realistic local photo for the muscle group until (or unless) HealthyMe media loads. */}
    <AssetImage asset={fallback ?? muscleImage(muscle)} style={StyleSheet.absoluteFill} />
    {media.thumbnailUrl || media.imageUrl ? <ImageLayer uri={(media.thumbnailUrl ?? media.imageUrl)!} /> : null}
    {media.videoUrl && autoPlay ? <VideoLayer key={media.videoUrl} uri={media.videoUrl} sound={sound} /> : null}
  </View>;
}

function ImageLayer({ uri }: { uri: string }) {
  return <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={250} recyclingKey={uri} />;
}

/**
 * Video only: no native or custom controls, no fullscreen, Picture-in-Picture or Live Text, no seeking,
 * and nothing drawn over the picture. Touches pass straight through (tapping reveals nothing). The poster or
 * photo underneath shows while the stream loads and if it fails; a failed stream is retried quietly.
 */
function VideoLayer({ uri, sound }: { uri: string; sound: boolean }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const attempts = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const player = useVideoPlayer({ uri, useCaching: true }, (p) => { p.loop = true; p.muted = !sound; p.showNowPlayingNotification = false; p.play(); });
  useEffect(() => () => clearTimeout(retryTimer.current), []);
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') setFailed(false);
    if (status !== 'error') return;
    setReady(false);
    if (attempts.current >= MAX_RETRIES) { setFailed(true); return; }
    attempts.current += 1;
    retryTimer.current = setTimeout(() => { player.replaceAsync({ uri, useCaching: true }).then(() => player.play()).catch(() => setFailed(true)); }, RETRY_MS * attempts.current);
  });
  if (failed) return null;
  return <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <VideoView player={player} style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]} contentFit="cover" nativeControls={false} fullscreenOptions={{ enable: false }}
      allowsPictureInPicture={false} startsPictureInPictureAutomatically={false} allowsVideoFrameAnalysis={false} requiresLinearPlayback onFirstFrameRender={() => setReady(true)} />
  </View>;
}

const MAX_RETRIES = 2;
const RETRY_MS = 1500;

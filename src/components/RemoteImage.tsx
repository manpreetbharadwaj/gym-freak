import React, { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { motion, palette } from '@/theme';
import { useReducedMotion } from '@/utils/motion';
import { Glyph, GlyphIcon } from './primitives';

/**
 * Admin-managed (server) image: disk-cached, recycled by URL so lists don't flash, downscaled to the frame.
 * Without a URL, or when it fails to load, it shows a neutral surface with an optional glyph for the item —
 * never a different photo standing in for the real one.
 */
export function RemoteImage({ uri, fit = 'cover', style, glyph, glyphSize = 24, placeholder, backdrop, accessibilityLabel }: {
  uri?: string; fit?: 'cover' | 'contain'; style?: StyleProp<ViewStyle>; glyph?: Glyph; glyphSize?: number; /** Custom icon for the empty state (instead of `glyph`). */ placeholder?: React.ReactNode;
  /** Fill behind a `contain` image once it shows (e.g. the light studio backdrop for product shots). */ backdrop?: string; accessibilityLabel?: string;
}) {
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => { setFailed(false); }, [uri]);
  const showing = !!uri && !failed;
  return <View accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} accessibilityRole={accessibilityLabel ? 'image' : undefined} style={[styles.frame, style, showing && fit === 'contain' && backdrop ? { backgroundColor: backdrop } : null]}>
    {!uri || failed
      ? <View style={styles.placeholder}>{placeholder ?? (glyph ? <GlyphIcon glyph={glyph} size={glyphSize} color={palette.inkFaint} /> : null)}</View>
      : <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit={fit} cachePolicy="memory-disk" recyclingKey={uri} contentPosition="center" transition={reduced ? 0 : motion.fast} allowDownscaling onError={() => setFailed(true)} accessible={false} />}
  </View>;
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: palette.grayBg },
  placeholder: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});

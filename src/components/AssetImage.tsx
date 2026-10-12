import React, { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Icon } from './Icon';
import { AssetKey, imageAsset } from '@/assets/images';
import { motion, palette } from '@/theme';
import { useReducedMotion } from '@/utils/motion';

/** Bundled photo for screens outside the admin-managed sections (Profile), with a neutral fallback if it fails. */
export function AssetImage({ asset, style, contentFit = 'cover', accessibilityLabel }: {
  asset: AssetKey; style?: StyleProp<ViewStyle>; contentFit?: 'cover' | 'contain'; accessibilityLabel?: string;
}) {
  const entry = imageAsset(asset);
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => { setFailed(false); }, [asset]);
  return <View accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} accessibilityRole={accessibilityLabel ? 'image' : undefined} style={[styles.frame, style]}>
    {failed ? <View style={styles.placeholder}>
      <Icon name="image" size="lg" color={palette.inkMuted} />
    </View> : <Image
      source={entry.source}
      style={StyleSheet.absoluteFill}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      recyclingKey={asset}
      transition={reduced ? 0 : motion.fast}
      allowDownscaling
      onError={() => setFailed(true)}
      accessible={false}
    />}
  </View>;
}

export default AssetImage;

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: palette.grayBg },
  placeholder: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});

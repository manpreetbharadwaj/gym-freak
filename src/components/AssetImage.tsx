import React, { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AssetKey, imageAsset } from '@/assets/images';
import { ResistanceBandIcon } from '@/assets/icons/ResistanceBandIcon';
import { palette } from '@/theme';
import { useReducedMotion } from '@/utils/motion';

/** Cached, bounded local photography with honest neutral fallbacks for missing artwork. */
export function AssetImage({ asset, style, contentFit = 'cover', accessibilityLabel }: {
  asset: AssetKey; style?: StyleProp<ViewStyle>; contentFit?: 'cover' | 'contain'; accessibilityLabel?: string;
}) {
  const entry = imageAsset(asset);
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => { setFailed(false); }, [asset]);
  const fallback = entry.placeholder || failed;
  return <View accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} accessibilityRole={accessibilityLabel ? 'image' : undefined} style={[styles.frame, style]}>
    {fallback ? <View style={styles.placeholder}>
      {asset === 'equipment/resistance-bands'
        ? <ResistanceBandIcon />
        : <MaterialCommunityIcons name={asset === 'onboarding/weekly-trophy' ? 'trophy-outline' : 'image-outline'} size={28} color={palette.inkMuted} />}
    </View> : <Image
      source={entry.source}
      style={StyleSheet.absoluteFill}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      recyclingKey={asset}
      transition={reduced ? 0 : 220}
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

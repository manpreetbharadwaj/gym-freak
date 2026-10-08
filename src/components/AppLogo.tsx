import React, { useEffect } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useReducedMotion } from '@/utils/motion';

const appLogo = require('../assets/app_logo.png');

type AppLogoProps = {
  size?: number;
  width?: number;
  height?: number;
  glow?: boolean;
  animated?: boolean;
  rounded?: boolean;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

/** The single renderer for the original Gym Freak logo asset. */
export function AppLogo({
  size = 56,
  width,
  height,
  glow = false,
  animated = false,
  rounded = false,
  style,
  imageStyle,
  accessibilityLabel = 'Gym Freak logo',
}: AppLogoProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(animated && !reducedMotion ? 0 : 1);
  const logoWidth = width ?? height ?? size;
  const logoHeight = height ?? width ?? size;
  const cornerRadius = Math.min(18, Math.max(14, Math.min(logoWidth, logoHeight) * 0.36));

  useEffect(() => {
    progress.value = animated && !reducedMotion
      ? withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System })
      : 1;
  }, [animated, progress, reducedMotion]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.92 + progress.value * 0.08 }],
  }));

  return <Animated.View style={[{ width: logoWidth, height: logoHeight }, entranceStyle, style]}>
    {glow ? <View pointerEvents="none" style={[styles.glow, { borderRadius: Math.min(logoWidth, logoHeight) * 0.32 }]} /> : null}
    <View style={[styles.frame, rounded && styles.roundedFrame, rounded && { borderRadius: cornerRadius }]}>
      <Image
        source={appLogo}
        resizeMode="contain"
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={[styles.image, imageStyle]}
      />
    </View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  frame: { width: '100%', height: '100%' },
  roundedFrame: {
    padding: 4,
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  image: { flex: 1, width: '100%', height: '100%' },
  glow: {
    position: 'absolute',
    top: '8%',
    right: '8%',
    bottom: '8%',
    left: '8%',
    backgroundColor: 'rgba(34,184,245,0.16)',
    shadowColor: '#22B8F5',
    shadowOpacity: 0.45,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});

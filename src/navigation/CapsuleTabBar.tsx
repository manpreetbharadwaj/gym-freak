import React, { useEffect, useMemo } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Motion, { Easing, interpolate, ReduceMotion, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { GlyphIcon, mdi, Txt } from '@/components';
import { useI18n } from '@/i18n';
import { fonts, gradients, palette } from '@/theme';
import { haptics } from '@/utils/haptics';
import { MainTabParamList } from './types';
import { dockPath, DockShape } from './dockShape';
import { setTabBarKeyboard, showTabBar, useTabBarProgress } from './TabBarVisibilityContext';

const icons: Record<keyof MainTabParamList, [string, string]> = {
  Home: ['home-variant', 'home-variant-outline'],
  Workout: ['dumbbell', 'dumbbell'],
  Explore: ['compass', 'compass-outline'],
  Activity: ['run-fast', 'run'],
  Progress: ['chart-box', 'chart-box-outline'],
};

/** Visible dock height (the safe-area inset is added below it, never inside it). */
export const DOCK_HEIGHT = 60;
const DOCK_MARGIN_HORIZONTAL = 16;
const DOCK_MAX_WIDTH = 480;
const DOCK_RADIUS = 20;
/** Breathing room between the dock and the system navigation / home indicator. */
const DOCK_GAP = 10;
const TAB_ICON_SIZE = 21;
const CENTRE_SIZE = 50;
/** How far the Workout button rises above the dock's top edge. */
const CENTRE_RAISE = 15;
const RING_GAP = 4;
/** Matches where the other labels end (their icon + label stack is centred in the 60px dock). */
const CENTRE_LABEL_BOTTOM = 8;
const SHAPE = { height: DOCK_HEIGHT, radius: DOCK_RADIUS, notchCenterY: CENTRE_SIZE / 2 - CENTRE_RAISE, notchRadius: CENTRE_SIZE / 2 + RING_GAP, fillet: 9 };

const pressTiming = { duration: 140, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };

/**
 * Floating capsule tab bar: compact labelled tabs and a raised Workout button sitting in a cradle
 * cut into the dock. Sits above the system navigation area via the bottom safe-area inset, hides
 * on scroll-down / keyboard and returns on scroll-up, focus changes and tab switches.
 */
export function CapsuleTabBar({ state, navigation }: BottomTabBarProps) {
  const { dictionary } = useI18n();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { progress, keyboardOpen } = useTabBarProgress();
  const activeRouteKey = state.routes[state.index]?.key;
  const dockWidth = Math.min(windowWidth - DOCK_MARGIN_HORIZONTAL * 2, DOCK_MAX_WIDTH);
  const shape: DockShape = useMemo(() => ({ ...SHAPE, width: dockWidth }), [dockWidth]);
  const path = useMemo(() => dockPath(shape), [shape]);
  const bottom = insets.bottom + DOCK_GAP;
  // Far enough to clear the raised button and the shadow on any inset (3-button nav included).
  const hideDistance = DOCK_HEIGHT + CENTRE_RAISE + bottom + 16;

  useEffect(() => { showTabBar(); }, [activeRouteKey]);

  // The dock is absolutely positioned; without this it would ride up on top of the Android keyboard.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subs = [Keyboard.addListener(showEvent, () => setTabBarKeyboard(true)), Keyboard.addListener(hideEvent, () => setTabBarKeyboard(false))];
    return () => subs.forEach((s) => s.remove());
  }, []);

  const shown = useDerivedValue(() => Math.min(progress.value, 1 - keyboardOpen.value));
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shown.value, [0, 1], [0.4, 1]),
    transform: [{ translateY: (1 - shown.value) * hideDistance }],
  }));

  return <>
    {/* Edge-to-edge Android draws content under the system buttons; a soft scrim keeps them legible. */}
    {Platform.OS === 'android' && insets.bottom > 0
      ? <LinearGradient pointerEvents="none" colors={['rgba(2,6,11,0)', 'rgba(2,6,11,0.92)', 'rgba(2,6,11,0.97)']} locations={[0, 10 / (insets.bottom + 10), 1]} style={[styles.systemScrim, { height: insets.bottom + 10 }]} />
      : null}
    <Motion.View pointerEvents="box-none" style={[styles.wrapper, { paddingBottom: bottom }, animatedStyle]}>
      <View pointerEvents="box-none" style={[styles.dock, { width: dockWidth }]}>
        <Svg pointerEvents="none" width={dockWidth} height={DOCK_HEIGHT + 6} style={styles.surface}>
          {/* Two offset copies draw a soft, path-shaped shadow on both platforms (Android elevation can't follow the cradle). */}
          <Path d={path} fill="rgba(0,0,0,0.22)" translateY={5} />
          <Path d={path} fill="rgba(0,0,0,0.30)" translateY={2} />
          <Path d={path} fill={Platform.OS === 'ios' ? 'rgba(11,19,32,0.94)' : '#0B1320'} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
        </Svg>
        {state.routes.map((route, index) => {
          const name = route.name as keyof MainTabParamList;
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) { haptics.select(); navigation.navigate(route.name); }
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
          return name === 'Workout'
            ? <CentreTab key={route.key} focused={focused} label={dictionary.nav[name]} onPress={onPress} onLongPress={onLongPress} />
            : <Tab key={route.key} focused={focused} label={dictionary.nav[name]} icon={icons[name]} onPress={onPress} onLongPress={onLongPress} />;
        })}
      </View>
    </Motion.View>
  </>;
}

function usePressScale(scaleTo: number) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return { animatedStyle, onPressIn: () => { scale.value = withTiming(scaleTo, pressTiming); }, onPressOut: () => { scale.value = withTiming(1, pressTiming); } };
}

function useFocus(focused: boolean) {
  const focus = useSharedValue(focused ? 1 : 0);
  useEffect(() => { focus.value = withTiming(focused ? 1 : 0, { duration: 180, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }); }, [focus, focused]);
  return focus;
}

type TabProps = { focused: boolean; label: string; onPress: () => void; onLongPress: () => void };

function Tab({ focused, label, icon, onPress, onLongPress }: TabProps & { icon: [string, string] }) {
  const focus = useFocus(focused);
  const press = usePressScale(0.97);
  const pillStyle = useAnimatedStyle(() => ({ opacity: focus.value, transform: [{ scale: interpolate(focus.value, [0, 1], [0.85, 1]) }] }));
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} testID={`tab-${label}`} onPressIn={press.onPressIn} onPressOut={press.onPressOut} onPress={onPress} onLongPress={onLongPress} style={styles.tab}>
    <Motion.View style={[styles.tabContent, press.animatedStyle]}>
      <View style={styles.iconSlot}>
        <Motion.View style={[styles.activePill, pillStyle]} />
        <GlyphIcon glyph={mdi(focused ? icon[0] : icon[1])} size={TAB_ICON_SIZE} color={focused ? palette.accent : palette.inkFaint} />
      </View>
      <Txt variant="tab" color={focused ? palette.white : palette.inkMuted} numberOfLines={1} style={[styles.label, !focused && styles.labelIdle]}>{label}</Txt>
    </Motion.View>
  </Pressable>;
}

function CentreTab({ focused, label, onPress, onLongPress }: TabProps) {
  const focus = useFocus(focused);
  const press = usePressScale(0.96);
  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(focus.value, [0, 1], [1, 1.05]) }] }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: interpolate(focus.value, [0, 1], [0, 1]) }));
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} testID={`tab-${label}`} onPressIn={press.onPressIn} onPressOut={press.onPressOut} onPress={onPress} onLongPress={onLongPress} style={styles.centreSlot}>
    <Motion.View style={[styles.centreContent, press.animatedStyle]}>
      <Motion.View style={[styles.centre, buttonStyle]}>
        <Motion.View pointerEvents="none" style={[styles.centreHalo, haloStyle]} />
        <View style={styles.centreShadow}>
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.centreFill}>
            {/* Top highlight gives the button its lifted, lit-from-above edge. */}
            <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']} style={styles.centreGloss} />
            <GlyphIcon glyph={mdi('dumbbell')} size={24} color={palette.white} />
          </LinearGradient>
        </View>
      </Motion.View>
      <Txt variant="tab" color={focused ? palette.white : palette.inkMuted} numberOfLines={1} style={[styles.label, !focused && styles.labelIdle]}>{label}</Txt>
    </Motion.View>
  </Pressable>;
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  systemScrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  // The container includes the strip the Workout button rises into, so its whole face is tappable (Android drops touches outside a parent's bounds).
  dock: { flexDirection: 'row', alignItems: 'stretch', height: DOCK_HEIGHT + CENTRE_RAISE, paddingHorizontal: 4 },
  surface: { position: 'absolute', top: CENTRE_RAISE, left: 0 },
  tab: { flex: 1, minHeight: 44, marginTop: CENTRE_RAISE, alignItems: 'center', justifyContent: 'center' },
  tabContent: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  iconSlot: { width: 46, height: 28, alignItems: 'center', justifyContent: 'center' },
  activePill: { position: 'absolute', top: 0, left: 0, width: 46, height: 28, borderRadius: 14, backgroundColor: 'rgba(34,184,245,0.14)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(34,184,245,0.35)' },
  label: { maxWidth: 72, fontSize: 10.5, lineHeight: 13 },
  labelIdle: { fontFamily: fonts.medium },
  centreSlot: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: CENTRE_LABEL_BOTTOM },
  centreContent: { alignItems: 'center', justifyContent: 'flex-end' },
  // Button centre lands on the cradle centre: its bottom edge sits (height − raise − size) above the dock's bottom.
  centre: { position: 'absolute', bottom: DOCK_HEIGHT + CENTRE_RAISE - CENTRE_SIZE - CENTRE_LABEL_BOTTOM, width: CENTRE_SIZE, height: CENTRE_SIZE, alignItems: 'center', justifyContent: 'center' },
  centreHalo: { position: 'absolute', width: CENTRE_SIZE + 8, height: CENTRE_SIZE + 8, borderRadius: (CENTRE_SIZE + 8) / 2, backgroundColor: 'rgba(34,184,245,0.16)' },
  centreShadow: {
    width: CENTRE_SIZE, height: CENTRE_SIZE, borderRadius: CENTRE_SIZE / 2, backgroundColor: '#1DAEEA',
    ...Platform.select({
      ios: { shadowColor: '#22B8F5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 14 },
      android: { elevation: 6, shadowColor: '#22B8F5' },
      default: {},
    }),
  },
  centreFill: { flex: 1, borderRadius: CENTRE_SIZE / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  centreGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: CENTRE_SIZE / 2 },
});

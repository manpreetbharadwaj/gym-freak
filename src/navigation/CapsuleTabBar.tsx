import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, LayoutChangeEvent, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Motion, { interpolate, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Txt } from '@/components';
import { Icon, IconName } from '@/components/Icon';
import { useI18n } from '@/i18n';
import { fonts, iconSizes, palette, pressScales, springs, timings } from '@/theme';
import { brandGradient, logoPalette } from '@/theme/brandAccent';
import { haptics } from '@/utils/haptics';
import { MainTabParamList } from './types';
import { dockPath, DockShape } from './dockShape';
import { setTabBarKeyboard, showTabBar, useTabBarProgress } from './TabBarVisibilityContext';
import { WorkoutTabAnimation } from './WorkoutTabAnimation';

const icons: Record<keyof MainTabParamList, IconName> = { Home: 'home', Workout: 'workout', Explore: 'explore', Activity: 'activity', Progress: 'progress' };

/** Visible dock height (the safe-area inset is added below it, never inside it). */
export const DOCK_HEIGHT = 60;
const DOCK_MARGIN_HORIZONTAL = 16;
const DOCK_MAX_WIDTH = 480;
const DOCK_RADIUS = 20;
/** Breathing room between the dock and the system navigation / home indicator. */
const DOCK_GAP = 10;
const TAB_ICON_SIZE = iconSizes.md;
const CENTRE_SIZE = 50;
/** The mini workout character's box inside the centre button (its corners stay inside the circle). */
const CHARACTER_SIZE = 34;
/** How far the Workout button rises above the dock's top edge. */
const CENTRE_RAISE = 15;
const RING_GAP = 4;
/** Matches where the other labels end (their icon + label stack is centred in the 60px dock). */
const CENTRE_LABEL_BOTTOM = 8;
const SHAPE = { height: DOCK_HEIGHT, radius: DOCK_RADIUS, notchCenterY: CENTRE_SIZE / 2 - CENTRE_RAISE, notchRadius: CENTRE_SIZE / 2 + RING_GAP, fillet: 9 };

const PILL_WIDTH = 46;
const PILL_HEIGHT = 28;

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

  /*
   * One selection pill travels between tabs instead of each tab fading its own. Positions come from each
   * tab's measured layout (so any width, font scale or rotation works); the pill rides a spring from wherever
   * it currently is, so rapid taps redirect it mid-flight rather than queueing. On the raised Workout button
   * the pill glides to the centre and fades out (the button has its own halo).
   */
  const [slots, setSlots] = useState<Record<number, { x: number; width: number }>>({});
  const [pillTop, setPillTop] = useState<number | null>(null);
  const onSlotLayout = useCallback((index: number, x: number, width: number) => {
    setSlots((prev) => (prev[index]?.x === x && prev[index]?.width === width ? prev : { ...prev, [index]: { x, width } }));
  }, []);
  const pillX = useSharedValue(0);
  const pillVisible = useSharedValue(0);
  const placed = useRef(false);
  const centreIndex = state.routes.findIndex((r) => r.name === 'Workout');
  useEffect(() => {
    const slot = slots[state.index];
    if (!slot || pillTop == null) return;
    const target = slot.x + slot.width / 2 - PILL_WIDTH / 2;
    const onCentre = state.index === centreIndex;
    if (!placed.current) {
      // First measurement (or a relayout before any tap): jump into place, never slide in from 0.
      placed.current = true;
      pillX.value = target;
      pillVisible.value = onCentre ? 0 : 1;
      return;
    }
    pillX.value = withSpring(target, springs.slide);
    pillVisible.value = withTiming(onCentre ? 0 : 1, timings.standard);
  }, [slots, pillTop, state.index, centreIndex, pillX, pillVisible]);
  const pillStyle = useAnimatedStyle(() => ({ opacity: pillVisible.value, transform: [{ translateX: pillX.value }, { scale: interpolate(pillVisible.value, [0, 1], [0.8, 1]) }] }));

  // The dock is absolutely positioned; without this it would ride up on top of the Android keyboard.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subs = [Keyboard.addListener(showEvent, () => setTabBarKeyboard(true)), Keyboard.addListener(hideEvent, () => setTabBarKeyboard(false))];
    return () => subs.forEach((s) => s.remove());
  }, []);

  const shown = useDerivedValue(() => Math.min(progress.value, 1 - keyboardOpen.value));
  // The character only appears while the tabs are on top (not under a pushed or full-screen screen) and the dock is in view.
  const tabsOnTop = useIsFocused();
  const dockInView = useCallback(() => shown.value > 0.95, [shown]);
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
        {pillTop != null ? <Motion.View pointerEvents="none" style={[styles.activePill, { top: pillTop }, pillStyle]}>
          {/* Selected state: a faint deep-orange → amber wash with an orange hairline (the dock itself stays dark). */}
          <LinearGradient colors={[`${logoPalette.deep}38`, `${logoPalette.amber}24`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        </Motion.View> : null}
        {state.routes.map((route, index) => {
          const name = route.name as keyof MainTabParamList;
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) { haptics.select(); navigation.navigate(route.name); }
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
          return name === 'Workout'
            ? <CentreTab key={route.key} index={index} focused={focused} label={dictionary.nav[name]} onPress={onPress} onLongPress={onLongPress} onSlotLayout={onSlotLayout} characterEnabled={tabsOnTop} dockInView={dockInView} />
            : <Tab key={route.key} index={index} focused={focused} label={dictionary.nav[name]} icon={icons[name]} onPress={onPress} onLongPress={onLongPress} onSlotLayout={onSlotLayout} onIconTop={setPillTop} />;
        })}
      </View>
    </Motion.View>
  </>;
}

function usePressScale(scaleTo: number) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return { animatedStyle, onPressIn: () => { scale.value = withTiming(scaleTo, timings.press); }, onPressOut: () => { scale.value = withSpring(1, springs.snappy); } };
}

function useFocus(focused: boolean) {
  const focus = useSharedValue(focused ? 1 : 0);
  useEffect(() => { focus.value = withTiming(focused ? 1 : 0, timings.standard); }, [focus, focused]);
  return focus;
}

type TabProps = { index: number; focused: boolean; label: string; onPress: () => void; onLongPress: () => void; onSlotLayout: (index: number, x: number, width: number) => void };

function Tab({ index, focused, label, icon, onPress, onLongPress, onSlotLayout, onIconTop }: TabProps & { icon: IconName; onIconTop: (top: number) => void }) {
  const focus = useFocus(focused);
  const press = usePressScale(pressScales.icon + 0.05);
  const slotY = useRef(0);
  // Active and idle looks are stacked and cross-faded, so colour, weight and fill change smoothly (no glyph pop).
  const activeStyle = useAnimatedStyle(() => ({ opacity: focus.value }));
  const idleStyle = useAnimatedStyle(() => ({ opacity: 1 - focus.value }));
  const liftStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -1.5 * focus.value }, { scale: 1 + 0.06 * focus.value }] }));
  const onLayout = (e: LayoutChangeEvent) => { slotY.current = e.nativeEvent.layout.y; onSlotLayout(index, e.nativeEvent.layout.x, e.nativeEvent.layout.width); };
  // The icon slot is the top of the content stack; the pill sits exactly behind it.
  const onContentLayout = (e: LayoutChangeEvent) => onIconTop(slotY.current + e.nativeEvent.layout.y);
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} testID={`tab-${label}`} onPressIn={press.onPressIn} onPressOut={press.onPressOut} onPress={onPress} onLongPress={onLongPress} onLayout={onLayout} style={styles.tab}>
    <Motion.View onLayout={onContentLayout} style={[styles.tabContent, press.animatedStyle]}>
      <Motion.View style={[styles.iconSlot, liftStyle]}>
        <Motion.View style={[styles.iconLayer, idleStyle]}><Icon name={icon} size={TAB_ICON_SIZE} color={palette.inkMuted} variant="outline" strokeWidth={1.75} /></Motion.View>
        <Motion.View style={[styles.iconLayer, activeStyle]}><Icon name={icon} size={TAB_ICON_SIZE} color={logoPalette.orange} variant="filled" strokeWidth={2} /></Motion.View>
      </Motion.View>
      <View>
        <Motion.View style={activeStyle}><Txt variant="tab" color={palette.white} numberOfLines={1} style={styles.label}>{label}</Txt></Motion.View>
        <Motion.View style={[styles.labelLayer, idleStyle]}><Txt variant="tab" color={palette.inkMuted} numberOfLines={1} align="center" style={[styles.label, styles.labelIdle]}>{label}</Txt></Motion.View>
      </View>
    </Motion.View>
  </Pressable>;
}

function CentreTab({ index, focused, label, onPress, onLongPress, onSlotLayout, characterEnabled, dockInView }: TabProps & { characterEnabled: boolean; dockInView: () => boolean }) {
  const focus = useFocus(focused);
  const press = usePressScale(0.96);
  const onLayout = (e: LayoutChangeEvent) => onSlotLayout(index, e.nativeEvent.layout.x, e.nativeEvent.layout.width);
  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(focus.value, [0, 1], [1, 1.05]) }] }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: interpolate(focus.value, [0, 1], [0, 1]) }));
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} testID={`tab-${label}`} onPressIn={press.onPressIn} onPressOut={press.onPressOut} onPress={onPress} onLongPress={onLongPress} onLayout={onLayout} style={styles.centreSlot}>
    <Motion.View style={[styles.centreContent, press.animatedStyle]}>
      <Motion.View style={[styles.centre, buttonStyle]}>
        <Motion.View pointerEvents="none" style={[styles.centreHalo, haloStyle]} />
        <View style={styles.centreShadow}>
          <LinearGradient colors={brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.centreFill}>
            {/* Top highlight gives the button its lifted, lit-from-above edge. */}
            <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']} style={styles.centreGloss} />
            <WorkoutTabAnimation size={CHARACTER_SIZE} color={palette.white} enabled={characterEnabled} canPlay={dockInView}>
              <Icon name="workout" size={TAB_ICON_SIZE} color={palette.white} strokeWidth={2} />
            </WorkoutTabAnimation>
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
  iconSlot: { width: PILL_WIDTH, height: PILL_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  iconLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  labelLayer: { position: 'absolute', top: 0, left: -12, right: -12, alignItems: 'center' },
  activePill: { position: 'absolute', left: 0, width: PILL_WIDTH, height: PILL_HEIGHT, borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: `${logoPalette.orange}6B` },
  label: { maxWidth: 72 },
  labelIdle: { fontFamily: fonts.medium },
  centreSlot: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: CENTRE_LABEL_BOTTOM },
  centreContent: { alignItems: 'center', justifyContent: 'flex-end' },
  // Button centre lands on the cradle centre: its bottom edge sits (height − raise − size) above the dock's bottom.
  centre: { position: 'absolute', bottom: DOCK_HEIGHT + CENTRE_RAISE - CENTRE_SIZE - CENTRE_LABEL_BOTTOM, width: CENTRE_SIZE, height: CENTRE_SIZE, alignItems: 'center', justifyContent: 'center' },
  centreHalo: { position: 'absolute', width: CENTRE_SIZE + 8, height: CENTRE_SIZE + 8, borderRadius: (CENTRE_SIZE + 8) / 2, backgroundColor: `${logoPalette.orange}2E` },
  centreShadow: {
    width: CENTRE_SIZE, height: CENTRE_SIZE, borderRadius: CENTRE_SIZE / 2, backgroundColor: logoPalette.deep,
    ...Platform.select({
      ios: { shadowColor: logoPalette.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 14 },
      android: { elevation: 6, shadowColor: logoPalette.orange },
      default: {},
    }),
  },
  centreFill: { flex: 1, borderRadius: CENTRE_SIZE / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  centreGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: CENTRE_SIZE / 2 },
});

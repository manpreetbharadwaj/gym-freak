import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { SharedValue } from 'react-native-reanimated';
import { Easing, makeMutable, ReduceMotion, useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated';

/** Scroll distance (in one direction) before the dock reacts, so tiny movements never toggle it. */
export const TAB_BAR_HIDE_THRESHOLD = 14;
export const TAB_BAR_SHOW_THRESHOLD = 10;
export const TAB_BAR_VISIBILITY_DURATION = 210;

/**
 * One app-wide controller (there is a single tab bar). `progress` animates 1 (shown) → 0 (hidden);
 * the tab bar turns it into translateY using its own measured height + safe-area inset.
 * Scroll positions are tracked per screen (see useTabBarOnScroll), so switching tabs never
 * compares offsets from two different lists.
 */
const progress = makeMutable(1);
const target = makeMutable(1);
const keyboardOpen = makeMutable(0);

const timing = { duration: TAB_BAR_VISIBILITY_DURATION, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };

function setVisible(next: 0 | 1) {
  'worklet';
  if (target.value === next) return;
  target.value = next;
  progress.value = withTiming(next, timing);
}

/** Read by the tab bar only. */
export function useTabBarProgress(): { progress: SharedValue<number>; keyboardOpen: SharedValue<number> } {
  return { progress, keyboardOpen };
}

export const showTabBar = () => setVisible(1);
export const hideTabBar = () => setVisible(0);
export const setTabBarKeyboard = (open: boolean) => { keyboardOpen.value = withTiming(open ? 1 : 0, { duration: 150, reduceMotion: ReduceMotion.System }); };

/**
 * Hide-on-scroll for a tab screen: attach `onScroll` to an Animated.ScrollView / Animated.FlatList.
 * Scrolling down past the threshold hides the dock, scrolling up shows it, the top always shows it,
 * and it is shown again whenever the screen regains focus (tab switch, back from a pushed screen).
 */
export function useTabBarOnScroll() {
  const lastOffset = useSharedValue(0);
  const direction = useSharedValue(0);
  const distance = useSharedValue(0);

  useFocusEffect(useCallback(() => {
    direction.value = 0;
    distance.value = 0;
    setVisible(1);
  }, [direction, distance]));

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const offset = event.contentOffset.y;
      const delta = offset - lastOffset.value;
      lastOffset.value = offset;

      // Top of the list, iOS rubber-band and pull-to-refresh: always visible.
      if (offset <= 4) {
        direction.value = 0;
        distance.value = 0;
        setVisible(1);
        return;
      }
      // Bottom rubber-band on iOS reports a shrinking offset; ignore movement past the end.
      if (offset + event.layoutMeasurement.height > event.contentSize.height + 1) return;
      if (Math.abs(delta) < 0.5) return;

      const next = delta > 0 ? 1 : -1;
      if (direction.value !== next) { direction.value = next; distance.value = 0; }
      distance.value += Math.abs(delta);

      if (next === 1 && distance.value > TAB_BAR_HIDE_THRESHOLD) setVisible(0);
      else if (next === -1 && distance.value > TAB_BAR_SHOW_THRESHOLD) setVisible(1);
    },
  });

  return { onScroll, scrollEventThrottle: 16 };
}

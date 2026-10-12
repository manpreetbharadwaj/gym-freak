import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Motion, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { haptics } from '@/utils/haptics';
import { palette, radius } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Txt } from './primitives';

export type SwipeAction = { key: string; label: string; icon: IconName; color: string; onPress: () => void };

const ACTION_WIDTH = 76;

/**
 * Row that swipes left to reveal actions. The actions only *reveal* — nothing fires from the swipe
 * itself — so a stray horizontal drag can never complete or delete something; the row's own buttons
 * stay as the accessible (non-gesture) path. Vertical scrolling wins until the drag is clearly sideways.
 */
export function SwipeRow({ actions, children, cornerRadius = radius.lg }: { actions: SwipeAction[]; children: React.ReactNode; cornerRadius?: number }) {
  const ref = useRef<SwipeableMethods>(null);
  if (!actions.length) return <>{children}</>;
  return <ReanimatedSwipeable ref={ref} friction={1.6} rightThreshold={ACTION_WIDTH * 0.6} overshootRight={false} dragOffsetFromRightEdge={14}
    onSwipeableWillOpen={() => haptics.selection()}
    renderRightActions={(progress) => <Actions actions={actions} progress={progress} cornerRadius={cornerRadius} close={() => ref.current?.close()} />}>
    {children}
  </ReanimatedSwipeable>;
}

function Actions({ actions, progress, cornerRadius, close }: { actions: SwipeAction[]; progress: SharedValue<number>; cornerRadius: number; close: () => void }) {
  // Buttons ease in as the row opens rather than sitting fully drawn behind it.
  const revealStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 0.6, 1], [0, 0.6, 1]), transform: [{ scale: interpolate(progress.value, [0, 1], [0.85, 1]) }] }));
  return <View style={[styles.actions, { width: ACTION_WIDTH * actions.length }]}>
    {actions.map((a) => <Motion.View key={a.key} style={[styles.actionSlot, revealStyle]}>
      <Pressable accessibilityRole="button" accessibilityLabel={a.label} onPress={() => { close(); a.onPress(); }}
        style={({ pressed }) => [styles.action, { borderRadius: cornerRadius, backgroundColor: `${a.color}22`, borderColor: `${a.color}55` }, pressed && { opacity: 0.7 }]}>
        <Icon name={a.icon} size="sm" color={a.color} />
        <Txt variant="tab" color={palette.ink}>{a.label}</Txt>
      </Pressable>
    </Motion.View>)}
  </View>;
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', paddingLeft: 8, paddingBottom: 12 },
  actionSlot: { flex: 1, paddingLeft: 6 },
  action: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1 },
});

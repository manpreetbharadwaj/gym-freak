import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { GlyphIcon, MeshBackground, mdi, Txt } from './primitives';
import { haptics } from '@/utils/haptics';
import { useTabBarOnScroll } from '@/navigation/TabBarVisibilityContext';
import { gutter, palette, radius, Scene, scenes, shadow, controls } from '@/theme';

/** Space the floating tab bar occupies above the safe-area inset (60 dock + 10 gap + breathing room), so content never ends behind it. */
export const TAB_BAR_SPACE = 96;

export function Screen({ children, scene = scenes.violet, scroll = true, refreshing, onRefresh, tabBar = false, contentStyle, header, mesh = true }: {
  children: React.ReactNode; scene?: Scene; scroll?: boolean; refreshing?: boolean; onRefresh?: () => void; tabBar?: boolean; contentStyle?: StyleProp<ViewStyle>; header?: React.ReactNode; mesh?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const Scroller = tabBar ? TabBarScrollView : ScrollView;
  const padding = { paddingTop: header ? 8 : insets.top + 12, paddingBottom: (tabBar ? TAB_BAR_SPACE : 32) + insets.bottom };
  return <View style={[styles.root, { backgroundColor: scene.background }]}>
    <StatusBar style="light" />
    {mesh ? <MeshBackground base={scene.background} blobs={scene.blobs} animated={false} layout="top" /> : null}
    {header ? <View style={{ paddingTop: insets.top }}>{header}</View> : null}
    {scroll
      ? <Scroller showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, padding, contentStyle]} refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={scene.accent} /> : undefined}>{children}</Scroller>
      : <View style={[styles.content, padding, { flex: 1 }, contentStyle]}>{children}</View>}
    {/* Scrolled content never runs under the clock: a solid backdrop behind the status bar. */}
    {/* Scrolled content fades out under the clock instead of hitting a hard band. */}
    {!header ? <LinearGradient pointerEvents="none" colors={[palette.canvasHigh, `${palette.canvasHigh}E6`, `${palette.canvasHigh}00`]} locations={[0, 0.7, 1]} style={[styles.statusBackdrop, { height: insets.top + 14 }]} /> : null}
  </View>;
}

/** Tab screens hide the floating tab bar while scrolling down (Instagram-style) and bring it back on scroll up. */
function TabBarScrollView(props: React.ComponentProps<typeof ScrollView>) {
  const tabBarScroll = useTabBarOnScroll();
  return <Animated.ScrollView {...props} {...tabBarScroll} />;
}

export function Header({ title, onBack, right, transparent }: { title?: string; onBack?: () => void; right?: React.ReactNode; transparent?: boolean }) {
  return <View style={[styles.header, transparent && { position: 'absolute', left: 0, right: 0, zIndex: 5 }]}>
    {onBack ? <IconCircle glyph={mdi('chevron-left')} onPress={onBack} label="Back" /> : <View style={{ width: 44 }} />}
    {title ? <Txt variant="h3" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>{title}</Txt> : <View style={{ flex: 1 }} />}
    <View style={{ minWidth: 44, alignItems: 'flex-end' }}>{right}</View>
  </View>;
}

export function IconCircle({ glyph, onPress, label, active, color = palette.ink, size = controls.iconButton.lg }: { glyph: ReturnType<typeof mdi>; onPress: () => void; label: string; active?: boolean; color?: string; size?: number }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={() => { haptics.tap(); onPress(); }} style={({ pressed }) => [styles.iconCircle, { width: size, height: size, borderRadius: size / 2, transform: [{ scale: pressed ? 0.94 : 1 }] }, active && { backgroundColor: `${palette.coral}26`, borderColor: `${palette.coral}66` }]}>
    <GlyphIcon glyph={glyph} size={size * 0.52} color={color} />
  </Pressable>;
}

export function Section({ title, action, onAction, children, style }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ marginTop: 28 }, style]}>
    <View style={styles.sectionHeader}>
      <Txt variant="title">{title}</Txt>
      {action && onAction ? <Pressable hitSlop={10} onPress={onAction} accessibilityRole="button" style={({ pressed }) => [styles.sectionAction, pressed && { opacity: 0.6 }]}><Txt variant="label" color={palette.accent}>{action}</Txt><GlyphIcon glyph={mdi('chevron-right')} size={16} color={palette.accent} /></Pressable> : null}
    </View>
    {children}
  </View>;
}

export function Card({ children, style, padded = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  return <View style={[styles.card, padded && { padding: 16 }, shadow(undefined, 0.6), style]}>{children}</View>;
}

/** Bleeds a horizontal list to the screen edges while keeping the gutter on the first/last item. */
export function HorizontalRail({ children, gap = 12 }: { children: React.ReactNode; gap?: number }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -gutter }} contentContainerStyle={{ paddingHorizontal: gutter, gap, paddingVertical: 6 }}>{children}</ScrollView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  statusBackdrop: { position: 'absolute', top: 0, left: 0, right: 0 },
  content: { paddingHorizontal: gutter, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: gutter, paddingVertical: 8, gap: 12 },
  iconCircle: { backgroundColor: palette.glass, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.lineStrong, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  card: { backgroundColor: palette.surface, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});

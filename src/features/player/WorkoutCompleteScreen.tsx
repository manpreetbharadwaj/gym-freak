import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomBar, GlyphIcon, GradientButton, IconButton, MeshBackground, mdi, Txt } from '@/components';
import { StatTile } from '@/components/cards';
import { useProfile, useReferral } from '@/hooks/queries';
import { format, useI18n } from '@/i18n';
import { RootScreenProps } from '@/navigation/types';
import { gradients, gutter, palette, radius, scenes, shadow } from '@/theme';
import { haptics } from '@/utils/haptics';
import { ShareComposer } from '@/features/sharing';

const scene = scenes.lime;
const confetti = ['#FFE27A', '#FF6FAE', '#7C4DFF', '#3FB6F5', '#9BE22D', '#FF9433', '#14C2B4', '#FFFFFF'];

export function WorkoutCompleteScreen({ route, navigation }: RootScreenProps<'WorkoutComplete'>) {
  const { name, minutes, sets, exercises, newAchievements } = route.params;
  const { dictionary, language } = useI18n();
  const copy = dictionary.complete;
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const referral = useReferral();
  const [sharing, setSharing] = useState(false);
  const reveal = useRef(new Animated.Value(0)).current;
  // Rough MET-based estimate (moderate resistance training ≈ 5 MET); only shown when we know body weight.
  const kcal = profile.data?.bodyWeightKg ? Math.round(5 * profile.data.bodyWeightKg * (minutes / 60)) : undefined;

  useEffect(() => { haptics.success(); Animated.spring(reveal, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 12 }).start(); }, [reveal]);

  const shareCard = {
    kind: 'workout' as const, title: name, eyebrow: dictionary.socialShare.workoutEyebrow,
    date: new Date().toLocaleDateString(language, { dateStyle: 'medium' }), statement: dictionary.socialShare.stronger,
    metrics: [
      { id: 'duration', label: copy.duration, value: `${minutes} ${dictionary.common.min}` },
      { id: 'exercises', label: copy.exercises, value: String(exercises) },
      { id: 'sets', label: copy.sets, value: String(sets) },
      ...(kcal == null ? [] : [{ id: 'calories', label: copy.calories, value: `${kcal} kcal`, estimated: true, sensitive: true }]),
    ],
  };

  return <View style={[styles.root, { backgroundColor: scene.background }]}>
    <StatusBar style="light" />
    <MeshBackground base={scene.background} blobs={scene.blobs} layout="center" />
    {confetti.map((color, i) => <ConfettiPiece key={i} color={color} index={i} />)}
    <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
      <Animated.View style={{ alignItems: 'center', opacity: reveal, transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
        <View style={styles.medalRing}><LinearGradient colors={['#FFE27A', '#FFB443', '#FF8A3D']} style={[styles.medal, shadow('#F07A1A', 1.4)]}><GlyphIcon glyph={mdi('trophy')} size={64} color={palette.white} /></LinearGradient></View>
        <Txt variant="label" color="#3E9A10" style={{ marginTop: 22, letterSpacing: 1 }}>{copy.subtitle.toUpperCase()}</Txt>
        <Txt variant="hero" align="center" style={{ marginTop: 4 }}>{copy.title}</Txt>
        <Txt variant="body" color={palette.inkMuted} align="center" style={{ marginTop: 4 }}>{name}</Txt>
      </Animated.View>

      <Animated.View style={{ opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>
        <View style={styles.grid}>
          <StatTile label={copy.duration} value={minutes} unit={dictionary.common.min} glyph={mdi('timer-outline')} gradient={gradients.sky} />
          <StatTile label={copy.exercises} value={exercises} glyph={mdi('format-list-numbered')} gradient={gradients.primary} />
        </View>
        <View style={styles.grid}>
          <StatTile label={copy.sets} value={sets} glyph={mdi('check-all')} gradient={gradients.lime} />
          <StatTile label={copy.calories} value={kcal ?? '—'} glyph={mdi('fire')} gradient={gradients.sunrise} />
        </View>
        {newAchievements.length ? <View style={[styles.achievements, shadow('#F07A1A', 0.6)]}>
          <Txt variant="label" color={palette.orange}>{copy.achievements.toUpperCase()}</Txt>
          {newAchievements.map((title) => <View key={title} style={styles.achievement}><GlyphIcon glyph={mdi('medal')} size={22} color="#F07A1A" /><Txt variant="h3">{title}</Txt></View>)}
        </View> : null}
      </Animated.View>
    </View>
    <BottomBar background={scene.background}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <IconButton glyph={mdi('share-variant')} size="cta" label={copy.share} onPress={() => setSharing(true)} />
        <GradientButton label={copy.done} icon="checkmark" gradient={scene.gradient} onPress={() => navigation.popToTop()} style={{ flex: 1 }} />
      </View>
    </BottomBar>
    <ShareComposer visible={sharing} onClose={() => setSharing(false)} card={shareCard} referral={referral.data} />
  </View>;
}

function ConfettiPiece({ color, index }: { color: string; index: number }) {
  const fall = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fall, { toValue: 1, duration: 1600 + index * 140, delay: index * 60, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(); }, [fall, index]);
  const left = `${8 + ((index * 37) % 84)}%` as const;
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', left, top: 0, width: index % 3 ? 10 : 14, height: index % 3 ? 16 : 14, borderRadius: index % 2 ? 7 : 3, backgroundColor: color, opacity: fall.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [-20, 420 + index * 30] }) }, { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${index % 2 ? 300 : -260}deg`] }) }] }} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, paddingHorizontal: gutter, maxWidth: 560, width: '100%', alignSelf: 'center' },
  medalRing: { width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: palette.line },
  medal: { width: 124, height: 124, borderRadius: 62, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', gap: 12, marginTop: 12 },
  achievements: { marginTop: 14, backgroundColor: 'rgba(255,209,102,0.12)', borderRadius: radius.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: 'rgba(255,209,102,0.12)' },
  achievement: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});

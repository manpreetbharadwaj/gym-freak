import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { GlyphIcon, GradientButton, mdi, SecondaryButton, Txt } from '@/components';
import { Card, Header, Screen, Section } from '@/components/layout';
import { format, useI18n } from '@/i18n';
import { RootScreenProps } from '@/navigation/types';
import { useStopwatch } from '@/services/storage/stopwatch';
import { palette, radius, scenes, shadow, typography } from '@/theme';
import { haptics } from '@/utils/haptics';
import { elapsedMs, formatStopwatch, isRunning, lapRows } from '@/utils/stopwatch';

const FAST = '#0E9F95';
const SLOW = palette.danger;
const FRAME_MS = 33;

/**
 * Free utility (Settings → Utilities). Time comes from timestamps in the stopwatch store, so it stays
 * exact while backgrounded, locked or on another screen; this screen only repaints (~30 fps) while
 * it is visible and the app is active.
 */
export function StopwatchScreen({ navigation }: RootScreenProps<'Stopwatch'>) {
  const { dictionary } = useI18n();
  const copy = dictionary.stopwatch;
  const sw = useStopwatch();
  const running = isRunning(sw.state);
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { setActive(s === 'active'); setNow(Date.now()); });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    setNow(Date.now());
    if (!running || !focused || !active) return;
    const id = setInterval(() => setNow(Date.now()), FRAME_MS);
    return () => clearInterval(id);
  }, [running, focused, active]);

  const elapsed = elapsedMs(sw.state, now);
  const rows = lapRows(sw.state.laps);
  const current = running && rows.length ? elapsed - sw.state.laps[sw.state.laps.length - 1] : null;
  const idle = !running && elapsed === 0;
  const status = running ? copy.running : idle ? copy.ready : copy.paused;

  const startOrResume = () => { haptics.press(); sw.start(); };
  const pause = () => { haptics.tap(); sw.pause(); };
  const lap = () => { haptics.select(); sw.lap(); };
  const reset = () => { haptics.tap(); sw.reset(); };

  return <Screen scene={scenes.violet} header={<Header title={copy.title} onBack={() => navigation.goBack()} />}>
    <View style={[styles.face, shadow(palette.violet, 0.8)]}>
      <LinearGradient colors={['#0E1A2B', '#0B1220']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.status, { backgroundColor: running ? 'rgba(34,184,245,0.12)' : palette.grayBg }]}>
        <View style={[styles.dot, { backgroundColor: running ? palette.violet : palette.inkFaint }]} />
        <Txt variant="overline" color={running ? palette.violet : palette.inkMuted}>{status.toUpperCase()}</Txt>
      </View>
      {/* Big, tabular digits; shrink to fit rather than wrap at large accessibility text sizes. */}
      <Text accessibilityRole="timer" accessibilityLabel={`${copy.elapsed} ${formatStopwatch(elapsed)}`} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.4}
        style={styles.digits}>{formatStopwatch(elapsed)}</Text>
      {current !== null ? <Txt variant="label" color={palette.inkMuted} style={styles.tabular}>{format(copy.lapNumber, { number: rows.length + 1 })} · {formatStopwatch(current)}</Txt> : <Txt variant="label" color="transparent">·</Txt>}
    </View>

    <View style={styles.controls}>
      {idle ? <GradientButton label={copy.start} icon="play" onPress={startOrResume} style={{ flex: 1 }} />
        : running ? <>
          <SecondaryButton label={copy.lap} icon="flag-outline" iconFirst color={palette.violet} onPress={lap} style={{ flex: 1 }} />
          <GradientButton label={copy.pause} icon="pause" onPress={pause} style={{ flex: 1.3 }} />
        </> : <>
          <SecondaryButton label={copy.reset} icon="refresh" iconFirst color={palette.inkSoft} onPress={reset} style={{ flex: 1 }} />
          <GradientButton label={copy.resume} icon="play" onPress={startOrResume} style={{ flex: 1.3 }} />
        </>}
    </View>
    <Txt variant="small" color={palette.inkMuted} align="center" style={{ marginTop: 12 }}>{copy.background}</Txt>

    <Section title={copy.laps}>
      {rows.length ? <Card padded={false} style={{ paddingVertical: 4 }}>
        {rows.map((row) => {
          const tone = row.fastest ? FAST : row.slowest ? SLOW : undefined;
          return <Animated.View key={row.number} entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
            style={styles.lapRow} accessible accessibilityLabel={`${format(copy.lapNumber, { number: row.number })}, ${formatStopwatch(row.lapMs)}, ${format(copy.total, { time: formatStopwatch(row.totalMs) })}${row.fastest ? `, ${copy.fastest}` : row.slowest ? `, ${copy.slowest}` : ''}`}>
            <View style={{ width: 84 }}>
              <Txt variant="row" color={tone ?? palette.ink}>{format(copy.lapNumber, { number: row.number })}</Txt>
              {tone ? <Txt variant="tab" color={tone}>{row.fastest ? copy.fastest : copy.slowest}</Txt> : null}
            </View>
            <Txt variant="h3" color={tone ?? palette.ink} style={[styles.tabular, { flex: 1 }]}>{formatStopwatch(row.lapMs)}</Txt>
            <Txt variant="label" color={palette.inkMuted} style={styles.tabular}>{format(copy.total, { time: formatStopwatch(row.totalMs) })}</Txt>
          </Animated.View>;
        })}
      </Card> : <Card style={styles.empty}><GlyphIcon glyph={mdi('flag-outline')} size={20} color={palette.inkFaint} /><Txt variant="small" color={palette.inkMuted} style={{ flex: 1 }}>{copy.noLaps}</Txt></Card>}
    </Section>
  </Screen>;
}

const styles = StyleSheet.create({
  face: { alignItems: 'center', gap: 10, paddingVertical: 26, paddingHorizontal: 16, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: palette.surface, borderWidth: 1, borderColor: 'rgba(34,184,245,0.12)' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  /** The stopwatch reading is this screen’s one focal figure, so it sits above the shared `number` size. */
  digits: { ...typography.number, fontSize: 56, lineHeight: 64, letterSpacing: -1.5, color: palette.ink, fontVariant: ['tabular-nums'], alignSelf: 'stretch', textAlign: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', gap: 12, marginTop: 16 },
  lapRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});

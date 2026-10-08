import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Linking, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { GlyphIcon, GradientButton, mdi, PressableScale, SecondaryButton, TextButton, Txt } from '@/components';
import { BottomSheet, FilterChip, TextField, ToggleRow } from '@/components/inputs';
import { Card, Header, Screen, Section } from '@/components/layout';
import { useProfile } from '@/hooks/queries';
import { format, useI18n } from '@/i18n';
import { RootScreenProps } from '@/navigation/types';
import { notificationPermission } from '@/services/notifications';
import { useWater } from '@/services/storage/water';
import { palette, radius, scenes, shadow } from '@/theme';
import { dayKey, parseDay } from '@/utils/dates';
import { haptics } from '@/utils/haptics';
import { GOAL_PRESETS_ML, litres, MAX_ENTRY_ML, MAX_GOAL_ML, MIN_GOAL_ML, QUICK_ADD_ML, REMINDER_INTERVALS_MIN, suggestedGoalMl, timeOf } from '@/utils/water';

const TEAL = '#0E9F95';
const BLUE = '#2F7BF6';
const RING = 156;
const STROKE = 14;
const R = (RING - STROKE) / 2;
const C = 2 * Math.PI * R;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
type Sheet = null | 'amount' | 'goal' | 'start' | 'end';

/** Free utility (Settings → Utilities): device-only water log, daily goal, reminders and history. */
export function WaterIntakeScreen({ navigation }: RootScreenProps<'WaterIntake'>) {
  const { dictionary, language } = useI18n();
  const copy = dictionary.water;
  const profile = useProfile();
  const weightKg = profile.data?.weightKg ?? profile.data?.bodyWeightKg;
  const water = useWater(weightKg);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [draft, setDraft] = useState('');
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const pct = water.goalMl ? Math.round((water.ml / water.goalMl) * 100) : 0;
  const reached = water.ml >= water.goalMl;
  const clock = (min: number) => timeOf(min).toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' });

  useEffect(() => {
    const check = () => notificationPermission().then(setPermission).catch(() => undefined);
    check();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => sub.remove();
  }, []);

  const add = (ml: number) => { haptics.tap(); water.add(ml); };
  const toggleReminders = async (enabled: boolean) => {
    if (enabled) { const result = await notificationPermission(true); setPermission(result); if (result !== 'granted') return; }
    water.setReminder({ enabled });
  };
  const openSheet = (s: Exclude<Sheet, null>) => { setDraft(s === 'goal' ? String(water.goalMl) : ''); setSheet(s); };
  const draftMl = Number(draft.replace(/[^0-9]/g, ''));
  const amountValid = draftMl >= 1 && draftMl <= MAX_ENTRY_ML;
  const goalValid = draftMl >= MIN_GOAL_ML && draftMl <= MAX_GOAL_ML;
  const dayLabel = (day: string) => day === water.today ? copy.today : day === dayKey(new Date(Date.now() - 86_400_000)) ? copy.yesterday
    : parseDay(day).toLocaleDateString(language, { weekday: 'short', day: 'numeric' });
  const startOptions = Array.from({ length: 15 }, (_, i) => 300 + i * 30);            // 05:00 – 12:00
  const endOptions = Array.from({ length: 14 }, (_, i) => 17 * 60 + i * 30);          // 17:00 – 23:30

  return <Screen scene={scenes.aqua} header={<Header title={copy.title} onBack={() => navigation.goBack()} />}>
    {/* Today */}
    <View style={[styles.summary, shadow(BLUE, 0.6)]}>
      <LinearGradient colors={['#0E1A2B', '#0B1220']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <ProgressRing progress={water.goalMl ? water.ml / water.goalMl : 0}>
        <GlyphIcon glyph={mdi(reached ? 'check-circle' : 'water')} size={26} color={reached ? TEAL : BLUE} />
        <Txt variant="metric">{pct}%</Txt>
      </ProgressRing>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Txt variant="overline" color={BLUE}>{copy.today.toUpperCase()}</Txt>
        <Txt variant="metric">{format(copy.amountOfGoal, { current: litres(water.ml), goal: litres(water.goalMl) })}</Txt>
        <Txt variant="small" color={reached ? TEAL : palette.inkMuted}>{reached ? copy.goalReached : format(copy.percentOfGoal, { percent: pct })}</Txt>
        {water.lastEntry ? <TextButton label={format(copy.undo, { amount: water.lastEntry.ml })} color={BLUE} onPress={() => { haptics.tap(); water.undo(); }} style={{ alignSelf: 'flex-start', minHeight: 36 }} /> : null}
      </View>
    </View>

    {/* Quick add */}
    <Section title={copy.quickAdd}>
      <View style={styles.quickRow}>
        {QUICK_ADD_ML.map((ml, i) => <PressableScale key={ml} onPress={() => add(ml)} accessibilityLabel={format(copy.addAmountLabel, { amount: ml })} containerStyle={{ flex: 1 }}>
          <View style={[styles.quick, shadow(undefined, 0.35)]}>
            <View style={styles.quickIcon}><GlyphIcon glyph={mdi(i === 0 ? 'cup-outline' : i === 1 ? 'cup-water' : 'bottle-soda-classic-outline')} size={20} color={BLUE} /></View>
            <Txt variant="row" color={palette.ink}>{format(copy.addMl, { amount: ml })}</Txt>
          </View>
        </PressableScale>)}
        <PressableScale onPress={() => openSheet('amount')} accessibilityLabel={copy.customTitle} containerStyle={{ flex: 1 }}>
          <View style={[styles.quick, styles.quickCustom]}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(52,211,153,0.12)' }]}><GlyphIcon glyph={mdi('plus')} size={20} color={TEAL} /></View>
            <Txt variant="row" color={TEAL}>{copy.custom}</Txt>
          </View>
        </PressableScale>
      </View>
    </Section>

    {/* Daily goal */}
    <Section title={copy.dailyGoal}>
      <Card style={{ gap: 12 }}>
        <View style={styles.chips}>
          {GOAL_PRESETS_ML.map((ml) => <FilterChip key={ml} label={`${ml} ml`} active={water.customGoal && water.goalMl === ml} onPress={() => water.setGoal(ml)} color={TEAL} />)}
          <FilterChip label={water.customGoal && !GOAL_PRESETS_ML.includes(water.goalMl as never) ? `${copy.custom} · ${water.goalMl} ml` : copy.custom} active={water.customGoal && !GOAL_PRESETS_ML.includes(water.goalMl as never)} onPress={() => openSheet('goal')} color={TEAL} glyph={mdi('pencil-outline')} />
          <FilterChip label={copy.suggested} active={!water.customGoal} onPress={() => water.setGoal(null)} color={TEAL} glyph={mdi('auto-fix')} />
        </View>
        <Txt variant="small" color={palette.inkMuted}>{format(copy.suggestedNote, { amount: litres(suggestedGoalMl(weightKg)) })}</Txt>
      </Card>
    </Section>

    {/* Reminders */}
    <Section title={copy.reminders}>
      <Card padded={false} style={{ paddingVertical: 4 }}>
        <ToggleRow title={copy.reminders} subtitle={copy.remindersBody} glyph={mdi('bell-ring-outline')} color={BLUE} value={water.reminder.enabled && permission === 'granted'} onChange={toggleReminders} testID="water-reminders" />
        {water.reminder.enabled && permission === 'granted' ? <View style={styles.reminderBody}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TimeField label={copy.start} value={clock(water.reminder.startMin)} onPress={() => setSheet('start')} />
            <TimeField label={copy.end} value={clock(water.reminder.endMin)} onPress={() => setSheet('end')} />
          </View>
          <Txt variant="label" color={palette.inkMuted}>{copy.repeat.toUpperCase()}</Txt>
          <View style={styles.chips}>
            {REMINDER_INTERVALS_MIN.map((min) => <FilterChip key={min} label={format(copy.everyHours, { hours: (min / 60).toLocaleString(language) })} active={water.reminder.intervalMin === min} onPress={() => water.setReminder({ intervalMin: min })} color={BLUE} />)}
          </View>
          {reached ? <View style={styles.paused}><GlyphIcon glyph={mdi('check-circle-outline')} size={16} color={TEAL} /><Txt variant="small" color={TEAL} style={{ flex: 1 }}>{copy.pausedToday}</Txt></View> : null}
        </View> : null}
        {permission === 'denied' ? <View style={[styles.reminderBody, { gap: 10 }]}>
          <Txt variant="small" color={palette.inkMuted}>{copy.denied}</Txt>
          <SecondaryButton label={dictionary.notifications.openSettings} icon="settings-outline" iconFirst size="compact" onPress={() => Linking.openSettings()} />
        </View> : null}
      </Card>
    </Section>

    {/* History */}
    <Section title={copy.history}>
      <Card padded={false} style={{ paddingVertical: 6 }}>
        {water.history.map((d) => <View key={d.day} style={styles.historyRow} accessible accessibilityLabel={`${dayLabel(d.day)}: ${format(copy.historyRow, { current: litres(d.ml), goal: litres(d.goalMl) })}, ${d.percent}%`}>
          <View style={{ width: 92 }}><Txt variant="row" numberOfLines={1}>{dayLabel(d.day)}</Txt></View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.min(100, d.percent)}%`, backgroundColor: d.percent >= 100 ? TEAL : BLUE }]} /></View>
            <Txt variant="label" color={palette.inkMuted}>{format(copy.historyRow, { current: litres(d.ml), goal: litres(d.goalMl) })}</Txt>
          </View>
          <Txt variant="row" color={d.percent >= 100 ? TEAL : palette.ink} style={{ width: 48, textAlign: 'right' }}>{d.percent}%</Txt>
        </View>)}
      </Card>
    </Section>
    <Txt variant="small" color={palette.inkMuted} align="center" style={{ marginTop: 16 }}>{copy.localNote}</Txt>

    {/* Sheets */}
    <BottomSheet visible={sheet === 'amount' || sheet === 'goal'} onClose={() => setSheet(null)} title={sheet === 'goal' ? copy.goalTitle : copy.customTitle}
      footer={<GradientButton label={sheet === 'goal' ? copy.setGoal : copy.add} icon="checkmark" disabled={sheet === 'goal' ? !goalValid : !amountValid}
        onPress={() => { if (sheet === 'goal') water.setGoal(draftMl); else add(draftMl); setSheet(null); }} />}>
      <TextField label={sheet === 'goal' ? copy.goalMl : copy.amountMl} value={draft} onChangeText={setDraft} keyboardType="number-pad" maxLength={4} autoFocus icon={mdi('water-outline')} placeholder={sheet === 'goal' ? '2500' : '330'}
        error={draft && !(sheet === 'goal' ? goalValid : amountValid) ? format(copy.invalidAmount, sheet === 'goal' ? { min: MIN_GOAL_ML, max: MAX_GOAL_ML } : { min: 1, max: MAX_ENTRY_ML }) : undefined} />
    </BottomSheet>
    <BottomSheet visible={sheet === 'start' || sheet === 'end'} onClose={() => setSheet(null)} title={sheet === 'end' ? copy.pickEnd : copy.pickStart}>
      <View style={styles.chips}>
        {(sheet === 'end' ? endOptions : startOptions).map((min) => {
          const active = sheet === 'end' ? water.reminder.endMin === min : water.reminder.startMin === min;
          return <FilterChip key={min} label={clock(min)} active={active} color={BLUE} onPress={() => { water.setReminder(sheet === 'end' ? { endMin: min } : { startMin: min }); setSheet(null); }} />;
        })}
      </View>
    </BottomSheet>
  </Screen>;
}

/** Circular intake progress; animates (timing, no bounce) when water is added or undone. */
function ProgressRing({ progress, children }: { progress: number; children: React.ReactNode }) {
  const value = useRef(new Animated.Value(Math.min(1, progress))).current;
  useEffect(() => { Animated.timing(value, { toValue: Math.min(1, Math.max(0, progress)), duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [progress, value]);
  return <View style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={RING} height={RING} style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
      <Defs><SvgGradient id="waterRing" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#19B8AE" /><Stop offset="1" stopColor="#3F7BFF" /></SvgGradient></Defs>
      <Circle cx={RING / 2} cy={RING / 2} r={R} stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE} fill="none" />
      <AnimatedCircle cx={RING / 2} cy={RING / 2} r={R} stroke="url(#waterRing)" strokeWidth={STROKE} strokeLinecap="round" fill="none" strokeDasharray={`${C} ${C}`} strokeDashoffset={value.interpolate({ inputRange: [0, 1], outputRange: [C, 0] })} />
    </Svg>
    <View style={{ alignItems: 'center', gap: 2 }}>{children}</View>
  </View>;
}

function TimeField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return <PressableScale onPress={onPress} accessibilityLabel={`${label}: ${value}`} containerStyle={{ flex: 1 }}>
    <View style={styles.timeField}>
      <Txt variant="label" color={palette.inkMuted}>{label}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><GlyphIcon glyph={mdi('clock-outline')} size={16} color={BLUE} /><Txt variant="row">{value}</Txt></View>
    </View>
  </PressableScale>;
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: palette.surface, borderWidth: 1, borderColor: 'rgba(34,184,245,0.12)' },
  quickRow: { flexDirection: 'row', gap: 8 },
  quick: { alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  quickCustom: { borderColor: 'rgba(52,211,153,0.12)', borderStyle: 'dashed' },
  quickIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(34,184,245,0.12)', alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reminderBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  timeField: { gap: 4, padding: 12, borderRadius: 14, backgroundColor: palette.grayBg, borderWidth: 1, borderColor: palette.line },
  paused: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 12, backgroundColor: 'rgba(52,211,153,0.12)' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  bar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(34,184,245,0.12)', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
});

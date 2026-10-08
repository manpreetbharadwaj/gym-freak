import React from 'react';
import { StyleSheet, View } from 'react-native';
import { format, useI18n } from '@/i18n';
import { Difficulty as Experience, DurationRange as Duration, Equipment, Gender, Goal, TrainingLocation as Environment } from '@/types/domain';
import { CheckBadge, Glyph, GlyphIcon, mdi, Txt } from '@/components';
import { AssetImage } from '@/components/AssetImage';
import { AnimatedCard, PremiumInfoBadge, PremiumSelectableSurface, firstRunTheme } from '@/components/firstRun';
import { WheelPicker } from '@/components/pickers';
import { HEIGHT_RANGE, heightReadout, UnitToggle, WEIGHT_RANGE, WeightRuler, weightReadout } from '@/components/bodyMetrics';
import { cmToFeetInches, feetInchesToCm, UnitSystem } from '@/utils/units';
import { fonts, radius, Scene, useLayout } from '@/theme';

const GAP = 12;

function useGridWidth(columns = 2) {
  const { contentWidth } = useLayout();
  return (contentWidth - GAP * (columns - 1)) / columns;
}

/* ───────────── Goal ───────────── */

const goals = ['build-muscle', 'lose-fat', 'get-stronger', 'stay-fit', 'improve-endurance', 'improve-mobility'] as const;

export function GoalStep({ value, onChange }: { value?: Goal; onChange: (value: Goal) => void }) {
  const copy = useI18n().dictionary.onboarding.goal.options;
  const width = useGridWidth();
  return <View style={styles.grid}>{goals.map((id, index) => {
    const selected = value === id;
    return <AnimatedCard key={id} delay={index * 30} style={{ width }}>
      <PremiumSelectableSurface selected={selected} accent={firstRunTheme.accent} onPress={() => onChange(id)} label={copy[id].title} style={[styles.goalCard, selected && styles.selectedCard]}>
        <View style={styles.between}>
          <AssetImage asset={`goals/${id}`} contentFit="cover" style={styles.goalPhoto} />
          <CheckBadge visible={selected} color={firstRunTheme.accent} size={22} ring dark />
        </View>
        <View style={styles.goalText}>
          <Txt variant="h3" color={firstRunTheme.text} style={styles.optionTitle}>{copy[id].title}</Txt>
          <Txt variant="small" color={firstRunTheme.muted} style={styles.optionBody}>{copy[id].body}</Txt>
        </View>
      </PremiumSelectableSurface>
    </AnimatedCard>;
  })}</View>;
}

/* ───────────── Experience ───────────── */

const levels = [
  { id: 'beginner', intensity: 1 },
  { id: 'intermediate', intensity: 2 },
  { id: 'advanced', intensity: 3 },
] as const;

export function ExperienceStep({ value, onChange }: { value?: Experience; onChange: (value: Experience) => void }) {
  const copy = useI18n().dictionary.onboarding.experience.options;
  const { compact } = useLayout();
  const photo = compact ? 76 : 88;
  return <View style={styles.stack}>{levels.map((level, index) => {
    const selected = value === level.id;
    return <AnimatedCard key={level.id} delay={index * 45}>
      <PremiumSelectableSurface selected={selected} accent={firstRunTheme.accent} onPress={() => onChange(level.id)} label={copy[level.id].title} style={[styles.levelCard, selected && styles.selectedCard]}>
        <AssetImage asset={`levels/${level.id}`} contentFit="cover" style={{ width: photo, height: photo, borderRadius: radius.sm }} />
        <View style={styles.levelCopy}>
          <View style={styles.intensity} importantForAccessibility="no-hide-descendants">{[1, 2, 3].map((bar) => <View key={bar} style={[styles.intensityBar, { height: 4 + bar * 3, backgroundColor: bar <= level.intensity ? firstRunTheme.accent : firstRunTheme.lineStrong }]} />)}</View>
          <Txt variant="h3" color={firstRunTheme.text} style={styles.optionTitle}>{copy[level.id].title}</Txt>
          <Txt variant="small" color={firstRunTheme.muted} style={styles.optionBody}>{copy[level.id].body}</Txt>
        </View>
        <CheckBadge visible={selected} color={firstRunTheme.accent} size={22} ring dark />
      </PremiumSelectableSurface>
    </AnimatedCard>;
  })}</View>;
}

/* ───────────── Location ───────────── */

export function LocationStep({ value, onChange, accent }: { value?: Environment; onChange: (value: Environment) => void; accent: string }) {
  const copy = useI18n().dictionary.onboarding.location.options;
  const { compact, tiny } = useLayout();
  const height = tiny ? 84 : compact ? 96 : 112;
  const options: Environment[] = ['gym', 'home', 'both'];
  return <View style={styles.stack}>{options.map((id, index) => {
    const selected = value === id;
    return <AnimatedCard key={id} delay={index * 45}>
      <PremiumSelectableSurface selected={selected} accent={accent} onPress={() => onChange(id)} label={copy[id].title} style={styles.locationCard}>
        <View style={[styles.locationPhoto, { height }]}>
          {id === 'both'
            ? <View style={styles.locationPair}>
                <AssetImage asset="locations/gym" contentFit="cover" style={styles.locationHalf} />
                <AssetImage asset="locations/home" contentFit="cover" style={styles.locationHalf} />
              </View>
            : <AssetImage asset={`locations/${id}`} contentFit="cover" style={styles.fullPhoto} />}
        </View>
        <View style={styles.locationLabel}>
          <View style={styles.flexCopy}>
            <Txt variant="h3" color={firstRunTheme.text}>{copy[id].title}</Txt>
            <Txt variant="small" color={firstRunTheme.muted}>{copy[id].body}</Txt>
          </View>
          <CheckBadge visible={selected} color={accent} size={22} ring dark />
        </View>
      </PremiumSelectableSurface>
    </AnimatedCard>;
  })}</View>;
}

/* ───────────── Training days ───────────── */

const schedule: Record<number, number[]> = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };

export function DaysStep({ value, onChange, scene }: { value: number; onChange: (value: number) => void; scene: Scene }) {
  const { dictionary } = useI18n();
  const copy = dictionary.onboarding.days;
  const { contentWidth } = useLayout();
  const columns = contentWidth < 312 ? 3 : 6;
  const countWidth = (contentWidth - (columns - 1) * 6) / columns;
  const active = schedule[value] ?? [];
  return <View style={styles.dataStack}>
    <AnimatedCard style={styles.daysReadout}>
      <View style={styles.numberRow}>
        <Txt variant="number" color={firstRunTheme.text} style={styles.metricNumber}>{value}</Txt>
        <Txt variant="body" color={firstRunTheme.muted} style={styles.numberUnit}>{copy.unit}</Txt>
      </View>
      <PremiumInfoBadge glyph={mdi('calendar-check-outline')} label={copy.feedback[value] ?? ''} color={firstRunTheme.accent} />
    </AnimatedCard>

    <View style={styles.dayChoices}>{[2, 3, 4, 5, 6, 7].map((count) => {
      const selected = count === value;
      return <PremiumSelectableSurface key={count} selected={selected} accent={firstRunTheme.accent} onPress={() => onChange(count)} label={`${count} ${copy.unit}`} cornerRadius={radius.sm} containerStyle={{ width: countWidth }} style={[styles.dayChoice, selected && styles.activeDayChoice]}>
        <Txt variant="h3" color={firstRunTheme.text} style={styles.dayChoiceNumber}>{count}</Txt>
      </PremiumSelectableSurface>;
    })}</View>

    <AnimatedCard delay={60} style={styles.weekCard}>
      <View style={styles.weekHeading}>
        <GlyphIcon glyph={mdi('calendar-week-outline')} size={18} color={firstRunTheme.muted} />
        <Txt variant="label" color={firstRunTheme.muted}>{dictionary.onboarding.complete.schedule}</Txt>
      </View>
      <View style={styles.weekGrid}>{copy.weekdays.map((day, i) => <View key={day + i} style={styles.dayCol}>
        <Txt variant="label" color={firstRunTheme.muted} style={styles.weekdayLabel}>{day}</Txt>
        <View style={[styles.dayTile, active.includes(i) && styles.activeDayTile]}>
          {active.includes(i)
            ? <GlyphIcon glyph={mdi('check')} size={17} color={firstRunTheme.accent} />
            : <View style={styles.restDot} />}
        </View>
      </View>)}</View>
    </AnimatedCard>
  </View>;
}

/* ───────────── Duration ───────────── */

const durations: { id: Duration; glyph: Glyph }[] = [
  { id: '20-30', glyph: mdi('lightning-bolt-outline') },
  { id: '30-45', glyph: mdi('timer-outline') },
  { id: '45-60', glyph: mdi('clock-outline') },
  { id: '60-90', glyph: mdi('clock-plus-outline') },
];

export function DurationStep({ value, onChange, scene }: { value?: Duration; onChange: (value: Duration) => void; scene: Scene }) {
  const { dictionary } = useI18n();
  const copy = dictionary.onboarding.duration;
  const width = useGridWidth();
  return <View style={styles.dataStack}>
    <AnimatedCard style={styles.durationReadout}>
      <View style={[styles.smallIcon, { backgroundColor: `${scene.accent}20` }]}><GlyphIcon glyph={mdi('timer-outline')} size={22} color={firstRunTheme.accent} /></View>
      <View style={styles.flexCopy}>
        <Txt variant="label" color={firstRunTheme.muted}>{dictionary.onboarding.complete.session}</Txt>
        <View style={styles.inlineNumber}>
          <Txt variant="title" color={firstRunTheme.text}>{value ? value.replace('-', '–') : '—'}</Txt>
          <Txt variant="small" color={firstRunTheme.muted}>{copy.unit}</Txt>
        </View>
      </View>
    </AnimatedCard>
    <View style={styles.grid}>{durations.map((item, index) => {
      const selected = item.id === value;
      return <AnimatedCard key={item.id} delay={index * 35} style={{ width }}>
        <PremiumSelectableSurface selected={selected} accent={firstRunTheme.accent} onPress={() => onChange(item.id)} label={`${item.id} ${copy.unit}`} style={[styles.durationCard, selected && styles.selectedCard]}>
          <View style={styles.between}>
            <GlyphIcon glyph={item.glyph} size={23} color={selected ? firstRunTheme.accent : firstRunTheme.muted} />
            <CheckBadge visible={selected} color={scene.accent} size={22} ring dark />
          </View>
          <View style={styles.durationValue}>
            <Txt variant="title" color={firstRunTheme.text} style={styles.durationNumber}>{item.id.replace('-', '–')}</Txt>
            <Txt variant="label" color={firstRunTheme.muted}>{copy.unit}</Txt>
          </View>
          <Txt variant="small" color={firstRunTheme.muted}>{copy.options[item.id]}</Txt>
        </PremiumSelectableSurface>
      </AnimatedCard>;
    })}</View>
  </View>;
}

/* ───────────── Equipment ───────────── */

// The stored `bands` value is intentionally separate from the photo registry key.
const equipment = [
  { id: 'dumbbells', asset: 'equipment/dumbbells' },
  { id: 'barbell', asset: 'equipment/barbell' },
  { id: 'bench', asset: 'equipment/bench' },
  { id: 'cable-machine', asset: 'equipment/cable-machine' },
  { id: 'bands', asset: 'equipment/resistance-bands' },
  { id: 'smith-machine', asset: 'equipment/smith-machine' },
  { id: 'pull-up-bar', asset: 'equipment/pull-up-bar' },
  { id: 'machines', asset: 'equipment/machines' },
  { id: 'bodyweight', asset: 'equipment/bodyweight' },
  { id: 'full-gym', asset: 'equipment/full-gym' },
] as const;

export function EquipmentStep({ selected, onToggle, scene }: { selected: Equipment[]; onToggle: (value: Equipment) => void; scene: Scene }) {
  const copy = useI18n().dictionary.onboarding.equipment;
  const width = useGridWidth();
  return <View style={styles.equipmentStack}>
    <PremiumInfoBadge glyph={mdi('check-circle-outline')} label={format(copy.selected, { count: selected.length })} color={firstRunTheme.accent} />
    <View style={styles.grid}>{equipment.map((item, index) => {
      const selectedItem = selected.includes(item.id);
      return <AnimatedCard key={item.id} delay={Math.min(index * 25, 150)} style={{ width }}>
        <PremiumSelectableSurface selected={selectedItem} accent={firstRunTheme.accent} role="checkbox" onPress={() => onToggle(item.id)} label={copy.options[item.id]} style={[styles.equipCard, selectedItem && styles.selectedCard]}>
          <View style={styles.equipVisual}>
            <AssetImage asset={item.asset} contentFit="contain" style={styles.equipPhoto} />
            <View style={styles.equipCheck}><CheckBadge visible={selectedItem} color={firstRunTheme.accent} size={22} ring dark /></View>
          </View>
          <Txt variant="h3" color={firstRunTheme.text} style={styles.equipLabel}>{copy.options[item.id]}</Txt>
        </PremiumSelectableSurface>
      </AnimatedCard>;
    })}</View>
  </View>;
}

/* ───────────── Body metrics ───────────── */

export function AgeStep({ value, onChange, scene }: { value: number; onChange: (value: number) => void; scene: Scene }) {
  const copy = useI18n().dictionary.onboarding.age;
  const { compact } = useLayout();
  return <AnimatedCard style={styles.metricCard}>
    <View style={styles.metricHeading}>
      <View style={styles.metricMark}><GlyphIcon glyph={mdi('calendar-outline')} size={20} color={scene.accent} /></View>
      <Txt variant="label" color={firstRunTheme.measurementMuted}>14–90 {copy.unit}</Txt>
    </View>
    <WheelPicker min={14} max={90} value={value} onChange={onChange} accent={scene.accent} unit={copy.unit} itemHeight={compact ? 54 : 62} dark accessibilityLabel={copy.title} />
  </AnimatedCard>;
}

/** Height in cm or ft + in (display only — the value saved is always centimetres). */
export function HeightStep({ value, onChange, system, onSystemChange, scene }: { value: number; onChange: (value: number) => void; system: UnitSystem; onSystemChange: (system: UnitSystem) => void; scene: Scene }) {
  const copy = useI18n().dictionary.onboarding.height;
  const { compact, contentWidth } = useLayout();
  const readout = heightReadout(value, system);
  const [min, max] = HEIGHT_RANGE[system];
  const { feet, inches } = cmToFeetInches(value);
  const itemHeight = compact ? 48 : 54;
  const setImperialHeight = (nextFeet: number, nextInches: number) => {
    const totalInches = Math.max(HEIGHT_RANGE.imperial[0], Math.min(HEIGHT_RANGE.imperial[1], nextFeet * 12 + nextInches));
    onChange(feetInchesToCm(0, totalInches));
  };
  const inchMin = feet === 3 ? 11 : 0;
  const inchMax = feet === 7 ? 3 : 11;
  const range = system === 'metric' ? `${min}–${max} cm` : `${Math.floor(min / 12)}′${min % 12}″–${Math.floor(max / 12)}′${max % 12}″`;
  return <View style={{ gap: 12 }}>
     <UnitToggle kind="height" system={system} onChange={onSystemChange} accent={scene.accent} dark />
    <AnimatedCard style={styles.heightCard}>
      <View style={styles.metricHeading}>
        <View style={styles.metricMark}><GlyphIcon glyph={mdi('ruler')} size={22} color={scene.accent} /></View>
        <Txt variant="small" color={firstRunTheme.measurementMuted}>{range}</Txt>
      </View>
      <View style={styles.heightValue}>
           <Txt variant="number" color={firstRunTheme.measurementText} testID="height-value" style={contentWidth < 330 ? styles.metricNumberCompact : styles.metricNumber}>{readout.value}</Txt>
           {readout.unit ? <Txt variant="h3" color={firstRunTheme.measurementMuted}>{readout.unit}</Txt> : null}
      </View>
      {system === 'metric'
        ? <View style={styles.heightMetricPicker}><WheelPicker key="height-cm" min={HEIGHT_RANGE.metric[0]} max={HEIGHT_RANGE.metric[1]} value={Math.round(value)} onChange={onChange} accent={scene.accent} unit="cm" itemHeight={itemHeight} visible={5} dark accessibilityLabel={copy.title} /></View>
        : <View style={styles.heightPickerRow}>
            <View style={styles.heightPickerColumn}><WheelPicker key="height-feet" min={3} max={7} value={feet} onChange={(nextFeet) => setImperialHeight(nextFeet, inches)} accent={scene.accent} unit="ft" itemHeight={itemHeight} visible={5} dark accessibilityLabel={`${copy.title}, feet`} /></View>
            <View style={styles.heightPickerColumn}><WheelPicker key={`height-inches-${feet}`} min={inchMin} max={inchMax} value={inches} onChange={(nextInches) => setImperialHeight(feet, nextInches)} accent={scene.accent} unit="in" itemHeight={itemHeight} visible={5} dark accessibilityLabel={`${copy.title}, inches`} /></View>
          </View>}
    </AnimatedCard>
  </View>;
}

/** Weight in kg or lb (display only — the value saved is always kilograms). */
export function WeightStep({ value, onChange, system, onSystemChange, scene }: { value: number; onChange: (value: number) => void; system: UnitSystem; onSystemChange: (system: UnitSystem) => void; scene: Scene }) {
  const copy = useI18n().dictionary.onboarding.weight;
  const { contentWidth } = useLayout();
  const readout = weightReadout(value, system);
  const [min, max] = WEIGHT_RANGE[system];
  return <View style={{ gap: 12 }}>
     <UnitToggle kind="weight" system={system} onChange={onSystemChange} accent={scene.accent} dark />
    <AnimatedCard style={styles.weightCard}>
      <View style={styles.metricHeading}>
        <View style={styles.metricMark}><GlyphIcon glyph={mdi('scale-bathroom')} size={20} color={scene.accent} /></View>
        <Txt variant="label" color={firstRunTheme.measurementMuted}>{min}–{max} {readout.unit}</Txt>
      </View>
      <View style={styles.weightReadout}>
         <Txt variant="number" color={firstRunTheme.measurementText} testID="weight-value" style={styles.metricNumber}>{readout.value}</Txt>
         <Txt variant="h3" color={firstRunTheme.measurementMuted}>{readout.unit}</Txt>
      </View>
      <View style={styles.horizontalRuler}>
         <WeightRuler kg={value} onChange={onChange} system={system} accent={scene.accent} length={contentWidth - 32} fade={firstRunTheme.measurementSurface} dark label={copy.title} />
      </View>
    </AnimatedCard>
  </View>;
}

const genders: { id: Gender; glyph: Glyph }[] = [
  { id: 'woman', glyph: mdi('gender-female') },
  { id: 'man', glyph: mdi('gender-male') },
  { id: 'non-binary', glyph: mdi('gender-non-binary') },
  { id: 'unspecified', glyph: mdi('dots-horizontal') },
];

export function GenderStep({ value, onChange, scene }: { value?: Gender; onChange: (value: Gender) => void; scene: Scene }) {
  const copy = useI18n().dictionary.onboarding.gender.options;
  return <View style={styles.stack}>{genders.map((item, index) => {
    const selected = value === item.id;
    return <AnimatedCard key={item.id} delay={index * 35}>
      <PremiumSelectableSurface selected={selected} accent={firstRunTheme.accent} onPress={() => onChange(item.id)} label={copy[item.id]} style={[styles.genderCard, selected && styles.selectedCard]}>
        <View style={styles.genderIcon}><GlyphIcon glyph={item.glyph} size={22} color={selected ? firstRunTheme.accent : firstRunTheme.muted} /></View>
        <Txt variant="h3" color={firstRunTheme.text} style={styles.flexCopy}>{copy[item.id]}</Txt>
        <CheckBadge visible={selected} color={firstRunTheme.accent} size={22} ring dark />
      </PremiumSelectableSurface>
    </AnimatedCard>;
  })}</View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  stack: { gap: GAP },
  dataStack: { gap: 24 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flexCopy: { flex: 1 },
  selectedCard: { backgroundColor: '#0D1B2B' },
  optionTitle: { fontSize: 16, lineHeight: 21 },
  optionBody: { fontSize: 13, lineHeight: 18 },

  goalCard: { padding: 12, minHeight: 184, gap: 12 },
  goalPhoto: { width: 62, height: 62, borderRadius: radius.sm },
  goalText: { gap: 4 },
  levelCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  levelCopy: { flex: 1, gap: 4 },
  intensity: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 14, marginBottom: 3 },
  intensityBar: { width: 4, borderRadius: 2 },

  locationCard: { overflow: 'hidden' },
  locationPhoto: { overflow: 'hidden', backgroundColor: firstRunTheme.surfaceRaised },
  locationPair: { flexDirection: 'row', height: '100%', gap: 3 },
  locationHalf: { flex: 1, height: '100%' },
  fullPhoto: { width: '100%', height: '100%' },
  locationLabel: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },

  daysReadout: { gap: 14, alignItems: 'flex-start', paddingTop: 4 },
  numberRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  /** Age / height / weight pickers: the value being chosen is the screen’s focal figure. */
  metricNumber: { fontFamily: fonts.display, fontSize: 52, lineHeight: 60, letterSpacing: -1.6, fontVariant: ['tabular-nums'] },
  metricNumberCompact: { fontFamily: fonts.display, fontSize: 42, lineHeight: 50, letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  numberUnit: { flexShrink: 1 },
  dayChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayChoice: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  activeDayChoice: { backgroundColor: '#0D1B2B' },
  dayChoiceNumber: { fontSize: 17 },
  weekCard: { backgroundColor: firstRunTheme.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: firstRunTheme.line, padding: 14, gap: 18 },
  weekHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekGrid: { flexDirection: 'row', gap: 5 },
  dayCol: { flex: 1, alignItems: 'center', gap: 10 },
  weekdayLabel: { fontSize: 11, letterSpacing: 0, textAlign: 'center' },
  dayTile: { width: '100%', height: 40, borderRadius: 9, backgroundColor: firstRunTheme.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  activeDayTile: { backgroundColor: `${firstRunTheme.accent}18` },
  restDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: firstRunTheme.faint },

  smallIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  durationReadout: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  inlineNumber: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  durationCard: { padding: 14, minHeight: 143 },
  durationValue: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 5, marginTop: 17, marginBottom: 5 },
  durationNumber: { fontSize: 22, lineHeight: 28 },

  equipmentStack: { gap: 16 },
  equipCard: { padding: 10, minHeight: 160 },
  equipVisual: { height: 87, borderRadius: radius.sm, backgroundColor: firstRunTheme.surfaceRaised },
  equipPhoto: { width: '100%', height: '100%', borderRadius: radius.sm },
  equipCheck: { position: 'absolute', top: 4, right: 4 },
  equipLabel: { paddingTop: 10, fontSize: 14, lineHeight: 19 },

  metricCard: { width: '100%', padding: 16, gap: 8, backgroundColor: firstRunTheme.measurementSurface, borderWidth: 1, borderColor: firstRunTheme.lineStrong, borderRadius: radius.lg },
  metricHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  metricMark: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: firstRunTheme.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  heightCard: { gap: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: firstRunTheme.lineStrong, backgroundColor: firstRunTheme.measurementSurface, padding: 16 },
  heightValue: { alignItems: 'center', gap: 2, paddingTop: 4 },
  heightMetricPicker: { width: '100%', alignSelf: 'center' },
  heightPickerRow: { flexDirection: 'row', gap: 12, width: '100%' },
  heightPickerColumn: { flex: 1, minWidth: 0 },
  weightCard: { padding: 15, width: '100%', backgroundColor: firstRunTheme.measurementSurface, borderRadius: radius.lg, borderWidth: 1, borderColor: firstRunTheme.lineStrong },
  weightReadout: { alignItems: 'center', gap: 4, paddingVertical: 30 },
  horizontalRuler: { alignItems: 'center', paddingTop: 18, paddingBottom: 8, borderTopWidth: 1, borderTopColor: firstRunTheme.lineStrong },

  genderCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, minHeight: 76 },
  genderIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: firstRunTheme.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
});

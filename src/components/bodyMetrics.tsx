import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useI18n } from '@/i18n';
import { usePreferences, useUpdatePreferences } from '@/hooks/queries';
import { palette } from '@/theme';
import { cmToFeetInches, CM_PER_INCH, feetInchesToCm, kgToLb, lbToKgStored, UnitSystem } from '@/utils/units';
import { RulerPicker } from './pickers';
import { Txt } from './primitives';

/**
 * Unit-aware height / weight pickers. The value in and out is always canonical (cm, kg); imperial
 * only changes the ruler (inches / pounds) and the readout. A value is converted back exactly once,
 * when the user moves the ruler, so viewing in another unit never rewrites the stored number.
 */
export const HEIGHT_RANGE = { metric: [120, 220], imperial: [47, 87] } as const; // 3'11"–7'3"
export const WEIGHT_RANGE = { metric: [30, 200], imperial: [66, 440] } as const;

export function heightReadout(cm: number, system: UnitSystem) {
  if (system === 'metric') return { value: String(Math.round(cm)), unit: 'cm' };
  const { feet, inches } = cmToFeetInches(cm);
  return { value: `${feet}′ ${inches}″`, unit: '' };
}

export function weightReadout(kg: number, system: UnitSystem) {
  return system === 'imperial' ? { value: String(Math.round(kgToLb(kg))), unit: 'lb' } : { value: String(Math.round(kg)), unit: 'kg' };
}

export function HeightRuler({ cm, onChange, system, accent, length, fade = palette.white, label, dark = false }: { cm: number; onChange: (cm: number) => void; system: UnitSystem; accent: string; length: number; fade?: string; label: string; dark?: boolean }) {
  const [min, max] = HEIGHT_RANGE[system];
  const value = system === 'imperial' ? Math.round(cm / CM_PER_INCH) : Math.round(cm);
  return <RulerPicker key={system} orientation="vertical" min={min} max={max} value={Math.min(max, Math.max(min, value))} majorEvery={system === 'imperial' ? 12 : 10}
    onChange={(v) => { if (v !== value) onChange(system === 'imperial' ? feetInchesToCm(0, v) : v); }} accent={accent} length={length} fade={fade} dark={dark} accessibilityLabel={label} />;
}

export function WeightRuler({ kg, onChange, system, accent, length, fade = palette.white, label, dark = false }: { kg: number; onChange: (kg: number) => void; system: UnitSystem; accent: string; length: number; fade?: string; label: string; dark?: boolean }) {
  const [min, max] = WEIGHT_RANGE[system];
  const value = system === 'imperial' ? Math.round(kgToLb(kg)) : Math.round(kg);
  return <RulerPicker key={system} orientation="horizontal" min={min} max={max} value={Math.min(max, Math.max(min, value))}
    onChange={(v) => { if (v !== value) onChange(system === 'imperial' ? lbToKgStored(v) : v); }} accent={accent} length={length} fade={fade} dark={dark} accessibilityLabel={label} />;
}

/** Reusable measurement-unit switch. Controlled callers keep local state; profile callers persist preferences. */
export function UnitToggle({ kind, system, accent, dark = false, onChange }: { kind: 'height' | 'weight'; system: UnitSystem; accent: string; dark?: boolean; onChange?: (system: UnitSystem) => void }) {
  const { dictionary } = useI18n();
  const update = useUpdatePreferences();
  usePreferences();
  const options: [UnitSystem, string][] = kind === 'height'
    ? [['metric', dark ? 'CM' : 'cm'], ['imperial', dark ? 'FT / IN' : `${dictionary.units.ft} + ${dictionary.units.in}`]]
    : [['metric', dark ? 'KG' : 'kg'], ['imperial', dark ? 'LB' : 'lb']];
  return <View style={[styles.toggle, dark && styles.darkToggle]} accessibilityRole="radiogroup">
    {options.map(([id, label]) => {
      const selected = system === id;
      return <Pressable key={id} testID={`unit-${kind}-${id}`} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => { if (id === system) return; if (onChange) onChange(id); else update.mutate({ units: id }); }} style={({ pressed }) => [styles.option, dark && styles.darkOption, selected && (dark ? styles.darkSelected : { backgroundColor: accent }), selected && dark && { borderColor: accent }, pressed && dark && styles.optionPressed]}>
         <Txt variant="label" color={selected ? palette.white : dark ? 'rgba(255,255,255,0.72)' : palette.inkSoft}>{label}</Txt>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignSelf: 'center', padding: 3, borderRadius: 999, backgroundColor: palette.grayBg },
  darkToggle: { backgroundColor: 'rgba(20,24,34,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  darkOption: { backgroundColor: 'transparent', paddingVertical: 7, borderWidth: 1, borderColor: 'transparent', minWidth: 72 },
  darkSelected: { backgroundColor: '#0D1B2B' },
  option: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, minWidth: 64, alignItems: 'center' },
  optionPressed: { transform: [{ scale: 0.97 }], opacity: 0.86 },
});

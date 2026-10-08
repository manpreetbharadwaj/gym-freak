import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GlyphIcon, mdi, Txt } from '@/components';
import { Header, Screen } from '@/components/layout';
import { format, useI18n } from '@/i18n';
import { usePreferences, useUpdatePreferences } from '@/hooks/queries';
import { deviceUnitSystem } from '@/hooks/useUnits';
import { RootScreenProps } from '@/navigation/types';
import { palette, radius, scenes, shadow } from '@/theme';
import { UnitPreference } from '@/utils/units';
import { haptics } from '@/utils/haptics';

/**
 * Settings → Units. A display preference only: height stays in cm, weight in kg and distance in
 * meters everywhere it is stored, so switching back and forth never changes a saved value.
 */
export function UnitsScreen({ navigation }: RootScreenProps<'Units'>) {
  const { dictionary } = useI18n();
  const copy = dictionary.units;
  const prefs = usePreferences();
  const update = useUpdatePreferences();
  const current: UnitPreference = prefs.data?.units ?? 'auto';
  const regional = deviceUnitSystem('auto');
  const options: { id: UnitPreference; title: string; body: string; glyph: string }[] = [
    { id: 'auto', title: copy.auto, body: format(copy.autoBody, { system: regional === 'imperial' ? copy.imperial : copy.metric }), glyph: 'earth' },
    { id: 'metric', title: copy.metric, body: copy.metricBody, glyph: 'ruler' },
    { id: 'imperial', title: copy.imperial, body: copy.imperialBody, glyph: 'ruler-square' },
  ];
  return <Screen scene={scenes.violet} header={<Header title={copy.title} onBack={() => navigation.goBack()} />}>
    <View style={{ gap: 10 }}>
      {options.map((o) => {
        const selected = o.id === current;
        return <Pressable key={o.id} testID={`units-${o.id}`} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${o.title}, ${o.body}`} onPress={() => { haptics.select(); update.mutate({ units: o.id }); }}
          style={({ pressed }) => [styles.row, selected && styles.selected, shadow(undefined, selected ? 0.6 : 0.3), pressed && { transform: [{ scale: 0.985 }] }]}>
          <View style={[styles.icon, selected && { backgroundColor: palette.violet }]}><GlyphIcon glyph={mdi(o.glyph)} size={20} color={selected ? palette.white : palette.violet} /></View>
          <View style={{ flex: 1 }}>
            <Txt variant="row">{o.title}</Txt>
            <Txt variant="small" color={palette.inkMuted}>{o.body}</Txt>
          </View>
          {selected ? <GlyphIcon glyph={mdi('check-circle')} size={22} color={palette.violet} /> : null}
        </Pressable>;
      })}
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: palette.surface, borderWidth: 1.5, borderColor: 'transparent' },
  selected: { borderColor: palette.violet, backgroundColor: palette.surfaceRaised },
  icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(34,184,245,0.12)', alignItems: 'center', justifyContent: 'center' },
});

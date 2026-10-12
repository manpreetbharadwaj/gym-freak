import React from 'react';
import { StyleSheet, View } from 'react-native';
import { mdi, Txt } from '@/components';
import { FilterChip, LinkRow, ToggleRow } from '@/components/inputs';
import { Header, Screen, Section } from '@/components/layout';
import { format, useI18n } from '@/i18n';
import { usePreferences } from '@/hooks/queries';
import { useUnitSystem } from '@/hooks/useUnits';
import { RootScreenProps } from '@/navigation/types';
import { healthAdapter } from '@/services/health';
import { updateActivitySettings, useActivitySettings } from '@/services/storage/activitySettings';
import { palette } from '@/theme';
import { distanceUnit } from '@/utils/units';
import { activityTheme } from './theme/activityGlassTheme';
import { GlassCard } from './theme/Glass';

/** Voice coach, auto-pause and health write-back (all FREE). Stored on this phone. */
export function ActivitySettingsScreen({ navigation }: RootScreenProps<'ActivitySettings'>) {
  const { dictionary } = useI18n();
  const copy = dictionary.activity;
  const settings = useActivitySettings();
  const system = useUnitSystem();
  const prefs = usePreferences();
  const adapter = healthAdapter();
  const steps: (0.5 | 1 | 2)[] = system === 'imperial' ? [0.5, 1] : [0.5, 1, 2];
  const unitsLabel = prefs.data?.units === 'imperial' ? dictionary.units.imperial : prefs.data?.units === 'metric' ? dictionary.units.metric : `${dictionary.units.auto} · ${system === 'imperial' ? dictionary.units.imperial : dictionary.units.metric}`;
  const provider = adapter ? dictionary.health[adapter.provider] : '';

  return <Screen scene={activityTheme.scene} header={<Header title={copy.settings} onBack={() => navigation.goBack()} />}>
    <GlassCard padded={false} style={styles.menu}>
      <ToggleRow testID="setting-voice" title={copy.voiceCoach} subtitle={copy.voiceCoachBody} glyph={mdi('account-voice')} color={palette.violet} value={settings.voiceCoach} onChange={(voiceCoach) => updateActivitySettings({ voiceCoach })} />
    </GlassCard>
    {settings.voiceCoach ? <>
      <Section title={copy.interval}>
        <View style={styles.chips}>
          {steps.map((step) => <FilterChip key={step} label={`${step} ${distanceUnit(system)}`} color={activityTheme.glass ? activityTheme.accent : undefined} active={settings.voiceStep === step || (system === 'imperial' && settings.voiceStep === 2 && step === 1)} onPress={() => updateActivitySettings({ voiceStep: step })} />)}
        </View>
      </Section>
      <Section title={copy.spoken}>
        <GlassCard padded={false} style={styles.menu}>
          <ToggleRow title={copy.distance} glyph={mdi('map-marker-distance')} color={palette.aqua} value={settings.voiceMetrics.distance} onChange={(distance) => updateActivitySettings({ voiceMetrics: { ...settings.voiceMetrics, distance } })} />
          <ToggleRow title={copy.duration} glyph={mdi('timer-outline')} color={palette.blue} value={settings.voiceMetrics.duration} onChange={(duration) => updateActivitySettings({ voiceMetrics: { ...settings.voiceMetrics, duration } })} />
          <ToggleRow title={copy.avgPace} glyph={mdi('speedometer')} color={palette.violet} value={settings.voiceMetrics.pace} onChange={(pace) => updateActivitySettings({ voiceMetrics: { ...settings.voiceMetrics, pace } })} />
          <ToggleRow title={copy.estCalories} glyph={mdi('fire')} color={palette.orange} value={settings.voiceMetrics.calories} onChange={(calories) => updateActivitySettings({ voiceMetrics: { ...settings.voiceMetrics, calories } })} />
        </GlassCard>
      </Section>
    </> : null}

    <Section title={dictionary.profile.settings}>
      <GlassCard padded={false} style={styles.menu}>
        <ToggleRow testID="setting-autopause" title={copy.autoPause} subtitle={copy.autoPauseBody} glyph={mdi('motion-pause-outline')} color={palette.aqua} value={settings.autoPause} onChange={(autoPause) => updateActivitySettings({ autoPause })} />
        {adapter ? <ToggleRow title={format(copy.saveToHealth, { provider })} subtitle={format(copy.saveToHealthBody, { provider })} glyph={mdi('heart-plus-outline')} color={palette.pink} value={settings.saveToHealth} onChange={(saveToHealth) => updateActivitySettings({ saveToHealth })} /> : null}
        <LinkRow title={copy.units} value={unitsLabel} glyph={mdi('ruler')} color={palette.pink} onPress={() => navigation.navigate('Units')} />
        {adapter ? <LinkRow title={copy.connectedApps} value={provider} glyph={mdi('heart-pulse')} color={palette.pink} onPress={() => navigation.navigate('ConnectedHealth')} /> : null}
      </GlassCard>
    </Section>
    <Txt variant="small" color={palette.inkMuted} align="center" style={{ marginTop: 18 }}>{copy.freeNote}</Txt>
  </Screen>;
}

const styles = StyleSheet.create({
  menu: { marginTop: 0, paddingVertical: 4 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});

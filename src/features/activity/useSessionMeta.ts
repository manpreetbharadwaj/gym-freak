import { useI18n, format } from '@/i18n';
import { useProfile } from '@/hooks/queries';
import { useUnitSystem } from '@/hooks/useUnits';
import { useActivitySettings } from '@/services/storage/activitySettings';
import { ActivityType } from '@/types/domain';
import { milestoneFor } from './announce';
import { SessionMeta } from './tracker';

/**
 * Snapshot of everything the session needs while the app may be in the background: units, voice
 * coach choices, translated voice phrases, and the body weight used for calorie estimates.
 */
export function useSessionMeta() {
  const { dictionary, language } = useI18n();
  const system = useUnitSystem();
  const settings = useActivitySettings();
  const profile = useProfile();
  const copy = dictionary.activity;
  return (type: ActivityType): SessionMeta => ({
    unitSystem: system,
    voice: settings.voiceCoach,
    milestoneMeters: milestoneFor(system, settings.voiceStep),
    metrics: settings.voiceMetrics,
    autoPause: settings.autoPause,
    weightKg: profile.data?.weightKg ?? profile.data?.bodyWeightKg ?? null,
    language,
    copy: { ...copy.voice },
    notification: { title: format(copy.notificationTitle, { type: copy.types[type].toLowerCase() }), body: copy.notificationBody },
  });
}

import * as Crypto from 'expo-crypto';
import { NotificationPreferences, OnboardingAnswers, Preferences } from '@/types/domain';
import { safeStorage } from './safeStorage';

/**
 * Device-only state: per-install values (installation id, first-run flags, audio cues).
 * Account data (story views, notification categories, progress) lives in HealthyMe.
 */

/** Mirrors the backend defaults; used by the offline mock repository. */
export const defaultNotificationPreferences: NotificationPreferences = { workoutReminders: true, reminderHour: 18, reminderMinute: 0, streakReminders: true, stories: true, weeklyChallenge: true, newContent: true, trialEnding: true, achievements: true };
export const defaultLocalPreferences = { audioCues: true };
type LocalPreferences = Pick<Preferences, 'audioCues'>;

export interface FirstRunState { introSeen: boolean; languageChosen: boolean; onboardingSaved: boolean }

export const localState = {
  async installationId() {
    let id = await safeStorage.get<string | null>('installationId', null);
    if (!id) { id = Crypto.randomUUID(); await safeStorage.set('installationId', id); }
    return id;
  },
  async preferences(): Promise<LocalPreferences> {
    const saved = await safeStorage.get<Partial<LocalPreferences>>('localPreferences', {});
    return { audioCues: saved.audioCues ?? defaultLocalPreferences.audioCues };
  },
  async savePreferences(patch: Partial<LocalPreferences>) {
    const current = await this.preferences();
    await safeStorage.set('localPreferences', { audioCues: patch.audioCues ?? current.audioCues });
  },
  /** Onboarding answers collected before sign-up; saved to HealthyMe right after authentication. */
  draft: () => safeStorage.get<OnboardingAnswers | null>('onboardingDraft', null),
  saveDraft: (answers: OnboardingAnswers) => safeStorage.set('onboardingDraft', answers),
  clearDraft: () => safeStorage.remove('onboardingDraft'),
  firstRun: () => safeStorage.get<FirstRunState>('firstRun', { introSeen: false, languageChosen: false, onboardingSaved: false }),
  async setFirstRun(patch: Partial<FirstRunState>) { await safeStorage.set('firstRun', { ...(await this.firstRun()), ...patch }); },
};

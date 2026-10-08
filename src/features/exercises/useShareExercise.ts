import { useCallback } from 'react';
import { Share } from 'react-native';
import { useReferral } from '@/hooks/queries';
import { format, useI18n } from '@/i18n';
import { exerciseShareUrl } from '@/navigation/links';
import { useRepos } from '@/store/session';

/**
 * Shares an exercise through the native share sheet (WhatsApp, Mail, Messages, Telegram, …) as one
 * link that carries the exercise and — when the sharer has one — their referral code. Without a code
 * the plain exercise link is shared; sharing is never blocked.
 */
export function useShareExercise() {
  const { dictionary } = useI18n();
  const { gym } = useRepos();
  const referral = useReferral();
  return useCallback(async (exercise: { id: string; slug?: string; name: string }) => {
    const code = referral.data?.active ? referral.data.code : null;
    const url = exerciseShareUrl(referral.data?.shareBaseUrl, exercise, code);
    const message = format(dictionary.share.message, { name: exercise.name });
    try {
      const result = await Share.share({ message: url ? `${message}\n${url}` : message });
      if (result.action === Share.sharedAction) gym.trackShare('exercise_shared', exercise.id, code ?? undefined);
    } catch { /* the user closed the sheet */ }
  }, [dictionary.share.message, gym, referral.data]);
}

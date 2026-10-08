import { parseLink, routeForLink } from '@/navigation/links';
import { ReferralSource } from '@/types/domain';
import { safeStorage } from './safeStorage';

/**
 * Deep links that arrive before the app can show them (signed out, onboarding, cold start).
 *  - `pendingLinkRoute`: the destination URL, opened once the signed-in navigator is ready (1 day).
 *  - `pendingReferral`:  a referral code from an invite / exercise link, offered at sign-up (30 days).
 * Opening a link never rewards anyone: the code is only *claimed* after an account is created, and the
 * server’s qualification rules decide everything after that.
 */
export interface PendingReferral { code: string; source: ReferralSource; at: number }
interface PendingRoute { url: string; at: number }

const ROUTE_TTL = 86_400_000;
const REFERRAL_TTL = 30 * 86_400_000;
const listeners = new Set<() => void>();

/** Records a link. Referral codes are only kept when nobody is signed in (attribution happens at sign-up). */
export async function captureLink(url: string, opts: { signedIn: boolean }) {
  const link = parseLink(url);
  if (!link) return;
  if (link.ref && !opts.signedIn) {
    const source: ReferralSource = link.kind === 'exercise' ? 'EXERCISE_SHARE' : link.kind === 'ref' ? 'LINK' : 'LINK';
    await safeStorage.set<PendingReferral>('pendingReferral', { code: link.ref, source, at: Date.now() });
  }
  // Only links that lead to a screen replace the destination (a later launch / unrelated URL must not overwrite it).
  if (routeForLink(url)) {
    await safeStorage.set<PendingRoute>('pendingLinkRoute', { url, at: Date.now() });
    listeners.forEach((l) => l());
  }
}

/** Takes (and clears) the pending destination, if still fresh. */
export async function takePendingRoute(): Promise<string | null> {
  const pending = await safeStorage.get<PendingRoute | null>('pendingLinkRoute', null);
  if (!pending) return null;
  await safeStorage.remove('pendingLinkRoute');
  return Date.now() - pending.at < ROUTE_TTL ? pending.url : null;
}

export function onPendingRoute(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export async function pendingReferral(): Promise<PendingReferral | null> {
  const pending = await safeStorage.get<PendingReferral | null>('pendingReferral', null);
  return pending && Date.now() - pending.at < REFERRAL_TTL ? pending : null;
}

export const clearPendingReferral = () => safeStorage.remove('pendingReferral');

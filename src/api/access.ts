import type { Access } from '../types/domain';
import type { ApiAccess } from './contracts';

/** The trial/premium decision is the server's; this only renames its statuses for the screens. */
export function accessFrom(a: ApiAccess): Access {
  const status = a.status === 'premium' ? 'premium' : a.status === 'trial' ? 'trial' : a.status === 'expired' ? 'expired' : 'free';
  return {
    status, premium: a.premium, trialEligible: a.trialEligible, trialDays: a.trialDays, trialStartedAt: a.trialStartedAt ?? undefined, trialEndsAt: a.trialEndsAt ?? undefined, premiumUntil: a.premiumUntil ?? undefined,
    premiumSource: a.premiumSource ?? undefined, paywallEnabled: a.paywallEnabled, premiumVisible: a.premiumVisible, billingEnabled: a.billingEnabled,
  };
}

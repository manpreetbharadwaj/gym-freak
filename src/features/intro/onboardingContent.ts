import type { OnboardingCard, OnboardingContent } from '../../types/domain';

/**
 * Where the first-launch onboarding cards come from. Pure (dependencies injected) so it runs under node tests.
 *
 * - Network first, with a short timeout: admin changes show on the next launch.
 * - A successful answer replaces the cache; an empty answer (admin unpublished everything) clears it.
 * - Offline / slow / server error: the last cached cards; with no cache, no cards (the caller skips onboarding).
 * - When the cache is shown, the network keeps going and `refreshed` resolves with newer cards (and updates the cache).
 */

export const ONBOARDING_CACHE_KEY = 'onboardingCards.v1';
export interface CachedOnboarding { version: string; locale: string; savedAt: number; cards: OnboardingCard[] }
export interface OnboardingDeps {
  fetch: () => Promise<OnboardingContent>;
  cache: { get: () => Promise<CachedOnboarding | null>; set: (value: CachedOnboarding) => Promise<void>; remove: () => Promise<void> };
  /** Warms the image cache (expo-image disk cache) so swiping and later offline launches have the images. */
  prefetch?: (urls: string[]) => Promise<unknown>;
  now?: () => number;
  /** How long to wait for the network before falling back to the cache. */
  timeoutMs?: { withCache: number; withoutCache: number };
}
export interface OnboardingLoad {
  cards: OnboardingCard[];
  source: 'network' | 'cache' | 'none';
  /** Only when `source` is 'cache': settles with the fresh cards once the network answers (null if it fails or nothing changed). */
  refreshed?: Promise<OnboardingCard[] | null>;
}

const TIMEOUT = { withCache: 3000, withoutCache: 8000 };
const TIMED_OUT = Symbol('timeout');

/** Cached values come from disk written by older app versions too; anything malformed is ignored. */
export function validCache(value: unknown): CachedOnboarding | null {
  const v = value as CachedOnboarding | null;
  if (!v || typeof v !== 'object' || !Array.isArray(v.cards) || !v.cards.length) return null;
  const cards = v.cards.filter((c) => c && typeof c.id === 'string' && typeof c.title === 'string' && typeof c.imageUrl === 'string' && c.imageUrl.length > 0);
  return cards.length ? { version: String(v.version ?? ''), locale: String(v.locale ?? ''), savedAt: Number(v.savedAt) || 0, cards } : null;
}

export async function loadOnboarding(deps: OnboardingDeps): Promise<OnboardingLoad> {
  const timeouts = deps.timeoutMs ?? TIMEOUT;
  const now = deps.now ?? Date.now;
  const cached = validCache(await deps.cache.get().catch(() => null));

  // One request; its result is applied whether it beats the timeout or arrives later.
  const network = deps.fetch().then(async (content) => {
    if (content.cards.length) {
      await deps.cache.set({ version: content.version, locale: content.locale, savedAt: now(), cards: content.cards }).catch(() => undefined);
      deps.prefetch?.(content.cards.map((c) => c.imageUrl)).catch(() => undefined);
    } else {
      await deps.cache.remove().catch(() => undefined);
    }
    return content;
  });
  network.catch(() => undefined); // a late failure after the timeout must not surface as unhandled

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => { timer = setTimeout(() => resolve(TIMED_OUT), cached ? timeouts.withCache : timeouts.withoutCache); });
  const first = await Promise.race([network, timeout]).catch(() => null).finally(() => clearTimeout(timer));

  if (first && first !== TIMED_OUT) return { cards: first.cards, source: first.cards.length ? 'network' : 'none' };
  if (!cached) return { cards: [], source: 'none' };
  deps.prefetch?.(cached.cards.map((c) => c.imageUrl)).catch(() => undefined);
  const refreshed = network.then((content) => (content.cards.length && content.version !== cached.version ? content.cards : null), () => null);
  return { cards: cached.cards, source: 'cache', refreshed };
}

/** Keeps a carousel index inside the card list after the list changes size (never negative). */
export const clampIndex = (index: number, count: number) => Math.max(0, Math.min(index, count - 1));

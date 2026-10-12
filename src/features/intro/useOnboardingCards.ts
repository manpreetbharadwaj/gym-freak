import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import type { GymRepository } from '@/services/repositories';
import { safeStorage } from '@/services/storage/safeStorage';
import type { OnboardingCard } from '@/types/domain';
import { CachedOnboarding, loadOnboarding, ONBOARDING_CACHE_KEY, OnboardingLoad } from './onboardingContent';

let pending: Promise<OnboardingLoad> | null = null;

/** Starts loading the onboarding cards (called while the splash plays, so the intro usually opens ready). */
export function preloadOnboarding(gym: GymRepository) {
  pending ??= loadOnboarding({
    fetch: () => gym.getOnboardingContent(),
    cache: {
      get: () => safeStorage.get<CachedOnboarding | null>(ONBOARDING_CACHE_KEY, null),
      set: (value) => safeStorage.set(ONBOARDING_CACHE_KEY, value),
      remove: () => safeStorage.remove(ONBOARDING_CACHE_KEY),
    },
    prefetch: (urls) => Image.prefetch(urls, 'memory-disk'),
  });
  return pending;
}

/**
 * Cards for the intro: `loading` until the network (or, offline, the cache) answers. When cached cards
 * are showing and newer ones arrive, they replace them in place (the screen keeps its index in range).
 */
export function useOnboardingCards(gym: GymRepository) {
  const [state, setState] = useState<{ status: 'loading' | 'ready'; cards: OnboardingCard[] }>({ status: 'loading', cards: [] });
  useEffect(() => {
    let alive = true;
    const load = preloadOnboarding(gym);
    load.then((result) => {
      if (!alive) return;
      setState({ status: 'ready', cards: result.cards });
      result.refreshed?.then((fresh) => { if (alive && fresh?.length) setState({ status: 'ready', cards: fresh }); });
    }, () => { if (alive) setState({ status: 'ready', cards: [] }); });
    // The next intro (e.g. after a reinstall-like reset in the same process) fetches again.
    return () => { alive = false; if (pending === load) pending = null; };
  }, [gym]);
  return state;
}

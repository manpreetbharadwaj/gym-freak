import { createNavigationContainerRef } from '@react-navigation/native';
import { routeForLink } from './links';
import { RootStackParamList } from './types';

export { linkForCta, routeForLink } from './links';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Navigates to a HealthyMe deep link (waits for the navigator on a cold start). Returns whether it was understood. */
export function openLink(url: string) {
  const route = routeForLink(url);
  if (!route) return false;
  const go = () => (navigationRef.navigate as (...args: unknown[]) => void)(...route);
  // Cold start / right after sign-in the navigator may still be mounting: wait for it (up to 10 s)
  // instead of guessing a delay, so a shared link is never dropped on slower devices.
  let tries = 0;
  const attempt = () => { if (navigationRef.isReady()) go(); else if (tries++ < 50) setTimeout(attempt, 200); };
  attempt();
  return true;
}

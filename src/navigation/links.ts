import type { RootStackParamList } from './types';

type Route = { [K in keyof RootStackParamList]: [K, RootStackParamList[K]] }[keyof RootStackParamList];

/** HTTPS hosts whose /exercise and /ref paths are ours (universal / app links). From EXPO_PUBLIC_LINK_BASE_URL. */
export function linkHosts(base = process.env.EXPO_PUBLIC_LINK_BASE_URL): string[] {
  try { return base ? [new URL(base).host.toLowerCase()] : []; } catch { return []; }
}

export interface ParsedLink { kind: string; id?: string; ref?: string }

/**
 * gymfreak://<kind>[/<id>][?ref=CODE] or https://<link host>/<exercise|ref>/<id>[?ref=CODE].
 * Unknown hosts / shapes → null. Ids are UUIDs or slugs; codes are normalised to upper case.
 */
export function parseLink(url: string, hosts = linkHosts()): ParsedLink | null {
  const raw = url.trim();
  const scheme = /^gymfreak:\/\/([a-z-]+)(?:\/([A-Za-z0-9-]+))?\/?(\?[^#]*)?(?:#.*)?$/.exec(raw);
  const web = scheme ? null : /^https:\/\/([^/?#]+)\/(exercise|ref)\/([A-Za-z0-9-]+)\/?(\?[^#]*)?(?:#.*)?$/.exec(raw);
  if (web && !hosts.includes(web[1].toLowerCase())) return null;
  const [kind, id, query] = scheme ? [scheme[1], scheme[2], scheme[3]] : web ? [web[2], web[3], web[4]] : [];
  if (!kind) return null;
  const refRaw = /[?&]ref=([A-Za-z0-9]{4,16})(?:&|$)/.exec(query ?? '')?.[1];
  const ref = kind === 'ref' ? id?.toUpperCase() : refRaw?.toUpperCase();
  return { kind, id: kind === 'ref' ? undefined : id, ref: ref && /^[A-Z0-9]{4,16}$/.test(ref) ? ref : undefined };
}

/**
 * Maps HealthyMe deep links (push payloads, story CTAs, shared exercise links) to screens:
 * gymfreak://workout/<id> · exercise/<id or slug> · story/<id> · plan · achievements · upgrade · progress · home · water · stopwatch,
 * and https://<link host>/exercise/<id or slug>?ref=CODE. Referral-only links (ref/<code>) have no screen.
 * Unknown links resolve to null and are ignored.
 */
export function routeForLink(url: string, hosts = linkHosts()): Route | null {
  const link = parseLink(url, hosts);
  if (!link) return null;
  const { kind, id } = link;
  switch (kind) {
    case 'workout': return id ? ['WorkoutDetail', { workoutId: id }] : null;
    case 'exercise': return id ? ['ExerciseDetail', link.ref || url.startsWith('https://') ? { exerciseId: id, shared: true } : { exerciseId: id }] : null;
    case 'story': return id ? ['StoryViewer', { startId: id }] : null;
    case 'achievements': return ['Achievements', undefined];
    case 'upgrade': return ['Upgrade', undefined];
    case 'plan': return ['Tabs', { screen: 'Workout' }];
    case 'progress': return ['Tabs', { screen: 'Progress' }];
    case 'home': return ['Tabs', { screen: 'Home' }];
    case 'water': return ['WaterIntake', undefined];
    case 'stopwatch': return ['Stopwatch', undefined];
    case 'refer': return ['ReferEarn', undefined];
    default: return null;
  }
}

/** The public share link for an exercise, with the sharer’s referral code when there is one. */
export function exerciseShareUrl(base: string | null | undefined, exercise: { id: string; slug?: string }, referralCode?: string | null) {
  const root = (base || process.env.EXPO_PUBLIC_LINK_BASE_URL || '').replace(/\/+$/, '');
  if (!/^https:\/\//.test(root)) return null;
  return `${root}/exercise/${encodeURIComponent(exercise.slug || exercise.id)}${referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ''}`;
}

/** A story call-to-action from the admin panel (type + target) as a deep link, or an https URL. */
export function linkForCta(cta: { type?: string; target?: string }): string | null {
  switch (cta.type) {
    case 'workout': case 'exercise': return cta.target ? `gymfreak://${cta.type}/${cta.target}` : null;
    case 'plan': case 'achievements': case 'upgrade': return `gymfreak://${cta.type}`;
    case 'url': return cta.target && /^https:\/\//.test(cta.target) ? cta.target : null;
    default: return cta.target ?? null;
  }
}

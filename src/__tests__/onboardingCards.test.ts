import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onboardingCardFrom } from '../api/onboarding';
import type { ApiOnboardingCard } from '../api/onboarding';
import { CachedOnboarding, clampIndex, loadOnboarding, OnboardingDeps, validCache } from '../features/intro/onboardingContent';
import type { OnboardingCard, OnboardingContent } from '../types/domain';

const card = (id: string, extra: Partial<OnboardingCard> = {}): OnboardingCard => ({ id, title: `Card ${id}`, description: `About ${id}`, imageUrl: `https://api.test/v1/media/${id}/content.jpg`, imageFit: 'cover', textColor: '#FFFFFF', ...extra });
const content = (ids: string[], version = ids.join('-')): OnboardingContent => ({ version, locale: 'en', cards: ids.map((id) => card(id)) });

function harness(fetch: () => Promise<OnboardingContent>, cached: CachedOnboarding | null = null) {
  const disk = { value: cached as CachedOnboarding | null };
  const prefetched: string[][] = [];
  const deps: OnboardingDeps = {
    fetch,
    cache: { get: async () => disk.value, set: async (v) => { disk.value = v; }, remove: async () => { disk.value = null; } },
    prefetch: async (urls) => { prefetched.push(urls); },
    now: () => 1000,
    timeoutMs: { withCache: 20, withoutCache: 40 },
  };
  return { deps, disk, prefetched };
}
const offline = () => Promise.reject(new Error('Network unavailable'));
const never = () => new Promise<OnboardingContent>(() => undefined);
const later = (value: OnboardingContent, ms: number) => () => new Promise<OnboardingContent>((resolve) => setTimeout(() => resolve(value), ms));

for (const count of [1, 2, 3, 4, 7]) {
  test(`network: ${count} published card(s) are shown exactly, in order, cached and prefetched`, async () => {
    const ids = Array.from({ length: count }, (_, i) => `c${i + 1}`);
    const h = harness(async () => content(ids));
    const result = await loadOnboarding(h.deps);
    assert.equal(result.source, 'network');
    assert.deepEqual(result.cards.map((c) => c.id), ids);
    assert.deepEqual(h.disk.value?.cards.map((c) => c.id), ids);
    assert.equal(h.prefetched[0].length, count);
  });
}

test('no published cards: nothing to show, and a stale cache is cleared', async () => {
  const h = harness(async () => content([]), { version: 'old', locale: 'en', savedAt: 1, cards: [card('old')] });
  const result = await loadOnboarding(h.deps);
  assert.deepEqual(result, { cards: [], source: 'none' });
  assert.equal(h.disk.value, null);
});

test('offline launch with a cache shows the cached cards', async () => {
  const h = harness(offline, { version: 'v1', locale: 'en', savedAt: 1, cards: [card('a'), card('b')] });
  const result = await loadOnboarding(h.deps);
  assert.equal(result.source, 'cache');
  assert.deepEqual(result.cards.map((c) => c.id), ['a', 'b']);
  assert.equal(await result.refreshed, null);
});

test('offline first launch with no cache: nothing to show (the app continues to the next screen)', async () => {
  const result = await loadOnboarding(harness(offline).deps);
  assert.deepEqual(result, { cards: [], source: 'none' });
});

test('a server that never answers falls back to the cache after the timeout', async () => {
  const h = harness(never, { version: 'v1', locale: 'en', savedAt: 1, cards: [card('a')] });
  const started = Date.now();
  const result = await loadOnboarding(h.deps);
  assert.equal(result.source, 'cache');
  assert.ok(Date.now() - started < 1000);
});

test('slow network: cached cards first, then the fresh ones (and the cache is refreshed)', async () => {
  const h = harness(later(content(['a', 'b', 'c'], 'v2'), 60), { version: 'v1', locale: 'en', savedAt: 1, cards: [card('a'), card('b')] });
  const result = await loadOnboarding(h.deps);
  assert.deepEqual(result.cards.map((c) => c.id), ['a', 'b']);
  assert.deepEqual((await result.refreshed)?.map((c) => c.id), ['a', 'b', 'c']);
  assert.equal(h.disk.value?.version, 'v2');
});

test('slow network with unchanged content does not replace what is showing', async () => {
  const h = harness(later(content(['a'], 'v1'), 40), { version: 'v1', locale: 'en', savedAt: 1, cards: [card('a')] });
  const result = await loadOnboarding(h.deps);
  assert.equal(await result.refreshed, null);
});

test('malformed or empty cache entries are ignored', () => {
  assert.equal(validCache(null), null);
  assert.equal(validCache({ cards: [] }), null);
  assert.equal(validCache({ cards: [{ id: 'x' }] }), null);
  assert.deepEqual(validCache({ version: 'v', locale: 'en', savedAt: 1, cards: [card('a'), { id: 'broken' }] })?.cards.map((c) => c.id), ['a']);
});

test('carousel index stays in range when the card count changes', () => {
  assert.equal(clampIndex(3, 4), 3);
  assert.equal(clampIndex(3, 2), 1);
  assert.equal(clampIndex(5, 1), 0);
  assert.equal(clampIndex(-1, 3), 0);
  assert.equal(clampIndex(2, 0), 0);
});

const api = (extra: Partial<ApiOnboardingCard> = {}): ApiOnboardingCard => ({ id: 'c1', tag: 'Guided', title: 'See every move', description: 'Clear demos.', imageUrl: '/v1/media/m1/content.jpg', imageWidth: 1077, imageHeight: 1039, imageFit: 'COVER', backgroundColor: null, gradient: null, textColor: '#FFFFFF', accentColor: null, ...extra });

test('API cards map to app cards: media URL resolved, styling validated, defaults applied', () => {
  const [mapped] = onboardingCardFrom(api({ imageFit: 'CONTAIN', backgroundColor: '#02060B', gradient: { colors: ['#02060B', '#0B3A55'], angle: 160 }, accentColor: '#22B8F5' }), 'https://api.test');
  assert.deepEqual(mapped, { id: 'c1', tag: 'Guided', title: 'See every move', description: 'Clear demos.', imageUrl: 'https://api.test/v1/media/m1/content.jpg', imageWidth: 1077, imageHeight: 1039, imageFit: 'contain', backgroundColor: '#02060B', gradient: { colors: ['#02060B', '#0B3A55'], angle: 160 }, textColor: '#FFFFFF', accentColor: '#22B8F5' });
  const [plain] = onboardingCardFrom(api({ tag: ' ', textColor: 'white', backgroundColor: 'red', gradient: { colors: ['#000000'] } }), 'https://api.test');
  assert.equal(plain.tag, undefined);
  assert.equal(plain.textColor, '#FFFFFF');
  assert.equal(plain.backgroundColor, undefined);
  assert.equal(plain.gradient, undefined);
  assert.deepEqual(onboardingCardFrom(api({ imageUrl: null }), 'https://api.test'), []);
  assert.deepEqual(onboardingCardFrom(api({ title: '  ' }), 'https://api.test'), []);
});

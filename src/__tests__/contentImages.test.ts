import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contentTilesFrom, tileFor } from '../api/contentTiles';
import { cachedFetch, CacheStore } from '../services/storage/cachedFetch';
import { routeForLink } from '../navigation/links';

test('content tiles: relative media URLs resolve, unusable tiles and unknown sections are dropped', () => {
  const tiles = contentTilesFrom({
    version: 'v1',
    sections: {
      explore_muscle: [
        { id: 't1', key: 'chest', title: null, imageUrl: '/v1/media/a/content.jpg', imageWidth: 600, imageHeight: 400, imageFit: 'COVER' },
        { id: 't2', key: 'back', title: ' Back day ', imageUrl: null, imageWidth: null, imageHeight: null, imageFit: 'COVER' },
      ],
      explore_equipment: [{ id: 't3', key: 'bench', title: 'Bench', imageUrl: 'https://cdn.test/b.png', imageWidth: null, imageHeight: null, imageFit: 'CONTAIN' }],
      home_banner: [{ id: 'x', key: 'promo', title: null, imageUrl: '/v1/media/x/content.jpg', imageWidth: null, imageHeight: null, imageFit: 'COVER' }],
    },
  }, 'https://api.test/v1');
  assert.deepEqual(tiles.sections.explore_muscle, [{ id: 't1', key: 'chest', title: undefined, imageUrl: 'https://api.test/v1/media/a/content.jpg', imageWidth: 600, imageHeight: 400, imageFit: 'cover' }]);
  assert.equal(tiles.sections.explore_equipment?.[0].imageFit, 'contain');
  assert.equal(tiles.sections.explore_equipment?.[0].title, 'Bench');
  assert.equal((tiles.sections as Record<string, unknown>).home_banner, undefined);
  assert.deepEqual(tiles.sections.onboarding_goal, []);
  assert.equal(tileFor(tiles, 'explore_muscle', 'chest')?.id, 't1');
  assert.equal(tileFor(tiles, 'explore_muscle', 'legs'), undefined);
  assert.deepEqual(contentTilesFrom(null, 'https://api.test').sections.explore_goal, []);
});

test('cachedFetch: network wins and is stored; offline serves the last good copy; no cache rethrows', async () => {
  const disk = new Map<string, unknown>();
  const store: CacheStore = { get: async <T>(k: string) => (disk.has(k) ? (disk.get(k) as T) : null), set: async (k, v) => { disk.set(k, v); } };
  assert.deepEqual(await cachedFetch('k', async () => ['fresh'], store), ['fresh']);
  assert.deepEqual(disk.get('k'), ['fresh']);
  assert.deepEqual(await cachedFetch('k', async () => { throw new Error('offline'); }, store), ['fresh']);
  await assert.rejects(cachedFetch('other', async () => { throw new Error('offline'); }, store), /offline/);
});

test('push deep links: explore and plan open their tabs', () => {
  assert.deepEqual(routeForLink('gymfreak://explore', []), ['Tabs', { screen: 'Explore' }]);
  assert.deepEqual(routeForLink('gymfreak://plan', []), ['Tabs', { screen: 'Workout' }]);
  assert.equal(routeForLink('gymfreak://unknown', []), null);
});

test('bundle: no Home / Explore / Workout / onboarding content photos are shipped in the app', () => {
  const manifest = JSON.parse(readFileSync('src/assets/image-manifest.json', 'utf8')) as { assets: Record<string, unknown> };
  assert.deepEqual(Object.keys(manifest.assets), ['profile/cover']);
  const registry = readFileSync('src/assets/images/index.ts', 'utf8');
  assert.deepEqual([...registry.matchAll(/require\('([^']+)'\)/g)].map((m) => m[1]), ['./profile/cover.jpg']);
});

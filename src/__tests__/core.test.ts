import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accessFrom } from '../api/access';
import type { ApiAccess } from '../api/contracts';
import { resolveMediaUrl } from '../api/media';
import { linkForCta, routeForLink } from '../navigation/links';

const access = (over: Partial<ApiAccess>): ApiAccess => ({
  status: 'eligible', premium: false, trialEligible: true, trialDays: 7, trialStartedAt: null, trialEndsAt: null, premiumUntil: null, premiumSource: null,
  paywallEnabled: true, premiumVisible: true, billingEnabled: false, ...over,
});

test('access: server statuses map to app statuses without client-side inference', () => {
  assert.equal(accessFrom(access({ status: 'eligible' })).status, 'free');
  assert.equal(accessFrom(access({ status: 'not_eligible', trialEligible: false })).status, 'free');
  assert.equal(accessFrom(access({ status: 'trial', premium: true, trialEndsAt: '2026-10-10T00:00:00Z' })).status, 'trial');
  assert.equal(accessFrom(access({ status: 'expired' })).status, 'expired');
  // A stale future premiumUntil does not make the client claim premium: the server status wins.
  assert.equal(accessFrom(access({ status: 'expired', premiumUntil: '2999-01-01T00:00:00Z' })).premium, false);
  const mapped = accessFrom(access({ trialDays: 14, billingEnabled: true }));
  assert.equal(mapped.trialDays, 14);
  assert.equal(mapped.billingEnabled, true);
});

test('media: relative HealthyMe URLs resolve against the API origin; absolute ones pass through', () => {
  assert.equal(resolveMediaUrl('http://192.168.1.17:3000', '/v1/media/abc/content'), 'http://192.168.1.17:3000/v1/media/abc/content');
  assert.equal(resolveMediaUrl('http://api.test/v1/', '/v1/media/abc/content'), 'http://api.test/v1/media/abc/content');
  assert.equal(resolveMediaUrl('http://api.test', 'https://cdn.test/x.mp4'), 'https://cdn.test/x.mp4');
  assert.equal(resolveMediaUrl('http://api.test', null), undefined);
});

test('deep links: push/CTA links route to screens; unknown links are ignored', () => {
  assert.deepEqual(routeForLink('gymfreak://workout/29764cb7-352a-48cc-a4f5-f4320aad8c78'), ['WorkoutDetail', { workoutId: '29764cb7-352a-48cc-a4f5-f4320aad8c78' }]);
  assert.deepEqual(routeForLink('gymfreak://story/s1'), ['StoryViewer', { startId: 's1' }]);
  assert.deepEqual(routeForLink('gymfreak://plan'), ['Tabs', { screen: 'Workout' }]);
  assert.deepEqual(routeForLink('gymfreak://upgrade?src=push'), ['Upgrade', undefined]);
  assert.equal(routeForLink('gymfreak://workout'), null);
  assert.equal(routeForLink('https://evil.test/workout/1'), null);
  assert.equal(routeForLink('gymfreak://unknown/1'), null);
});

test('story CTAs: admin types become deep links; only https web links are allowed', () => {
  assert.equal(linkForCta({ type: 'workout', target: 'w1' }), 'gymfreak://workout/w1');
  assert.equal(linkForCta({ type: 'upgrade' }), 'gymfreak://upgrade');
  assert.equal(linkForCta({ type: 'url', target: 'https://healthyme.test/tips' }), 'https://healthyme.test/tips');
  assert.equal(linkForCta({ type: 'url', target: 'http://insecure.test' }), null);
  assert.equal(linkForCta({ type: 'exercise' }), null);
});

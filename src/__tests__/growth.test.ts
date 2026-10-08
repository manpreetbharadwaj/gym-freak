import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exerciseShareUrl, parseLink, routeForLink } from '../navigation/links';
import { discountLabel, formatMoney } from '../utils/money';

const hosts = ['gymfreak.app'];

test('exercise share links: scheme + universal links, exercise identity and referral attribution', () => {
  assert.deepEqual(parseLink('https://gymfreak.app/exercise/bench-press?ref=gf8k2m9', hosts), { kind: 'exercise', id: 'bench-press', ref: 'GF8K2M9' });
  assert.deepEqual(parseLink('gymfreak://exercise/29764cb7-352a-48cc-a4f5-f4320aad8c78?ref=MANPRE7K', hosts), { kind: 'exercise', id: '29764cb7-352a-48cc-a4f5-f4320aad8c78', ref: 'MANPRE7K' });
  assert.deepEqual(parseLink('https://gymfreak.app/ref/GF8K2M9', hosts), { kind: 'ref', id: undefined, ref: 'GF8K2M9' });
  assert.deepEqual(routeForLink('https://gymfreak.app/exercise/bench-press?ref=GF8K2M9', hosts), ['ExerciseDetail', { exerciseId: 'bench-press', shared: true }]);
  assert.deepEqual(routeForLink('gymfreak://exercise/bench-press', hosts), ['ExerciseDetail', { exerciseId: 'bench-press' }]);
  assert.equal(routeForLink('https://gymfreak.app/ref/GF8K2M9', hosts), null); // referral only, no screen
});

test('untrusted or malformed links are ignored', () => {
  assert.equal(parseLink('https://evil.test/exercise/bench-press?ref=GF8K2M9', hosts), null);
  assert.equal(parseLink('https://gymfreak.app/exercise/../admin', hosts), null);
  assert.equal(parseLink('https://gymfreak.app/exercise/bench-press?ref=<script>', hosts)?.ref, undefined);
  assert.equal(routeForLink('https://gymfreak.app/workout/1', hosts), null);
});

test('share URL carries the exercise slug and the sharer’s code; no code → plain link', () => {
  const ex = { id: 'e1', slug: 'bench-press' };
  assert.equal(exerciseShareUrl('https://gymfreak.app/', ex, 'GF8K2M9'), 'https://gymfreak.app/exercise/bench-press?ref=GF8K2M9');
  assert.equal(exerciseShareUrl('https://gymfreak.app', ex, null), 'https://gymfreak.app/exercise/bench-press');
  assert.equal(exerciseShareUrl('https://gymfreak.app', { id: 'e1' }, null), 'https://gymfreak.app/exercise/e1');
  assert.equal(exerciseShareUrl('http://insecure.test', ex, null), null);
});

test('money is display-only formatting of server minor units', () => {
  assert.match(formatMoney(99900, 'INR', 'en-IN'), /999/);
  assert.match(formatMoney(69930, 'INR', 'en-IN'), /699\.30/);
  assert.equal(discountLabel({ discountType: 'PERCENTAGE', discountValue: 20 }, 'INR'), '20%');
  assert.match(discountLabel({ discountType: 'FIXED', discountValue: 10000 }, 'INR', 'en-IN'), /100/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discountLabel, formatMoney, minorDigits } from '../utils/money';
import { alpha3Pairs, storefrontToAlpha2 } from '../utils/storefront';

test('App Store storefronts (alpha-3) and Play countries (alpha-2) both become alpha-2', () => {
  assert.equal(storefrontToAlpha2('IND'), 'IN');
  assert.equal(storefrontToAlpha2('USA'), 'US');
  assert.equal(storefrontToAlpha2('GBR'), 'GB');
  assert.equal(storefrontToAlpha2('DEU'), 'DE');
  assert.equal(storefrontToAlpha2('fra'), 'FR');
  assert.equal(storefrontToAlpha2('gb'), 'GB'); // Play Billing already reports alpha-2
  for (const bad of ['', '  ', 'ZZZ', 'U', 'USAA', null, undefined]) assert.equal(storefrontToAlpha2(bad), null);
});

test('the alpha-3 table is one-to-one', () => {
  const pairs = alpha3Pairs();
  assert.equal(new Set(pairs.map(([a3]) => a3)).size, pairs.length);
  assert.equal(new Set(pairs.map(([, a2]) => a2)).size, pairs.length);
  assert.ok(pairs.length >= 249);
});

test('money uses each currency’s own minor unit and symbol, never a global one', () => {
  assert.equal(minorDigits('USD'), 2);
  assert.equal(minorDigits('JPY'), 0);
  assert.equal(minorDigits('KWD'), 3);
  assert.equal(formatMoney(999, 'USD', 'en-US'), '$9.99');
  assert.equal(formatMoney(799, 'GBP', 'en-GB'), '£7.99');
  assert.match(formatMoney(899, 'EUR', 'de-DE'), /8,99\s?€/);
  assert.equal(formatMoney(49900, 'INR', 'en-IN'), '₹499');
  assert.equal(formatMoney(1200, 'JPY', 'ja-JP').replace(/\s/g, ''), '￥1,200');
  assert.equal(discountLabel({ discountType: 'FIXED', discountValue: 500 }, null), '500'); // no currency → no invented symbol
});

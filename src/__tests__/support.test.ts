import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeForLink } from '../navigation/links';
import { en } from '../i18n/en';
import { BILLING_CATEGORIES, FEEDBACK_CATEGORIES, PARTNER_BUDGETS, PARTNER_TYPES, SUPPORT_CATEGORIES } from '../types/support';

test('support push links open the ticket (or Help & Support without an id)', () => {
  assert.deepEqual(routeForLink('gymfreak://support/9c1f0d1e-0000-4000-8000-000000000001'), ['SupportTicket', { ticketId: '9c1f0d1e-0000-4000-8000-000000000001' }]);
  assert.deepEqual(routeForLink('gymfreak://support'), ['HelpSupport', undefined]);
});

test('every category, type and budget the server accepts has an English label', () => {
  for (const c of SUPPORT_CATEGORIES) assert.ok(en.support.categories[c], `support category ${c}`);
  for (const c of FEEDBACK_CATEGORIES) assert.ok(en.support.feedback.categories[c], `feedback category ${c}`);
  for (const t of PARTNER_TYPES) { assert.ok(en.support.partner.types[t], `partner type ${t}`); assert.ok(en.support.partner.typeBodies[t], `partner body ${t}`); }
  for (const b of PARTNER_BUDGETS) assert.ok(en.support.partner.budgets[b], `budget ${b}`);
  for (const c of BILLING_CATEGORIES) assert.ok(SUPPORT_CATEGORIES.includes(c));
});

test('the partnership copy makes no audience-size or performance claims', () => {
  const text = JSON.stringify(en.support.partner).toLowerCase();
  for (const claim of ['million', 'impressions', 'conversion', 'roi', 'guarantee', 'users per', 'monthly active']) assert.ok(!text.includes(claim), `unexpected claim: ${claim}`);
});

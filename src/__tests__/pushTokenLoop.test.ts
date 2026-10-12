import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Regression: expo-notifications emits the push-token event on every token request, and registering the device
// requests the token, so the listener must ignore unchanged values (a loop hit PUT /me/gym/devices every few seconds).
test('push token listener only reacts to a changed token value', () => {
  const src = readFileSync('src/services/notifications.ts', 'utf8');
  const body = src.slice(src.indexOf('export function onPushTokenChanged'), src.indexOf('return () => sub.remove();', src.indexOf('export function onPushTokenChanged')));
  assert.match(body, /if \(value === lastDeviceToken\) return;/);
  assert.match(body, /if \(!first\) onChange\(\);/);
});

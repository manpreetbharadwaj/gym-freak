import { test } from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../i18n/en';
import { languages } from '../i18n/languages';

type Tree = Record<string, unknown>;
const flatten = (value: unknown, prefix = '', out: Record<string, unknown> = {}) => {
  for (const [key, child] of Object.entries(value as Tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, path, out);
    else out[path] = child;
  }
  return out;
};
const placeholders = (text: unknown) => (typeof text === 'string' ? (text.match(/\{\w+\}/g) ?? []).sort() : []);
const source = flatten(en);

test('12 languages are registered and Arabic is right-to-left', () => {
  assert.equal(languages.length, 12);
  assert.equal(languages.find((l) => l.code === 'ar')?.rtl, true);
});

for (const language of languages.filter((l) => l.code !== 'en')) {
  test(`${language.code}: every English string is translated, with the same placeholders`, () => {
    const translated = flatten(language.messages);
    const missing = Object.keys(source).filter((key) => !(key in translated));
    assert.deepEqual(missing, [], `${language.code} is missing ${missing.length} strings`);
    const extra = Object.keys(translated).filter((key) => !(key in source));
    assert.deepEqual(extra, [], `${language.code} has unknown keys`);
    for (const [key, text] of Object.entries(translated)) {
      assert.deepEqual(placeholders(text), placeholders(source[key]), `${language.code}.${key} placeholders differ`);
      if (Array.isArray(source[key])) assert.equal((text as unknown[]).length, (source[key] as unknown[]).length, `${language.code}.${key} list length`);
    }
  });
}

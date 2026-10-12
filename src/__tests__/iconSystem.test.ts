import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/Icon.tsx', 'utf8');
const [registryPart, legacyPart] = source.split('export const legacyGlyphs');
const registry = new Set([...registryPart.split('export const icons = {')[1].split('} satisfies')[0].matchAll(/\b([a-zA-Z]+): [A-Z][A-Za-z0-9]*/g)].map((m) => m[1]));
const imported = new Set(registryPart.split("} from 'lucide-react-native'")[0].split('import {')[2].split(',').map((s) => s.trim()).filter(Boolean));

test('icon system: every semantic icon is a real Lucide import and every legacy glyph maps to a semantic icon', () => {
  const lucideRefs = [...registryPart.split('export const icons = {')[1].split('} satisfies')[0].matchAll(/: ([A-Z][A-Za-z0-9]*)/g)].map((m) => m[1]);
  for (const ref of lucideRefs) assert.ok(imported.has(ref), `${ref} is not imported from lucide-react-native`);
  const targets = [...legacyPart.matchAll(/: '([a-zA-Z]+)'/g)].map((m) => m[1]);
  assert.ok(targets.length > 100);
  for (const target of targets) assert.ok(registry.has(target), `legacy glyph maps to unknown icon "${target}"`);
});

test('icon system: one size scale (16 / 20 / 24 / 32) and a stroke for each size', () => {
  const theme = readFileSync('src/theme/index.ts', 'utf8');
  assert.match(theme, /iconSizes = \{ xs: 16, sm: 20, md: 24, lg: 32 \}/);
  assert.match(theme, /iconStroke = \{ xs: [\d.]+, sm: [\d.]+, md: [\d.]+, lg: [\d.]+ \}/);
  // Raw icon fonts are only reachable through GlyphIcon's fallback, never from screens directly.
  for (const file of ['src/features/intro/IntroScreen.tsx', 'src/components/AssetImage.tsx', 'src/navigation/CapsuleTabBar.tsx']) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /MaterialCommunityIcons|Ionicons/, file);
  }
});

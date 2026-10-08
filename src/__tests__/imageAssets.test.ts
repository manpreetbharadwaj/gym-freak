import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

test('app assets: every registered replacement path exists, has the right encoding, and fits the image budget', () => {
  const manifest = JSON.parse(readFileSync('src/assets/image-manifest.json', 'utf8')) as { assets: Record<string, { file: string; crop: number[] | null }> };
  let total = 0;
  for (const [name, entry] of Object.entries(manifest.assets)) {
    const file = path.join('src/assets/images', entry.file);
    const bytes = readFileSync(file);
    total += statSync(file).size;
    assert.ok(bytes.length > 24, `${name} must be a valid image, not an empty placeholder`);
    if (file.endsWith('.jpg')) assert.equal(bytes.subarray(0, 3).toString('hex'), 'ffd8ff', name);
    else assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', name);
    if (entry.crop) {
      assert.equal(entry.crop.length, 4);
      assert.ok(entry.crop[0] >= 0 && entry.crop[0] + entry.crop[2] <= 1536, name);
      assert.ok(entry.crop[1] >= 0 && entry.crop[1] + entry.crop[3] <= 1024, name);
    }
  }
  // Whole-app budget (first-run + post-auth photography); real exercise media streams from the backend.
  assert.ok(total < 1_500_000, `Bundled artwork exceeds the 1.5 MB budget: ${total}`);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Execute the real storage modules, replacing only the native I/O boundary.
function storageFixture() {
  const disk = new Map<string, string>();
  const native = {
    getItem: async (key: string) => disk.get(key) ?? null,
    setItem: async (key: string, value: string) => { disk.set(key, value); },
    removeItem: async (key: string) => { disk.delete(key); },
  };
  function load(file: string, dependencies: Record<string, unknown>) {
    const output = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const exports: Record<string, any> = {};
    runInNewContext(output, { exports, require: (id: string) => {
      assert.ok(id in dependencies, `Unmocked native dependency: ${id}`);
      return dependencies[id];
    } });
    return exports;
  }
  const safe = load('src/services/storage/safeStorage.ts', { '@react-native-async-storage/async-storage': native });
  const { localState } = load('src/services/storage/localState.ts', { './safeStorage': safe, 'expo-crypto': { randomUUID } });
  return { disk, localState };
}

test('first-run: completed answers round-trip through the real namespaced storage adapter', async () => {
  const { disk, localState } = storageFixture();
  const answers = { goal: 'improve-mobility', experience: 'advanced', location: 'both', daysPerWeek: 7, duration: '60-90', equipment: ['bands', 'bodyweight', 'full-gym'], body: { age: 41, heightCm: 178, weightKg: 83, gender: 'non-binary' } };
  await localState.saveDraft(answers);
  assert.deepEqual(JSON.parse(JSON.stringify(await localState.draft())), answers);
  assert.equal(disk.has('gymfreak.onboardingDraft'), true);
  await localState.clearDraft();
  assert.equal(await localState.draft(), null);
});

test('first-run: skipped metrics stay absent, and progress flags merge rather than overwrite', async () => {
  const { localState } = storageFixture();
  await localState.saveDraft({ body: { age: undefined, heightCm: undefined, weightKg: undefined, gender: undefined } });
  assert.deepEqual(JSON.parse(JSON.stringify(await localState.draft())), { body: {} });
  await localState.setFirstRun({ introSeen: true });
  await localState.setFirstRun({ languageChosen: true });
  assert.deepEqual(JSON.parse(JSON.stringify(await localState.firstRun())), { introSeen: true, languageChosen: true, onboardingSaved: false });
  await localState.setFirstRun({ onboardingSaved: true });
  assert.equal((await localState.firstRun()).introSeen, true);
});

test('first-run: missing or corrupt draft is safe without touching unrelated data', async () => {
  const { disk, localState } = storageFixture();
  disk.set('other-app.profile', 'untouched');
  assert.equal(await localState.draft(), null);
  disk.set('gymfreak.onboardingDraft', '{broken');
  assert.equal(await localState.draft(), null);
  await localState.clearDraft();
  assert.equal(disk.get('other-app.profile'), 'untouched');
});

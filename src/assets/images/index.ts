import manifest from '../image-manifest.json';

/**
 * Static Metro requires. Only artwork for screens outside the admin-managed sections is bundled (Profile);
 * every Home / Explore / Workout / onboarding image is served by the backend.
 */
const sources = {
  'profile/cover': require('./profile/cover.jpg'),
} as const;

export type AssetKey = keyof typeof sources;

export function imageAsset(key: AssetKey) {
  const entry = manifest.assets[key];
  return { source: sources[key] as number, expectedPath: `src/assets/images/${entry.file}` };
}

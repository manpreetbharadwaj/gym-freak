export { imageAsset } from './images';
export type { AssetKey } from './images';

/**
 * Bundled photography for screens outside the admin-managed sections (Profile only). Home, Explore, Workout
 * and onboarding images are admin-managed in HealthyMe and arrive through the API; they are never bundled.
 */
export const AppImages = {
  profileCover: 'profile/cover',
} as const;

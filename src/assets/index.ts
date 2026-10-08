import type { AssetKey } from './images';

export { imageAsset } from './images';
export type { AssetKey } from './images';

/**
 * Bundled photography for the signed-in app. Real exercise demos and workout covers come from
 * HealthyMe media (admin uploads); these local photos are only the fallback when an item has none.
 */
export const AppImages = {
  homeWorkout: 'home/todays-workout',
  gymFloor: 'explore/gym-floor',
  homeTraining: 'explore/home-training',
  profileCover: 'profile/cover',
  stories: {
    warmup: 'stories/warmup',
    chest: 'stories/chest',
    back: 'stories/back',
    legs: 'stories/legs',
    core: 'stories/core',
    mobility: 'stories/mobility',
  },
  gradients: { violet: 'backgrounds/violet', coral: 'backgrounds/coral', aqua: 'backgrounds/aqua', sunset: 'backgrounds/sunset' },
} as const satisfies Record<string, AssetKey | Record<string, AssetKey>>;

const byMuscle: Record<string, AssetKey> = {
  chest: 'stories/chest',
  back: 'stories/back',
  shoulders: 'home/todays-workout',
  biceps: 'goals/build-muscle',
  triceps: 'workouts/upper-body',
  arms: 'workouts/arms',
  legs: 'stories/legs',
  glutes: 'workouts/strength',
  core: 'stories/core',
  cardio: 'workouts/hiit',
  mobility: 'stories/mobility',
  'full-body': 'workouts/full-body',
};

/** A realistic photo for a muscle group (fallback when HealthyMe has no media for the item). */
export function muscleImage(muscle?: string): AssetKey {
  return byMuscle[muscle ?? ''] ?? 'workouts/full-body';
}

/** Cover photo for a workout without uploaded media: its goal first, then its main muscle group. */
export function workoutImage(workout: { goal?: string; muscleGroups?: string[] }): AssetKey {
  if (workout.goal === 'lose_fat' || workout.goal === 'endurance') return 'workouts/hiit';
  if (workout.goal === 'mobility') return 'stories/mobility';
  return muscleImage(workout.muscleGroups?.[0]);
}

/** Muscle groups offered in Explore (the API's primary muscles; arms covers biceps + triceps). */
export const exploreMuscles = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core', 'full-body'] as const;

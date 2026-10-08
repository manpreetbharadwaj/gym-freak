import manifest from '../image-manifest.json';

/** Static Metro requires: the composite reference is intentionally NOT bundled. */
const sources = {
  'onboarding/splash-athlete': require('./onboarding/splash-athlete.jpg'),
  'onboarding/training-built-around-you': require('./onboarding/training-built-around-you.jpg'),
  'onboarding/see-every-move-clearly': require('./onboarding/see-every-move-clearly.jpg'),
  'onboarding/weekly-trophy': require('./onboarding/weekly-trophy.png'),
  'goals/build-muscle': require('./goals/build-muscle.jpg'),
  'goals/lose-fat': require('./goals/lose-fat.jpg'),
  'goals/get-stronger': require('./goals/get-stronger.jpg'),
  'goals/stay-fit': require('./goals/stay-fit.jpg'),
  'goals/improve-endurance': require('./goals/improve-endurance.jpg'),
  'goals/improve-mobility': require('./goals/improve-mobility.jpg'),
  'levels/beginner': require('./levels/beginner.jpg'),
  'levels/intermediate': require('./levels/intermediate.jpg'),
  'levels/advanced': require('./levels/advanced.jpg'),
  'locations/gym': require('./locations/gym.jpg'),
  'locations/home': require('./locations/home.jpg'),
  'equipment/dumbbells': require('./equipment/dumbbells.png'),
  'equipment/barbell': require('./equipment/barbell.png'),
  'equipment/bench': require('./equipment/bench.png'),
  'equipment/cable-machine': require('./equipment/cable-machine.png'),
  'equipment/resistance-bands': require('./equipment/resistance-bands.png'),
  'equipment/smith-machine': require('./equipment/smith-machine.png'),
  'equipment/kettlebell': require('./equipment/kettlebell.png'),
  'equipment/pull-up-bar': require('./equipment/pull-up-bar.png'),
  'equipment/machines': require('./equipment/machines.png'),
  'equipment/treadmill': require('./equipment/treadmill.png'),
  'equipment/bike': require('./equipment/bike.png'),
  'equipment/exercise-ball': require('./equipment/exercise-ball.png'),
  'equipment/bodyweight': require('./equipment/bodyweight.jpg'),
  'equipment/full-gym': require('./equipment/full-gym.jpg'),
  'backgrounds/gym-detail': require('./backgrounds/gym-detail.jpg'),
  'home/todays-workout': require('./home/todays-workout.jpg'),
  'stories/warmup': require('./stories/warmup.jpg'),
  'stories/chest': require('./stories/chest.jpg'),
  'stories/back': require('./stories/back.jpg'),
  'stories/legs': require('./stories/legs.jpg'),
  'stories/core': require('./stories/core.jpg'),
  'stories/mobility': require('./stories/mobility.jpg'),
  'workouts/upper-body': require('./workouts/upper-body.jpg'),
  'workouts/hiit': require('./workouts/hiit.jpg'),
  'workouts/full-body': require('./workouts/full-body.jpg'),
  'workouts/strength': require('./workouts/strength.jpg'),
  'workouts/arms': require('./workouts/arms.jpg'),
  'explore/gym-floor': require('./explore/gym-floor.jpg'),
  'explore/home-training': require('./explore/home-training.jpg'),
  'profile/cover': require('./profile/cover.jpg'),
  'backgrounds/violet': require('./backgrounds/violet.jpg'),
  'backgrounds/coral': require('./backgrounds/coral.jpg'),
  'backgrounds/aqua': require('./backgrounds/aqua.jpg'),
  'backgrounds/sunset': require('./backgrounds/sunset.jpg'),
} as const;

export type AssetKey = keyof typeof sources;
// Mark a supplied replacement here to show it instead of the neutral placeholder.
// For reference crops, replacing the file at the registered path needs no code change.
const suppliedReplacements: Partial<Record<AssetKey, boolean>> = {};

export function imageAsset(key: AssetKey) {
  const entry = manifest.assets[key];
  return {
    source: sources[key] as number,
    expectedPath: `src/assets/images/${entry.file}`,
    placeholder: !entry.crop && !suppliedReplacements[key],
    referenceCrop: !!entry.crop && !suppliedReplacements[key],
  };
}

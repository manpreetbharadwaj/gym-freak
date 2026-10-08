import { Achievement, Difficulty, Exercise, ExerciseMode, Story, TrainingPlan, Workout } from '@/types/domain';
import { muscleGroupsOf } from './derive';

/**
 * Development catalog used when EXPO_PUBLIC_GYM_DATA_MODE=mock.
 * Mirrors what an admin would publish in the HealthyMe Gym section; never imported by screens.
 */

type Seed = [slug: string, name: string, muscle: string, secondary: string[], equipment: string[], mode: ExerciseMode, difficulty: Difficulty, steps: string[], tips: string[], mistakes: string[], breathing: string, premium?: boolean];

const seeds: Seed[] = [
  ['barbell-bench-press', 'Barbell Bench Press', 'chest', ['triceps', 'shoulders'], ['barbell', 'bench'], 'strength', 'intermediate',
    ['Lie on the bench with eyes under the bar and feet planted.', 'Grip slightly wider than shoulders and pull the shoulder blades together.', 'Unrack and lower the bar to mid-chest with elbows around 45°.', 'Press back up over the shoulders until the arms are straight.'],
    ['Keep a slight arch and your glutes on the bench.', 'Drive through your feet into the floor.', 'Touch the chest softly; never bounce.'],
    ['Flaring the elbows to 90°.', 'Lifting the hips off the bench.', 'Lowering the bar to the neck.'], 'Inhale and brace as you lower, exhale through the sticking point.'],
  ['incline-dumbbell-press', 'Incline Dumbbell Press', 'chest', ['shoulders', 'triceps'], ['dumbbells', 'bench'], 'strength', 'beginner',
    ['Set the bench to 30° and sit with a dumbbell on each thigh.', 'Kick the weights up and lie back with them over your upper chest.', 'Lower until the dumbbells are level with your chest.', 'Press up and slightly in.'],
    ['Keep wrists stacked over elbows.', 'Control the lowering for two seconds.'], ['Setting the bench too steep.', 'Clashing the dumbbells at the top.'], 'Inhale on the way down, exhale as you press.'],
  ['push-up', 'Push-up', 'chest', ['triceps', 'core'], ['bodyweight'], 'bodyweight_reps', 'beginner',
    ['Start in a high plank with hands under shoulders.', 'Brace your core and squeeze your glutes.', 'Lower as one unit until your chest is a fist from the floor.', 'Push the floor away to return.'],
    ['Think “ribs down, glutes tight”.', 'Elevate your hands to make it easier.'], ['Sagging hips.', 'Half reps.'], 'Inhale down, exhale up.'],
  ['cable-fly', 'Cable Fly', 'chest', ['shoulders'], ['cable-machine'], 'strength', 'intermediate',
    ['Set both pulleys at shoulder height and step forward into a split stance.', 'With a soft bend in the elbows, bring the handles together in front of your chest.', 'Return slowly until you feel a stretch.'],
    ['Lead with your hands, not your elbows.', 'Pause and squeeze when the handles meet.'], ['Turning it into a press.', 'Letting the cables yank you back.'], 'Exhale as the handles meet, inhale on the stretch.', true],
  ['lat-pulldown', 'Lat Pulldown', 'back', ['biceps'], ['machines', 'cable-machine'], 'strength', 'beginner',
    ['Sit with thighs under the pads and grip just outside shoulder width.', 'Pull the bar to your upper chest, driving elbows down.', 'Control the bar back up to a full stretch.'],
    ['Lean back only slightly.', 'Imagine putting your elbows in your back pockets.'], ['Pulling behind the neck.', 'Using momentum.'], 'Exhale as you pull down, inhale on the way up.'],
  ['pull-up', 'Pull-up', 'back', ['biceps', 'core'], ['pull-up-bar'], 'bodyweight_reps', 'advanced',
    ['Hang from the bar with hands just outside shoulder width.', 'Pull your shoulder blades down, then drive elbows to your ribs.', 'Clear the bar with your chin and lower under control.'],
    ['Start every rep from a dead hang.', 'Use a band if you can’t do 5 clean reps.'], ['Kipping or swinging.', 'Stopping short of full extension.'], 'Exhale on the pull, inhale on the lower.'],
  ['bent-over-row', 'Barbell Bent-over Row', 'back', ['biceps', 'glutes'], ['barbell'], 'strength', 'intermediate',
    ['Hinge at the hips with a flat back and the bar below the knees.', 'Row the bar to your lower ribs.', 'Lower until arms are straight.'],
    ['Keep your torso angle fixed.', 'Squeeze the shoulder blades at the top.'], ['Standing up as you row.', 'Rounding the lower back.'], 'Brace before each rep and exhale at the top.'],
  ['seated-cable-row', 'Seated Cable Row', 'back', ['biceps'], ['cable-machine'], 'strength', 'beginner',
    ['Sit tall with a slight knee bend and grab the handle.', 'Row to your belly button while keeping your chest up.', 'Reach forward slowly to a full stretch.'],
    ['Pause for a count at your body.', 'Don’t rock your torso.'], ['Shrugging the shoulders.', 'Leaning far back.'], 'Exhale as you row, inhale as you reach.'],
  ['band-row', 'Resistance Band Row', 'back', ['biceps'], ['bands'], 'strength', 'beginner',
    ['Anchor a band at chest height and step back until it is taut.', 'Row the handles to your ribs.', 'Return slowly.'],
    ['Lead with your elbows.', 'Step further back to add tension.'], ['Letting the band snap back.'], 'Exhale on the pull.'],
  ['overhead-press', 'Overhead Press', 'shoulders', ['triceps', 'core'], ['barbell'], 'strength', 'intermediate',
    ['Hold the bar on your front shoulders with elbows slightly forward.', 'Squeeze glutes and press the bar up past your face.', 'Lock out with the bar over your mid-foot.'],
    ['Move your head back, then through, as the bar passes.', 'Keep your ribs down.'], ['Leaning back excessively.', 'Pressing the bar forward.'], 'Big breath and brace before each rep.'],
  ['dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'shoulders', ['triceps'], ['dumbbells', 'bench'], 'strength', 'beginner',
    ['Sit upright with dumbbells at shoulder height, palms forward.', 'Press overhead until the arms are straight.', 'Lower back to the shoulders.'],
    ['Keep your back against the pad.', 'Stop just short of the dumbbells touching.'], ['Arching the lower back.', 'Dropping the elbows behind the body.'], 'Exhale up, inhale down.'],
  ['lateral-raise', 'Lateral Raise', 'shoulders', [], ['dumbbells'], 'strength', 'beginner',
    ['Stand with light dumbbells at your sides.', 'Raise them out to shoulder height with a soft elbow.', 'Lower slowly.'],
    ['Lead with the elbows, pinkies slightly up.', 'Go lighter than you think.'], ['Shrugging the weight up.', 'Swinging.'], 'Exhale as you raise.'],
  ['dumbbell-curl', 'Dumbbell Curl', 'biceps', [], ['dumbbells'], 'strength', 'beginner',
    ['Stand tall with dumbbells at your sides, palms forward.', 'Curl up without moving your elbows forward.', 'Lower all the way down.'],
    ['Squeeze hard at the top.', 'Control a 3-second lowering.'], ['Swinging the torso.', 'Cutting the bottom range.'], 'Exhale on the curl.'],
  ['hammer-curl', 'Hammer Curl', 'biceps', [], ['dumbbells'], 'strength', 'beginner',
    ['Hold dumbbells with palms facing each other.', 'Curl up keeping the neutral grip.', 'Lower slowly.'],
    ['Keep elbows pinned to your sides.'], ['Using momentum.'], 'Exhale on the curl.'],
  ['triceps-pushdown', 'Triceps Pushdown', 'triceps', [], ['cable-machine'], 'strength', 'beginner',
    ['Grip the bar or rope at chest height with elbows at your sides.', 'Push down until your arms are straight.', 'Return until forearms are just past parallel.'],
    ['Elbows stay glued to your ribs.', 'Spread the rope at the bottom.'], ['Letting the elbows drift forward.', 'Leaning over the bar.'], 'Exhale as you push down.'],
  ['bench-dip', 'Bench Dip', 'triceps', ['chest'], ['bench', 'bodyweight'], 'bodyweight_reps', 'beginner',
    ['Place your hands on a bench behind you, legs out front.', 'Lower until elbows reach 90°.', 'Press back up.'],
    ['Keep your hips close to the bench.', 'Bend your knees to make it easier.'], ['Shrugging into the neck.', 'Going too deep.'], 'Inhale down, exhale up.'],
  ['back-squat', 'Barbell Back Squat', 'legs', ['glutes', 'core'], ['barbell'], 'strength', 'advanced',
    ['Set the bar on your upper back and walk it out.', 'Brace, then sit down and back between your hips.', 'Descend until thighs are at least parallel.', 'Drive up through the whole foot.'],
    ['Knees track over your toes.', 'Keep your chest proud.', 'Use safety pins.'], ['Knees caving in.', 'Heels lifting.', 'Losing the brace at the bottom.'], 'Breathe in and brace at the top, hold through the rep, exhale at lockout.', true],
  ['goblet-squat', 'Goblet Squat', 'legs', ['glutes', 'core'], ['dumbbells'], 'strength', 'beginner',
    ['Hold a dumbbell vertically at your chest.', 'Squat down between your knees, chest up.', 'Stand up by pushing the floor away.'],
    ['Pause for one count at the bottom.', 'Elbows inside the knees.'], ['Rounding the back.', 'Rising onto the toes.'], 'Inhale down, exhale up.'],
  ['leg-press', 'Leg Press', 'legs', ['glutes'], ['machines'], 'strength', 'beginner',
    ['Sit with your back flat and feet hip-width on the platform.', 'Lower the sled until knees reach about 90°.', 'Press back up without locking the knees.'],
    ['Keep your lower back on the pad.', 'Push through your heels.'], ['Locking the knees hard.', 'Going so deep the hips tuck.'], 'Inhale down, exhale on the press.'],
  ['walking-lunge', 'Walking Lunge', 'legs', ['glutes', 'core'], ['dumbbells', 'bodyweight'], 'strength', 'intermediate',
    ['Hold dumbbells at your sides and step forward.', 'Lower until the back knee almost touches the floor.', 'Drive through the front foot into the next step.'],
    ['Take long, controlled steps.', 'Stay tall through the torso.'], ['Front knee caving in.', 'Short, choppy steps.'], 'Exhale as you drive up.'],
  ['romanian-deadlift', 'Romanian Deadlift', 'glutes', ['legs', 'back'], ['barbell', 'dumbbells'], 'strength', 'intermediate',
    ['Stand tall holding the weight in front of your thighs.', 'Push your hips back with a soft knee bend.', 'Lower until you feel a strong hamstring stretch.', 'Drive hips forward to stand.'],
    ['Keep the weight close to your legs.', 'Flat back the whole time.'], ['Squatting the weight down.', 'Rounding the back.'], 'Inhale and brace at the top, exhale as you stand.'],
  ['hip-thrust', 'Barbell Hip Thrust', 'glutes', ['legs'], ['barbell', 'bench'], 'strength', 'intermediate',
    ['Sit with your upper back against a bench and a padded bar over your hips.', 'Drive through your heels to lift your hips.', 'Lock out with ribs down and squeeze, then lower.'],
    ['Chin tucked, eyes forward.', 'Shins vertical at the top.'], ['Arching the lower back.', 'Pushing through the toes.'], 'Exhale at the top squeeze.'],
  ['plank', 'Plank', 'core', ['shoulders'], ['bodyweight'], 'timed', 'beginner',
    ['Set your forearms under your shoulders.', 'Step back into a straight line from head to heels.', 'Hold, squeezing glutes and bracing your abs.'],
    ['Push the floor away with your forearms.'], ['Hips too high or sagging.'], 'Slow, steady breaths through the nose.'],
  ['dead-bug', 'Dead Bug', 'core', [], ['bodyweight'], 'bodyweight_reps', 'beginner',
    ['Lie on your back with arms up and knees at 90°.', 'Press your lower back into the floor.', 'Extend the opposite arm and leg, then switch.'],
    ['Move slowly.', 'Your lower back never leaves the floor.'], ['Rushing.', 'Arching the back.'], 'Exhale fully as the limbs extend.'],
  ['hanging-knee-raise', 'Hanging Knee Raise', 'core', [], ['pull-up-bar'], 'bodyweight_reps', 'intermediate',
    ['Hang from a bar with straight arms.', 'Curl your knees toward your chest.', 'Lower without swinging.'],
    ['Tilt your pelvis up at the top.'], ['Swinging for momentum.'], 'Exhale as the knees rise.'],
  ['mountain-climber', 'Mountain Climber', 'cardio', ['core'], ['bodyweight'], 'timed', 'beginner',
    ['Start in a high plank.', 'Drive one knee toward your chest, then switch quickly.', 'Keep your hips low and steady.'],
    ['Stay on the balls of your feet.'], ['Bouncing the hips.'], 'Short rhythmic breaths with the pace.'],
  ['burpee', 'Burpee', 'cardio', ['full-body'], ['bodyweight'], 'bodyweight_reps', 'intermediate',
    ['Squat down and place your hands on the floor.', 'Jump your feet back into a plank.', 'Jump your feet back in and leap up.'],
    ['Land softly.', 'Step back instead of jumping to make it easier.'], ['Sagging in the plank.'], 'Exhale as you jump.'],
  ['worlds-greatest-stretch', 'World’s Greatest Stretch', 'mobility', ['glutes', 'back'], ['bodyweight'], 'timed', 'beginner',
    ['Step into a deep lunge with the back knee down.', 'Place the inside hand on the floor and rotate the other arm to the ceiling.', 'Hold, then switch sides.'],
    ['Breathe into the rotation.'], ['Forcing the range.'], 'Long exhales to sink deeper.'],
  ['dumbbell-thruster', 'Dumbbell Thruster', 'full-body', ['legs', 'shoulders'], ['dumbbells'], 'strength', 'intermediate',
    ['Hold dumbbells at your shoulders.', 'Squat to parallel.', 'Drive up and use the momentum to press overhead.'],
    ['One smooth motion from squat to press.'], ['Pressing before you stand.'], 'Exhale on the press.'],
];

export const mockExercises: Exercise[] = seeds.map(([slug, name, primaryMuscle, secondaryMuscles, equipment, mode, difficulty, instructions, formTips, commonMistakes, breathing, isPremium = false]) => ({
  id: slug, slug, name, primaryMuscle, secondaryMuscles, equipment, mode, difficulty, instructions, formTips, commonMistakes, breathing, isPremium, locked: false, media: {},
}));

const byId = new Map(mockExercises.map((e) => [e.id, e]));
type Row = [exerciseId: string, sets: number, reps: [number, number] | number, rest: number];

function build(slug: string, name: string, description: string, difficulty: Difficulty, goal: string, minutes: number, rows: Row[], isPremium = false): Workout {
  const exercises = rows.map(([exerciseId, sets, reps, rest], order) => {
    const exercise = byId.get(exerciseId)!;
    const timed = exercise.mode === 'timed';
    return { id: `${slug}-${order}`, exerciseId, order, sets, restSeconds: rest, exercise, ...(timed ? { durationSeconds: reps as number } : Array.isArray(reps) ? { repMin: reps[0], repMax: reps[1] } : { repMin: reps, repMax: reps }) };
  });
  return { id: slug, slug, name, description, difficulty, goal, estimatedMinutes: minutes, isPremium, locked: false, media: {}, exercises, muscleGroups: muscleGroupsOf({ exercises }) };
}

export const mockWorkouts: Workout[] = [
  build('push-day', 'Push Day', 'Chest, shoulders and triceps with a heavy press to start.', 'intermediate', 'build_muscle', 55, [['barbell-bench-press', 4, [8, 10], 90], ['incline-dumbbell-press', 3, [10, 12], 75], ['overhead-press', 3, [8, 10], 90], ['lateral-raise', 3, [12, 15], 45], ['cable-fly', 3, [12, 15], 60], ['triceps-pushdown', 3, [12, 15], 45], ['bench-dip', 2, [10, 15], 60], ['push-up', 2, [10, 15], 45]]),
  build('pull-day', 'Pull Day', 'Back thickness and width, finished with arms.', 'intermediate', 'build_muscle', 50, [['pull-up', 3, [6, 8], 120], ['bent-over-row', 4, [8, 10], 90], ['lat-pulldown', 3, [10, 12], 75], ['seated-cable-row', 3, [10, 12], 60], ['dumbbell-curl', 3, [10, 12], 45], ['hammer-curl', 2, [12, 15], 45]]),
  build('leg-builder', 'Leg Builder', 'Squat, hinge and lunge for complete lower-body strength.', 'intermediate', 'build_muscle', 60, [['goblet-squat', 3, [10, 12], 75], ['romanian-deadlift', 4, [8, 10], 90], ['leg-press', 3, [10, 12], 90], ['walking-lunge', 3, [10, 12], 75], ['hip-thrust', 3, [10, 12], 75], ['plank', 3, 45, 45]]),
  build('upper-body-strength', 'Upper Body Strength', 'Lower reps, longer rest, heavier presses and rows.', 'advanced', 'get_stronger', 60, [['barbell-bench-press', 5, 5, 150], ['bent-over-row', 5, 5, 120], ['overhead-press', 4, [5, 6], 120], ['pull-up', 4, [5, 6], 120]], true),
  build('full-body-burn', 'Full Body Burn', 'A fast circuit that keeps your heart rate high.', 'beginner', 'lose_fat', 30, [['dumbbell-thruster', 3, 12, 30], ['mountain-climber', 3, 40, 20], ['goblet-squat', 3, 15, 30], ['burpee', 3, 10, 30], ['push-up', 3, 12, 30]]),
  build('core-blast', 'Core Blast', 'Fifteen minutes of focused core control.', 'beginner', 'general_fitness', 15, [['dead-bug', 3, [8, 10], 30], ['plank', 3, 40, 30], ['hanging-knee-raise', 3, [8, 12], 45], ['mountain-climber', 2, 30, 30]]),
  build('home-dumbbell-full-body', 'Home Dumbbell Full Body', 'Everything you need with just a pair of dumbbells.', 'beginner', 'general_fitness', 35, [['goblet-squat', 3, [10, 12], 60], ['dumbbell-shoulder-press', 3, [10, 12], 60], ['romanian-deadlift', 3, [10, 12], 60], ['band-row', 3, [12, 15], 45], ['push-up', 3, [8, 12], 45], ['dead-bug', 2, [8, 10], 30]]),
  build('mobility-reset', 'Mobility Reset', 'Open up hips and upper back on rest days.', 'beginner', 'mobility', 15, [['worlds-greatest-stretch', 3, 45, 15], ['dead-bug', 2, [8, 10], 20], ['plank', 2, 30, 20]]),
  build('glute-focus', 'Glute Focus', 'Hip-dominant work for strong, powerful glutes.', 'intermediate', 'build_muscle', 40, [['hip-thrust', 4, [8, 12], 90], ['romanian-deadlift', 3, [10, 12], 75], ['walking-lunge', 3, [10, 12], 60], ['goblet-squat', 3, [12, 15], 60]]),
];

const workoutById = new Map(mockWorkouts.map((w) => [w.id, w]));
const plan = (id: string, name: string, description: string, goal: string, difficulty: Difficulty, workouts: string[]): TrainingPlan => ({ id, name, description, goal, difficulty, daysPerWeek: workouts.length, locked: false, days: workouts.map((w, i) => ({ dayNumber: i + 1, workout: workoutById.get(w)! })) });

export const mockPlans: TrainingPlan[] = [
  plan('muscle-builder-4', 'Muscle Builder', 'A 4-day push / pull / legs / upper split.', 'build_muscle', 'intermediate', ['push-day', 'pull-day', 'leg-builder', 'glute-focus']),
  plan('foundation-3', 'Strong Foundation', 'Three full-body sessions to build the habit.', 'general_fitness', 'beginner', ['home-dumbbell-full-body', 'full-body-burn', 'core-blast']),
  plan('lean-and-strong-5', 'Lean & Strong', 'Five days mixing strength and conditioning.', 'lose_fat', 'intermediate', ['push-day', 'full-body-burn', 'leg-builder', 'pull-day', 'core-blast']),
];

export const mockStories: Omit<Story, 'viewed'>[] = [
  { id: 'story-challenge', title: 'Weekly Challenge: 4 workouts', summary: 'Complete four sessions before Sunday to unlock the Consistency badge.', body: 'Pick any four workouts this week. Short sessions count. Show up four times and the badge is yours.', category: 'weekly-challenge', locked: false, media: {}, cta: { label: 'See my plan', target: 'workout-plan' } },
  { id: 'story-coach', title: 'Coach Tip: own the lowering', summary: 'Slow negatives build more muscle with less weight.', body: 'Take three seconds on the way down for every rep this week. You will feel the difference by Wednesday.', category: 'coach-tips', locked: false, media: {} },
  { id: 'story-new-workout', title: 'New: Glute Focus', summary: 'Four moves, forty minutes, serious results.', body: 'Hip thrusts, Romanian deadlifts and lunges in a session designed for strong, powerful glutes.', category: 'new-workouts', locked: false, media: {}, cta: { label: 'Start workout', target: 'workout:glute-focus' } },
  { id: 'story-nutrition', title: 'Protein made simple', summary: 'Aim for a palm-sized portion with every meal.', body: 'Spread protein across the day. Eggs, yoghurt, lentils, chicken or tofu all count.', category: 'nutrition', locked: false, media: {} },
  { id: 'story-motivation', title: 'Small wins compound', summary: 'Every session you finish is a vote for the person you’re becoming.', body: 'Missed a day? Don’t miss two. That’s the whole secret.', category: 'motivation', locked: false, media: {} },
  { id: 'story-bonus', title: 'Bonus: 15-min Core Blast', summary: 'No equipment, maximum burn.', body: 'Perfect for a busy day or as a finisher after your main session.', category: 'bonus-workout', locked: false, media: {}, cta: { label: 'Start workout', target: 'workout:core-blast' } },
  { id: 'story-exercise', title: 'New exercise: Hip Thrust', summary: 'The most direct way to train your glutes.', body: 'Learn the setup, the lockout and the three most common mistakes.', category: 'new-exercise', locked: false, media: {}, cta: { label: 'View exercise', target: 'exercise:hip-thrust' } },
];

export const mockAchievements: (Achievement & { criteria: 'sessions' | 'sets'; threshold: number })[] = [
  { id: 'first-workout', code: 'first_workout', title: 'First Workout', description: 'Complete your first session.', criteria: 'sessions', threshold: 1 },
  { id: 'three-sessions', code: 'three_sessions', title: 'Getting Started', description: 'Complete 3 workouts.', criteria: 'sessions', threshold: 3 },
  { id: 'ten-workouts', code: 'ten_workouts', title: '10 Workouts', description: 'Complete 10 workouts.', criteria: 'sessions', threshold: 10 },
  { id: 'fifty-workouts', code: 'fifty_workouts', title: '50 Workouts', description: 'Complete 50 workouts.', criteria: 'sessions', threshold: 50 },
  { id: 'hundred-sets', code: 'hundred_sets', title: 'Century', description: 'Complete 100 sets.', criteria: 'sets', threshold: 100 },
  { id: 'five-hundred-sets', code: 'five_hundred_sets', title: 'Consistency Champion', description: 'Complete 500 sets.', criteria: 'sets', threshold: 500 },
];

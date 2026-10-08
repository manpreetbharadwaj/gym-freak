import { Access, Difficulty, GymProfile, PlanDay, Progress, SessionSummary, TrainingPlan, WeekPlan, Workout, WorkoutSession } from '@/types/domain';
import { addDays, dayKey, startOfWeek, weekdayIndex, weeklySchedule } from '@/utils/dates';

/**
 * Offline-mode only. With a backend (EXPO_PUBLIC_GYM_DATA_MODE=api) plan assignment, the week,
 * recommendations, progress aggregation and access are all computed by HealthyMe; these helpers
 * only let the mock repository produce the same shapes without a server.
 */

export const MOCK_TRIAL_DAYS = 7;

export function accessStatus(access: { trialEndsAt?: string | null; premiumUntil?: string | null; trialStartedAt?: string | null }): Access {
  const now = Date.now();
  const premiumActive = !!access.premiumUntil && Date.parse(access.premiumUntil) > now;
  const trialActive = !!access.trialEndsAt && Date.parse(access.trialEndsAt) > now;
  const status = premiumActive ? 'premium' : trialActive ? 'trial' : access.trialStartedAt || access.premiumUntil ? 'expired' : 'free';
  return {
    status, premium: premiumActive || trialActive, trialEligible: !access.trialStartedAt, trialDays: MOCK_TRIAL_DAYS, trialStartedAt: access.trialStartedAt ?? undefined, trialEndsAt: access.trialEndsAt ?? undefined, premiumUntil: access.premiumUntil ?? undefined,
    paywallEnabled: true, premiumVisible: true, billingEnabled: false,
  };
}

export function muscleGroupsOf(workout: Pick<Workout, 'exercises'>): string[] {
  const counts = new Map<string, number>();
  for (const item of workout.exercises) counts.set(item.exercise.primaryMuscle, (counts.get(item.exercise.primaryMuscle) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([muscle]) => muscle).slice(0, 3);
}

const rank: Record<Difficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 };

/** Interim plan assignment: best catalog match for the profile until `/me/gym/training-plan` exists. */
export function pickPlan(plans: TrainingPlan[], profile: GymProfile, goalKey: (goal?: string) => string | undefined): TrainingPlan | undefined {
  const goal = goalKey(profile.goal);
  const level = profile.experience ? rank[profile.experience] : 0;
  const score = (plan: TrainingPlan) =>
    (plan.locked ? -100 : 0) + (plan.goal === goal ? 30 : 0) - Math.abs(rank[plan.difficulty] - level) * 10 - Math.abs(plan.daysPerWeek - profile.daysPerWeek) * 4;
  return [...plans].filter((plan) => plan.days.length).sort((a, b) => score(b) - score(a))[0];
}

export function buildWeekPlan(plan: TrainingPlan | undefined, completed: WorkoutSession[], now = new Date(), startedOn?: string): WeekPlan {
  const monday = startOfWeek(now);
  const todayKey = dayKey(now);
  const doneByDay = new Set(completed.filter((s) => s.completedAt).map((s) => dayKey(new Date(s.completedAt!))));
  const ordered = plan ? [...plan.days].sort((a, b) => a.dayNumber - b.dayNumber) : [];
  const slots = weeklySchedule[Math.min(7, Math.max(1, ordered.length))] ?? [];
  const days: PlanDay[] = Array.from({ length: 7 }, (_, weekday) => {
    const date = addDays(monday, weekday);
    const key = dayKey(date);
    const slot = slots.indexOf(weekday);
    const assigned = slot >= 0 ? ordered[slot] : undefined;
    const isPast = key < todayKey;
    const status: PlanDay['status'] = doneByDay.has(key) ? 'completed' : !assigned ? 'rest' : key === todayKey ? 'today' : isPast ? (startedOn && key < startedOn ? 'not_started' : 'missed') : 'upcoming';
    return { weekday, date: key, status, workout: assigned?.workout, dayNumber: assigned?.dayNumber };
  });
  const todayIndex = weekdayIndex(now);
  const today = days[todayIndex].workout ? days[todayIndex] : days.slice(todayIndex).find((day) => day.workout && day.status !== 'completed');
  return { plan, days, today };
}

/** Interim recommendation logic: goal match first, then closest difficulty, unlocked before locked. */
export function recommend(workouts: Workout[], profile: GymProfile, goalKey: (goal?: string) => string | undefined, exclude?: string): Workout[] {
  const goal = goalKey(profile.goal);
  const level = profile.experience ? rank[profile.experience] : 0;
  return workouts
    .filter((workout) => workout.id !== exclude)
    .map((workout) => ({ workout, score: (workout.goal === goal ? 20 : 0) - Math.abs(rank[workout.difficulty] - level) * 6 - (workout.locked ? 8 : 0) - Math.abs(workout.estimatedMinutes - profile.availableMinutes) / 10 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.workout);
}

function streakOf(days: Set<string>, now: Date): number {
  let cursor = days.has(dayKey(now)) ? now : addDays(now, -1);
  let streak = 0;
  while (days.has(dayKey(cursor))) { streak += 1; cursor = addDays(cursor, -1); }
  return streak;
}

export function buildProgress(
  totals: Pick<Progress, 'totalSessions' | 'totalMinutes' | 'completedSets' | 'totalVolumeKg' | 'week' | 'achievements'>,
  sessions: WorkoutSession[],
  muscleOf: (exerciseId?: string) => string | undefined,
  now = new Date(),
): Progress {
  const completed = sessions.filter((s) => s.status === 'completed' && s.completedAt);
  const days = new Set(completed.map((s) => dayKey(new Date(s.completedAt!))));
  const monday = startOfWeek(now);
  const todayKey = dayKey(now);
  const weekDays = Array.from({ length: 7 }, (_, i) => { const key = dayKey(addDays(monday, i)); return { date: key, done: days.has(key), isToday: key === todayKey }; });
  const counts = new Map<string, number>();
  for (const s of completed) { const key = dayKey(new Date(s.completedAt!)); counts.set(key, (counts.get(key) ?? 0) + 1); }
  const firstMonday = addDays(monday, -28);
  const monthDays = Array.from({ length: 35 }, (_, i) => { const key = dayKey(addDays(firstMonday, i)); return { date: key, count: counts.get(key) ?? 0, isToday: key === todayKey, inFuture: key > todayKey }; });
  const muscles = new Map<string, number>();
  for (const s of completed) for (const exercise of s.exercises) {
    const muscle = muscleOf(exercise.exerciseId);
    const done = exercise.sets.filter((set) => set.completed).length;
    if (muscle && done) muscles.set(muscle, (muscles.get(muscle) ?? 0) + done);
  }
  const history: SessionSummary[] = completed.slice(0, 20).map((s) => ({
    id: s.id,
    name: s.name,
    completedAt: s.completedAt!,
    minutes: Math.max(1, Math.round(s.activeDurationMs / 60000)),
    sets: s.exercises.reduce((total, e) => total + e.sets.filter((set) => set.completed).length, 0),
    exercises: s.exercises.filter((e) => e.sets.some((set) => set.completed)).length,
  }));
  let longest = 0;
  let run = 0;
  for (const key of [...days].sort()) { const prev = dayKey(addDays(new Date(`${key}T12:00:00`), -1)); run = days.has(prev) ? run + 1 : 1; longest = Math.max(longest, run); }
  const frequency = new Map<string, { exerciseId: string; name: string; sessions: number; sets: number }>();
  for (const s of completed) for (const e of s.exercises) {
    const done = e.sets.filter((set) => set.completed).length;
    if (!e.exerciseId || !done) continue;
    const row = frequency.get(e.exerciseId) ?? { exerciseId: e.exerciseId, name: e.name, sessions: 0, sets: 0 };
    row.sessions += 1; row.sets += done; frequency.set(e.exerciseId, row);
  }
  return {
    ...totals,
    streak: streakOf(days, now),
    longestStreak: longest,
    exerciseFrequency: [...frequency.values()].sort((a, b) => b.sessions - a.sessions).slice(0, 10),
    personalRecords: [],
    weekDays,
    monthDays,
    muscleDistribution: [...muscles.entries()].map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets),
    history,
  };
}

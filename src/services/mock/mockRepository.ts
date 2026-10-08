import * as Crypto from 'expo-crypto';
import { defaultNotificationPreferences, localState } from '@/services/storage/localState';
import { safeStorage } from '@/services/storage/safeStorage';
import { accessStatus, buildProgress, buildWeekPlan, MOCK_TRIAL_DAYS, pickPlan, recommend } from './derive';
import { ActiveSessionConflict, AuthRepository, GymRepository, Repositories, SignInInput, SignUpInput } from '@/services/repositories/types';
import { Account, DurationRange, ExerciseQuery, GymProfile, NotificationPreferences, OnboardingAnswers, Preferences, SetUpdate, Workout, WorkoutSession } from '@/types/domain';
import { addDays } from '@/utils/dates';
import { mockAchievements, mockExercises, mockPlans, mockStories, mockWorkouts } from './catalog';

/**
 * Offline stand-in for HealthyMe, used only without EXPO_PUBLIC_GYM_DATA_MODE=api (demos, UI work).
 * Same rules as the app where they affect the UI: 8-character passwords, one active session,
 * an explicit one-time trial, session-only replace/add. Nothing here is used in API mode.
 */

const wait = (ms = 180) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const goalKey = (goal?: string) => ({ 'build-muscle': 'build_muscle', 'lose-fat': 'lose_fat', 'get-stronger': 'get_stronger', 'stay-fit': 'general_fitness', 'improve-endurance': 'endurance', 'improve-mobility': 'mobility' } as Record<string, string>)[goal ?? ''];
const minutesFor: Record<DurationRange, number> = { '20-30': 30, '30-45': 45, '45-60': 60, '60-90': 90 };

interface MockState { account: Account | null; profile: GymProfile; sessions: WorkoutSession[]; favorites: string[]; trialEndsAt?: string; trialStartedAt?: string; planStartedOn?: string; viewedStories?: string[]; notifications?: NotificationPreferences; prefs: Pick<Preferences, 'language' | 'units' | 'notificationsEnabled' | 'restTimerEnabled' | 'defaultRestSeconds'> }

const initialState = (): MockState => ({
  account: null,
  profile: { goal: 'build-muscle', experience: 'intermediate', location: 'gym', daysPerWeek: 4, availableMinutes: 60, equipment: ['full-gym'] },
  sessions: [],
  favorites: [],
  prefs: { language: 'en', units: 'auto', notificationsEnabled: false, restTimerEnabled: true, defaultRestSeconds: 90 },
});

class Store {
  private state: MockState | null = null;
  async get() { return (this.state ??= await safeStorage.get<MockState>('mockBackend', initialState())); }
  async update(change: (state: MockState) => void) { const state = await this.get(); change(state); await safeStorage.set('mockBackend', state); return state; }
}

/** A few past sessions so Progress has something real to show on a fresh mock install. */
function seedHistory(now = new Date()): WorkoutSession[] {
  return [['push-day', -1], ['leg-builder', -3], ['pull-day', -4], ['push-day', -6], ['full-body-burn', -8], ['leg-builder', -11]].map(([id, offset]) => {
    const workout = mockWorkouts.find((w) => w.id === id)!;
    const done = addDays(now, offset as number);
    done.setHours(18, 30, 0, 0);
    return sessionFrom(workout, done.toISOString(), true);
  });
}

function sessionFrom(workout: Workout, startedAt: string, completed = false): WorkoutSession {
  const durationMs = workout.estimatedMinutes * 60000;
  return {
    id: Crypto.randomUUID(), workoutId: workout.id, name: workout.name, status: completed ? 'completed' : 'active', startedAt, completedAt: completed ? new Date(Date.parse(startedAt) + durationMs).toISOString() : undefined, activeDurationMs: completed ? durationMs : 0,
    exercises: workout.exercises.map((item) => ({
      id: Crypto.randomUUID(), exerciseId: item.exerciseId, name: item.exercise.name, order: item.order,
      prescription: { sets: item.sets, repMin: item.repMin, repMax: item.repMax, durationSeconds: item.durationSeconds, restSeconds: item.restSeconds, mode: item.exercise.mode },
      sets: Array.from({ length: item.sets }, (_, i) => ({ id: Crypto.randomUUID(), setNumber: i + 1, completed, reps: completed ? item.repMax : undefined, durationSeconds: item.durationSeconds })),
    })),
  };
}

class MockAuthRepository implements AuthRepository {
  constructor(private store: Store) {}
  async restore() { return (await this.store.get()).account; }
  async signIn(input: SignInInput) {
    await wait();
    if (input.password.length < 8) throw new Error('Invalid email or password');
    const state = await this.store.update((s) => { s.account ??= { id: 'mock-user', email: input.email, firstName: input.email.split('@')[0].replace(/^./, (c) => c.toUpperCase()), lastName: '', emailVerified: true }; if (!s.sessions.length) s.sessions = seedHistory(); });
    return state.account!;
  }
  async signUp(input: SignUpInput) {
    await wait();
    const now = new Date();
    const state = await this.store.update((s) => {
      s.account = { id: `mock-${Date.now()}`, email: input.email, firstName: input.firstName, lastName: input.lastName ?? '', emailVerified: false };
      s.planStartedOn = now.toISOString().slice(0, 10);
      s.sessions = seedHistory();
    });
    return state.account!;
  }
  async signOut() { await this.store.update((s) => { s.account = null; }); }
  async requestPasswordReset() { await wait(); }
  async resetPassword(_token: string, password: string) { await wait(); if (password.length < 8) throw new Error('Password too short'); }
  async verifyEmail() { await wait(); await this.store.update((s) => { if (s.account) s.account.emailVerified = true; }); }
  async me() { const account = (await this.store.get()).account; if (!account) throw new Error('Signed out'); return account; }
}

class MockGymRepository implements GymRepository {
  constructor(private store: Store) {}
  async getAccess() { const s = await this.store.get(); return accessStatus({ trialStartedAt: s.trialStartedAt, trialEndsAt: s.trialEndsAt }); }
  async startTrial() {
    const before = await this.getAccess();
    if (!before.trialEligible && before.status !== 'trial') throw new Error('The free trial has already been used');
    const now = new Date();
    await this.store.update((s) => { s.trialStartedAt ??= now.toISOString(); s.trialEndsAt ??= addDays(now, MOCK_TRIAL_DAYS).toISOString(); });
    return this.getAccess();
  }
  async getProfile() { return (await this.store.get()).profile; }
  async saveOnboarding(a: OnboardingAnswers) {
    await wait(400);
    await this.store.update((s) => { s.profile = { goal: a.goal, experience: a.experience, location: a.location, daysPerWeek: a.daysPerWeek, availableMinutes: minutesFor[a.duration], equipment: a.equipment, bodyWeightKg: a.body.weightKg, weightKg: a.body.weightKg, heightCm: a.body.heightCm }; });
  }
  async updateProfile(patch: Partial<OnboardingAnswers>) {
    const s = await this.store.update((state) => { Object.assign(state.profile, { goal: patch.goal ?? state.profile.goal, experience: patch.experience ?? state.profile.experience, location: patch.location ?? state.profile.location, daysPerWeek: patch.daysPerWeek ?? state.profile.daysPerWeek, availableMinutes: patch.duration ? minutesFor[patch.duration] : state.profile.availableMinutes, equipment: patch.equipment ?? state.profile.equipment }); });
    return s.profile;
  }
  async updateBodyMetrics(patch: { heightCm?: number; weightKg?: number }) {
    const s = await this.store.update((state) => { Object.assign(state.profile, { heightCm: patch.heightCm ?? state.profile.heightCm, weightKg: patch.weightKg ?? state.profile.weightKg }); });
    return s.profile;
  }
  async getWeekPlan() { const s = await this.store.get(); await wait(120); return { ...buildWeekPlan(pickPlan(mockPlans, s.profile, goalKey), s.sessions.filter((x) => x.status === 'completed'), new Date(), s.planStartedOn), assignment: { source: 'AUTO' as const, startDate: s.planStartedOn ?? new Date().toISOString().slice(0, 10) } }; }
  async listWorkouts() { await wait(120); return mockWorkouts; }
  async getWorkout(id: string) { await wait(100); const w = mockWorkouts.find((x) => x.id === id); if (!w) throw new Error('Workout not found'); return w; }
  async getHome() {
    const [s, week, stories, progress] = await Promise.all([this.store.get(), this.getWeekPlan(), this.listStories(), this.getProgress()]);
    const active = s.sessions.find((x) => x.status === 'active');
    return { greetingName: s.account?.firstName ?? '', today: week.today, planName: week.plan?.name, stories, recommendations: recommend(mockWorkouts, s.profile, goalKey as (g?: string) => string | undefined, week.today?.workout?.id), progress: { weekDays: progress.weekDays, week: progress.week, streak: progress.streak }, activeSession: active ? { id: active.id, workoutId: active.workoutId, name: active.name, startedAt: active.startedAt } : undefined };
  }
  async listExercises(q: ExerciseQuery) {
    await wait(150);
    const search = q.search?.trim().toLowerCase();
    const filtered = mockExercises.filter((e) => (!search || `${e.name} ${e.primaryMuscle} ${e.equipment.join(' ')}`.toLowerCase().includes(search)) && (!q.muscle || e.primaryMuscle === q.muscle) && (!q.equipment || e.equipment.includes(q.equipment)) && (!q.difficulty || e.difficulty === q.difficulty));
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    return { items: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit, hasMore: page * limit < filtered.length };
  }
  async getExercise(id: string) {
    await wait(100);
    const exercise = mockExercises.find((e) => e.id === id);
    if (!exercise) throw new Error('Exercise not found');
    return { exercise, workouts: mockWorkouts.filter((w) => w.exercises.some((x) => x.exerciseId === id)).map((w) => ({ id: w.id, name: w.name })) };
  }
  async listStories() { const viewed = new Set((await this.store.get()).viewedStories ?? []); return mockStories.map((story) => ({ ...story, viewed: viewed.has(story.id) })); }
  async markStoryViewed(id: string) { await this.store.update((s) => { s.viewedStories = [...new Set([...(s.viewedStories ?? []), id])]; }); }
  async listFavorites() { return (await this.store.get()).favorites.map((key) => { const [type, id] = key.split(':'); return { type: type as 'exercise', id }; }); }
  async setFavorite(type: 'exercise' | 'workout' | 'story', id: string, favorite: boolean) { await this.store.update((s) => { const key = `${type}:${id}`; s.favorites = favorite ? [...new Set([...s.favorites, key])] : s.favorites.filter((f) => f !== key); }); }

  async getActiveSession() { return (await this.store.get()).sessions.find((x) => x.status === 'active'); }
  async startSession(workoutId: string, options: { discardActive?: boolean } = {}) {
    const workout = await this.getWorkout(workoutId);
    const existing = await this.getActiveSession();
    if (existing && existing.workoutId !== workoutId && !options.discardActive) throw new ActiveSessionConflict(existing);
    const state = await this.store.update((s) => {
      const active = s.sessions.find((x) => x.status === 'active');
      if (active && active.workoutId !== workoutId) active.status = 'cancelled';
      if (!active || active.workoutId !== workoutId) s.sessions.unshift(sessionFrom(workout, new Date().toISOString()));
    });
    return state.sessions.find((x) => x.status === 'active')!;
  }
  async replaceSessionExercise(sessionId: string, sessionExerciseId: string, exerciseId: string) {
    const { exercise } = await this.getExercise(exerciseId);
    const state = await this.store.update((s) => {
      const session = s.sessions.find((x) => x.id === sessionId && x.status === 'active');
      const index = session?.exercises.findIndex((e) => e.id === sessionExerciseId) ?? -1;
      if (!session || index < 0) throw new Error('Exercise not found in this workout');
      const row = session.exercises[index];
      const open = row.sets.filter((x) => !x.completed);
      if (!open.length) throw new Error('This exercise is already finished');
      const fresh = { ...row, id: Crypto.randomUUID(), exerciseId, name: exercise.name, origin: 'replacement' as const, prescription: { ...row.prescription, mode: exercise.mode }, sets: open.map((x, i) => ({ id: Crypto.randomUUID(), setNumber: i + 1, completed: false })) };
      // Done sets stay with the original exercise; the remaining ones move to the replacement.
      if (open.length === row.sets.length) session.exercises[index] = fresh;
      else { row.sets = row.sets.filter((x) => x.completed); session.exercises.splice(index + 1, 0, fresh); }
      session.exercises.forEach((e, i) => { e.order = i; });
    });
    return state.sessions.find((x) => x.id === sessionId)!;
  }
  async addSessionExercise(sessionId: string, exerciseId: string) {
    const { exercise } = await this.getExercise(exerciseId);
    const state = await this.store.update((s) => {
      const session = s.sessions.find((x) => x.id === sessionId && x.status === 'active');
      if (!session) throw new Error('Only an active workout can be changed');
      const sets = 3;
      session.exercises.push({ id: Crypto.randomUUID(), exerciseId, name: exercise.name, order: session.exercises.length, origin: 'added', prescription: { sets, repMin: exercise.mode === 'timed' ? undefined : 8, repMax: exercise.mode === 'timed' ? undefined : 12, durationSeconds: exercise.mode === 'timed' ? 30 : undefined, restSeconds: 60, mode: exercise.mode }, sets: Array.from({ length: sets }, (_, i) => ({ id: Crypto.randomUUID(), setNumber: i + 1, completed: false })) });
    });
    return state.sessions.find((x) => x.id === sessionId)!;
  }
  async updateSets(sessionId: string, sets: SetUpdate[], activeDurationMs: number) {
    const state = await this.store.update((s) => {
      const session = s.sessions.find((x) => x.id === sessionId);
      if (!session || session.status !== 'active') throw new Error('Only an active workout can be updated');
      session.activeDurationMs = activeDurationMs;
      for (const update of sets) for (const exercise of session.exercises) { const set = exercise.sets.find((x) => x.id === update.setId); if (set) Object.assign(set, { completed: update.completed, reps: update.reps ?? set.reps, weightKg: update.weightKg ?? set.weightKg, durationSeconds: update.durationSeconds ?? set.durationSeconds }); }
    });
    return state.sessions.find((x) => x.id === sessionId)!;
  }
  async completeSession(sessionId: string, activeDurationMs: number) {
    const state = await this.store.update((s) => { const session = s.sessions.find((x) => x.id === sessionId); if (session && session.status === 'active') Object.assign(session, { status: 'completed', completedAt: new Date().toISOString(), activeDurationMs }); });
    return state.sessions.find((x) => x.id === sessionId)!;
  }
  async cancelSession(sessionId: string) { await this.store.update((s) => { const session = s.sessions.find((x) => x.id === sessionId); if (session?.status === 'active') session.status = 'cancelled'; }); }

  async getProgress() {
    await wait(150);
    const s = await this.store.get();
    const completed = s.sessions.filter((x) => x.status === 'completed');
    const sets = completed.reduce((t, x) => t + x.exercises.reduce((u, e) => u + e.sets.filter((set) => set.completed).length, 0), 0);
    const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); monday.setHours(0, 0, 0, 0);
    const week = completed.filter((x) => x.completedAt && Date.parse(x.completedAt) >= monday.getTime());
    const muscles = new Map(mockExercises.map((e) => [e.id, e.primaryMuscle]));
    return buildProgress({
      totalSessions: completed.length, totalMinutes: Math.round(completed.reduce((t, x) => t + x.activeDurationMs, 0) / 60000), completedSets: sets, totalVolumeKg: 0,
      week: { sessions: week.length, minutes: Math.round(week.reduce((t, x) => t + x.activeDurationMs, 0) / 60000) },
      achievements: mockAchievements.map(({ criteria, threshold, ...a }) => ({ ...a, unlockedAt: (criteria === 'sessions' ? completed.length : sets) >= threshold ? completed[completed.length - 1]?.completedAt : undefined })),
    }, s.sessions, (id) => (id ? muscles.get(id) : undefined));
  }

  async getPreferences(): Promise<Preferences> { const [s, local] = await Promise.all([this.store.get(), localState.preferences()]); return { ...s.prefs, audioCues: local.audioCues, notifications: { ...defaultNotificationPreferences, ...s.notifications } }; }
  async updatePreferences(patch: Partial<Preferences>) {
    const { audioCues, notifications, ...remote } = patch;
    await this.store.update((s) => { s.prefs = { ...s.prefs, ...Object.fromEntries(Object.entries(remote).filter(([, v]) => v !== undefined)) }; if (notifications) s.notifications = { ...defaultNotificationPreferences, ...s.notifications, ...notifications }; });
    if (audioCues !== undefined) await localState.savePreferences({ audioCues });
    return this.getPreferences();
  }
  // No server in mock mode: reminders stay local.
  async registerDevice() { return { serverPush: false }; }
  /* Referrals, coupons and checkout exist only on the server: offline mode refuses rather than inventing discounts. */
  async getReferral(): Promise<never> { throw new Error('Referrals need the HealthyMe server'); }
  /* Activity history and health sync live on the server: offline mode refuses rather than inventing sessions or steps. */
  async listActivities(): Promise<never> { throw new Error('Activity history needs the HealthyMe server'); }
  async getActivity(): Promise<never> { throw new Error('Activity history needs the HealthyMe server'); }
  async saveActivity(): Promise<never> { throw new Error('Saving activities needs the HealthyMe server'); }
  async deleteActivity(): Promise<never> { throw new Error('Activity history needs the HealthyMe server'); }
  async addActivityHealthRef(): Promise<never> { throw new Error('Health sync needs the HealthyMe server'); }
  async getHealthConnections(): Promise<never> { throw new Error('Health sync needs the HealthyMe server'); }
  async setHealthConnection(): Promise<never> { throw new Error('Health sync needs the HealthyMe server'); }
  async syncHealth(): Promise<never> { throw new Error('Health sync needs the HealthyMe server'); }
  async claimReferral(): Promise<never> { throw new Error('Referrals need the HealthyMe server'); }
  async validateReferralCode() { return false; }
  async listQuickStart(): Promise<never> { throw new Error('Quick Start needs the HealthyMe server'); } // Home falls back to the bundled tiles
  async listPlans() { return []; }
  async quote(): Promise<never> { throw new Error('Checkout needs the HealthyMe server'); }
  async checkout(): Promise<never> { throw new Error('Checkout needs the HealthyMe server'); }
  async verifyPurchase(): Promise<never> { throw new Error('Purchases need the HealthyMe server'); }
  async trackShare() { /* nothing to record offline */ }
  async unregisterDevice() { /* nothing registered */ }
}

export function createMockRepositories(): Repositories {
  const store = new Store();
  return { mode: 'mock', auth: new MockAuthRepository(store), gym: new MockGymRepository(store) };
}

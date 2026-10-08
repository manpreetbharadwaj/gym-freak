import { AxiosInstance } from 'axios';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { accessFrom } from '@/api/access';
import { ApiError, createApiClient, publicRequest, resolveMediaUrl } from '@/api/client';
import { ApiAccess, ApiAccount, ApiAchievement, ApiExercise, ApiGymPreferences, ApiGymProfile, ApiMedia, ApiNotificationPreferences, ApiPage, ApiPlanDay, ApiProgress, ApiRecommendations, ApiSession, ApiStory, ApiUserPreferences, ApiWeekPlan, ApiWorkout, ApiWorkoutSession } from '@/api/contracts';
import { tokenStorage } from '@/services/auth/tokenStorage';
import { localState } from '@/services/storage/localState';
import { QuickStartTile, Access, Account, Achievement, Activity, ActivityDetail, ActivityType, HealthConnection, HealthConnectionStatus, HealthDaily, HealthProvider, HealthSyncResult, ImportedWorkout, NewActivity, BillingPlan, CheckoutResult, ExerciseAccess, Quote, ReferralSource, ReferralStatus, ReferralSummary, ShareEventType, DeviceRegistration, DurationRange, Exercise, Goal, GymProfile, Media, NotificationPreferences, OnboardingAnswers, PlanDay, Preferences, Progress, Story, Workout, WorkoutSession } from '@/types/domain';
import { ActiveSessionConflict, AuthRepository, GymRepository, Repositories, SignInInput, SignUpInput } from './types';

/* ───────────── Vocabulary mapping (app ↔ HealthyMe) ───────────── */

const goalToApi: Record<Goal, string> = { 'build-muscle': 'build_muscle', 'lose-fat': 'lose_fat', 'get-stronger': 'get_stronger', 'stay-fit': 'general_fitness', 'improve-endurance': 'endurance', 'improve-mobility': 'mobility' };
const goalFromApi = Object.fromEntries(Object.entries(goalToApi).map(([k, v]) => [v, k])) as Record<string, Goal>;
const minutesFor: Record<DurationRange, number> = { '20-30': 30, '30-45': 45, '45-60': 60, '60-90': 90 };
const genderToApi = { woman: 'female', man: 'male', 'non-binary': 'diverse' } as const;
export const apiGoal = (goal?: string) => (goal ? goalToApi[goal as Goal] ?? goal : undefined);

const num = (value: string | number | null | undefined) => (value === null || value === undefined ? undefined : Number(value));

function account(user: ApiAccount): Account { return { ...user }; }

function achievement(a: ApiAchievement): Achievement {
  return { id: a.id, code: a.code, title: a.title, description: a.description, icon: a.icon ?? undefined, category: a.category, unlockedAt: a.unlockedAt ?? undefined };
}

function muscleGroupsOf(exercises: { exercise: { primaryMuscle: string } }[]): string[] {
  const counts = new Map<string, number>();
  for (const item of exercises) counts.set(item.exercise.primaryMuscle, (counts.get(item.exercise.primaryMuscle) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([muscle]) => muscle).slice(0, 3);
}

function exercise(item: ApiExercise, media: (m?: ApiMedia | null) => Media): Exercise {
  return {
    id: item.id, slug: item.slug, name: item.name, primaryMuscle: item.primaryMuscle, secondaryMuscles: item.secondaryMuscles, equipment: item.equipment, mode: item.mode, difficulty: item.difficulty,
    instructions: item.instructions, formTips: item.formTips ?? item.safetyNotes, commonMistakes: item.commonMistakes ?? [], breathing: item.breathing ?? undefined,
    isPremium: item.isPremium, locked: item.access.isLocked, media: media(item.media),
  };
}

function workout(item: ApiWorkout, media: (m?: ApiMedia | null) => Media): Workout {
  const exercises = [...item.exercises].sort((a, b) => a.displayOrder - b.displayOrder).map((row) => ({
    id: row.id, exerciseId: row.exerciseId, order: row.displayOrder, sets: row.prescribedSets, repMin: row.repMin ?? undefined, repMax: row.repMax ?? undefined,
    durationSeconds: row.durationSeconds ?? undefined, restSeconds: row.restSeconds, notes: row.notes ?? undefined, exercise: exercise(row.exercise, media),
  }));
  const base = { id: item.id, slug: item.slug, name: item.name, description: item.description ?? undefined, difficulty: item.difficulty, goal: item.goal, estimatedMinutes: item.estimatedMinutes, isPremium: item.isPremium, locked: item.access.isLocked, media: media(item.media), exercises };
  return { ...base, muscleGroups: muscleGroupsOf(base.exercises) };
}


function session(item: ApiWorkoutSession): WorkoutSession {
  return {
    id: item.id, workoutId: item.workoutId ?? undefined, name: item.nameSnapshot, status: item.status.toLowerCase() as WorkoutSession['status'], startedAt: item.startedAt, completedAt: item.completedAt ?? undefined, activeDurationMs: Number(item.activeDurationMs),
    exercises: [...item.exercises].sort((a, b) => a.displayOrder - b.displayOrder).map((row) => ({
      id: row.id, exerciseId: row.exerciseId ?? undefined, name: row.nameSnapshot, order: row.displayOrder, origin: row.origin,
      prescription: { sets: row.prescriptionSnapshot.prescribedSets, repMin: row.prescriptionSnapshot.repMin ?? undefined, repMax: row.prescriptionSnapshot.repMax ?? undefined, durationSeconds: row.prescriptionSnapshot.durationSeconds ?? undefined, restSeconds: row.prescriptionSnapshot.restSeconds, mode: row.prescriptionSnapshot.mode },
      sets: [...row.sets].sort((a, b) => a.setNumber - b.setNumber).map((set) => ({ id: set.id, setNumber: set.setNumber, reps: set.reps ?? undefined, weightKg: num(set.weightKg), durationSeconds: set.durationSeconds ?? undefined, completed: set.completed })),
    })),
    newAchievements: item.newAchievements?.map(achievement),
  };
}

function profile(item: ApiGymProfile): GymProfile {
  return { goal: goalFromApi[item.primaryGoal], experience: item.experienceLevel as GymProfile['experience'], location: item.trainingLocation as GymProfile['location'], daysPerWeek: item.daysPerWeek, availableMinutes: item.availableMinutes, equipment: item.availableEquipment, bodyWeightKg: num(item.bodyWeightKg), age: item.currentAge ?? item.ageYears ?? undefined };
}

/* ───────────── Auth ───────────── */

class ApiAuthRepository implements AuthRepository {
  constructor(private http: AxiosInstance) {}
  private async device() {
    return { installationId: await localState.installationId(), platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web', appVersion: '0.1.0' };
  }
  async restore() {
    if (!(await tokenStorage.getTokens())) return null;
    try { return await this.me(); } catch (error) { if (error instanceof ApiError && error.kind === 'network') throw error; return null; }
  }
  async signIn(input: SignInInput) {
    const { data } = await this.http.post<ApiSession>('/auth/login', { ...input, device: await this.device() }, publicRequest);
    await tokenStorage.saveTokens(data.tokens);
    return account(data.user);
  }
  async signUp(input: SignUpInput) {
    const { data } = await this.http.post<ApiSession>('/auth/register', { email: input.email, password: input.password, firstName: input.firstName, lastName: input.lastName || '-', device: await this.device() }, publicRequest);
    await tokenStorage.saveTokens(data.tokens);
    return account(data.user);
  }
  async signOut() {
    await this.http.post('/auth/logout', { allDevices: false }).catch(() => undefined);
    await tokenStorage.clearTokens();
  }
  async requestPasswordReset(email: string) { await this.http.post('/auth/forgot-password', { email }, publicRequest); }
  async resetPassword(token: string, password: string) { await this.http.post('/auth/reset-password', { token, password }, publicRequest); }
  async verifyEmail(code: string) { await this.http.post('/auth/verify-email', { code }, publicRequest); }
  async me() { return account((await this.http.get<ApiAccount>('/auth/me')).data); }
}

/* ───────────── Gym ───────────── */

const notificationsFrom = (p: ApiNotificationPreferences): NotificationPreferences => ({
  workoutReminders: p.workoutReminder, reminderHour: p.reminderHour, reminderMinute: p.reminderMinute, streakReminders: p.motivation, stories: p.stories,
  weeklyChallenge: p.weeklyChallenge, newContent: p.newContent, trialEnding: p.trial, achievements: p.achievement,
});
const notificationsTo = (p: Partial<NotificationPreferences>): Partial<ApiNotificationPreferences> => ({
  workoutReminder: p.workoutReminders, reminderHour: p.reminderHour, reminderMinute: p.reminderMinute, motivation: p.streakReminders, stories: p.stories,
  weeklyChallenge: p.weeklyChallenge, newContent: p.newContent, trial: p.trialEnding, achievement: p.achievements,
});

class ApiGymRepository implements GymRepository {
  constructor(private http: AxiosInstance, private baseURL: string) {}

  private media = (value?: ApiMedia | null): Media => ({
    thumbnailUrl: resolveMediaUrl(this.baseURL, value?.thumbnailUrl ?? value?.imageUrl), videoUrl: resolveMediaUrl(this.baseURL, value?.videoUrl), imageUrl: resolveMediaUrl(this.baseURL, value?.imageUrl), durationSeconds: value?.durationSeconds ?? undefined,
  });
  private workout = (item: ApiWorkout) => workout(item, this.media);
  private exercise = (item: ApiExercise) => exercise(item, this.media);

  async getAccess() { return accessFrom((await this.http.get<ApiAccess>('/me/gym/access')).data); }
  async startTrial() { return accessFrom((await this.http.post<ApiAccess>('/me/gym/trial/start', {})).data); }

  async getProfile() {
    const [gym, me] = await Promise.all([this.http.get<ApiGymProfile>('/me/gym/profile'), this.http.get<{ profile: { heightCm: string | number | null; weightKg?: string | number | null } | null }>('/me').catch(() => null)]);
    return { ...profile(gym.data), heightCm: num(me?.data.profile?.heightCm), weightKg: num(me?.data.profile?.weightKg) ?? num(gym.data.bodyWeightKg) };
  }

  async saveOnboarding(answers: OnboardingAnswers) {
    const { body } = answers;
    // Age is stored as entered (with the date it was recorded); no date of birth is invented.
    await this.http.patch('/me/gym/profile', { primaryGoal: goalToApi[answers.goal], experienceLevel: answers.experience, trainingLocation: answers.location, daysPerWeek: answers.daysPerWeek, availableMinutes: minutesFor[answers.duration], availableEquipment: answers.equipment, ageYears: body.age });
    const userProfile: Record<string, unknown> = {};
    if (body.heightCm) userProfile.heightCm = body.heightCm;
    if (body.weightKg) userProfile.weightKg = body.weightKg;
    if (body.gender && body.gender !== 'unspecified') userProfile.gender = genderToApi[body.gender];
    if (Object.keys(userProfile).length) await this.http.patch('/me/profile', userProfile);
  }

  async updateProfile(patch: Partial<OnboardingAnswers>) {
    const { data } = await this.http.patch<ApiGymProfile>('/me/gym/profile', {
      primaryGoal: patch.goal ? goalToApi[patch.goal] : undefined, experienceLevel: patch.experience, trainingLocation: patch.location, daysPerWeek: patch.daysPerWeek,
      availableMinutes: patch.duration ? minutesFor[patch.duration] : undefined, availableEquipment: patch.equipment, ageYears: patch.body?.age,
    });
    return { ...profile(data), heightCm: (await this.getProfile()).heightCm };
  }

  async updateBodyMetrics(patch: { heightCm?: number; weightKg?: number }) {
    await this.http.patch('/me/profile', patch);
    return this.getProfile();
  }

  private day = (d: ApiPlanDay): PlanDay => ({ weekday: d.weekday, date: d.date, status: d.status, workout: d.workout ? this.workout(d.workout) : undefined, dayNumber: d.dayNumber ?? undefined });

  /** The server assigns the plan and computes the week in the user's time zone. */
  async getWeekPlan() {
    const { data } = await this.http.get<ApiWeekPlan>('/me/gym/training-plan');
    const days = data.days.map(this.day);
    const plan = data.plan ? {
      id: data.plan.id, name: data.plan.name, description: data.plan.description ?? undefined, goal: data.plan.goal, difficulty: data.plan.difficulty, daysPerWeek: data.plan.daysPerWeek, locked: false,
      days: days.filter((d) => d.workout && d.dayNumber).map((d) => ({ dayNumber: d.dayNumber!, workout: d.workout! })).sort((a, b) => a.dayNumber - b.dayNumber),
    } : undefined;
    return { plan, assignment: data.assignment ? { source: data.assignment.source, startDate: data.assignment.startDate } : undefined, days, today: data.today ? this.day(data.today) : undefined };
  }

  async listWorkouts() { return (await this.http.get<ApiPage<ApiWorkout>>('/workouts', { params: { limit: 50 } })).data.items.map(this.workout); }
  async getWorkout(id: string) { return this.workout((await this.http.get<{ workout: ApiWorkout }>(`/workouts/${id}`)).data.workout); }

  async getHome() {
    const [me, week, recommendations, stories, progress, active] = await Promise.all([
      this.http.get<ApiAccount>('/auth/me'), this.getWeekPlan(), this.http.get<ApiRecommendations>('/me/gym/recommendations'), this.listStories(), this.getProgress(), this.getActiveSession().catch(() => undefined),
    ]);
    return {
      greetingName: me.data.firstName, today: week.today, planName: week.plan?.name, stories,
      recommendations: recommendations.data.items.map((r) => this.workout(r.workout)).filter((w) => w.id !== week.today?.workout?.id),
      progress: { weekDays: progress.weekDays, week: progress.week, streak: progress.streak },
      activeSession: active ? { id: active.id, workoutId: active.workoutId, name: active.name, startedAt: active.startedAt } : undefined,
    };
  }

  async listExercises(query: { search?: string; muscle?: string; equipment?: string; difficulty?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { data } = await this.http.get<ApiPage<ApiExercise>>('/exercises', { params: { search: query.search || undefined, muscle: query.muscle, equipment: query.equipment, difficulty: query.difficulty, page, limit, sort: 'name', order: 'asc' } });
    return { items: data.items.map(this.exercise), total: data.total, page, limit, hasMore: page * limit < data.total };
  }

  async getExercise(id: string) {
    const { data } = await this.http.get<{ exercise: ApiExercise; workouts: { workout: { id: string; name: string } }[]; exerciseAccess?: ExerciseAccess }>(`/exercises/${encodeURIComponent(id)}`);
    return { exercise: this.exercise(data.exercise), workouts: data.workouts.map((row) => row.workout), access: data.exerciseAccess };
  }

  /* ── Referrals, plans, coupons, checkout ── */

  /* ── Activity tracking (FREE) ── */
  async listActivities(query: { type?: ActivityType; before?: string; limit?: number } = {}) {
    return (await this.http.get<{ items: Activity[]; nextCursor: string | null }>('/me/gym/activities', { params: query })).data;
  }
  async getActivity(id: string) { return (await this.http.get<ActivityDetail>(`/me/gym/activities/${id}`)).data; }
  async saveActivity(activity: NewActivity) { return (await this.http.post<ActivityDetail>('/me/gym/activities', activity)).data; }
  async deleteActivity(id: string) { await this.http.delete(`/me/gym/activities/${id}`); }
  async addActivityHealthRef(id: string, provider: HealthProvider, externalId: string) { await this.http.post(`/me/gym/activities/${id}/health-refs`, { provider, externalId }); }
  async getHealthConnections() { return (await this.http.get<HealthConnection[]>('/me/gym/health/connections')).data; }
  async setHealthConnection(provider: HealthProvider, status: HealthConnectionStatus, permissions?: string[], error?: string | null) {
    return (await this.http.put<HealthConnection>(`/me/gym/health/connections/${provider}`, { status, permissions, error: error ?? undefined })).data;
  }
  async syncHealth(input: { provider: HealthProvider; status: HealthConnectionStatus; permissions: string[]; workouts: ImportedWorkout[]; daily: HealthDaily[]; error?: string | null }) {
    return (await this.http.post<HealthSyncResult>('/me/gym/health/sync', { ...input, error: input.error ?? undefined })).data;
  }

  async getReferral() { return (await this.http.get<ReferralSummary>('/me/gym/referral')).data; }
  async claimReferral(code: string, source: ReferralSource) { return (await this.http.post<{ status: ReferralStatus }>('/me/gym/referral/claim', { code, source })).data; }
  async validateReferralCode(code: string) {
    const { data } = await this.http.get<{ valid: boolean }>('/referral-codes/validate', { params: { code }, ...publicRequest });
    return data.valid;
  }
  async listQuickStart(): Promise<QuickStartTile[]> {
    const { data } = await this.http.get<{ items: { id: string; title: string; imageUrl: string | null; target: { type: string; muscle?: string | null; id?: string } }[] }>('/quick-start');
    return data.items.flatMap((item): QuickStartTile[] => {
      const t = item.target;
      const target = t.type === 'muscle' && t.muscle ? { type: 'muscle' as const, muscle: t.muscle } : t.type === 'workout' && t.id ? { type: 'workout' as const, id: t.id } : t.type === 'exercise' && t.id ? { type: 'exercise' as const, id: t.id } : null;
      return target ? [{ id: item.id, title: item.title, imageUrl: resolveMediaUrl(this.baseURL, item.imageUrl ?? undefined), target }] : [];
    });
  }
  async listPlans(country?: string | null) { return (await this.http.get<BillingPlan[]>('/me/gym/billing/plans', { params: { country: country || undefined } })).data; }
  async quote(planKey: string, couponCode?: string | null, country?: string | null) { return (await this.http.post<Quote>('/me/gym/billing/quote', { planId: planKey, couponCode: couponCode || undefined, country: country || undefined })).data; }
  async checkout(planKey: string, couponCode?: string | null, country?: string | null) { return (await this.http.post<CheckoutResult>('/me/gym/billing/checkout', { planId: planKey, couponCode: couponCode || undefined, country: country || undefined })).data; }
  async verifyPurchase(input: { platform: 'ios' | 'android'; productId: string; receipt: string }) { await this.http.post('/me/gym/subscriptions/verify', input); }
  async trackShare(type: ShareEventType, exerciseId?: string, referralCode?: string) {
    await this.http.post('/me/gym/share-events', { type, exerciseId, referralCode }).catch(() => undefined);
  }

  /** Scheduled, audience-targeted stories with server-side view state. */
  async listStories(): Promise<Story[]> {
    const { data } = await this.http.get<ApiPage<ApiStory>>('/me/gym/stories');
    return data.items.map((item) => ({
      id: item.id, title: item.title, summary: item.summary ?? undefined, body: item.body ?? undefined, category: item.category, locked: item.access.isLocked, media: this.media(item.media), mediaType: item.mediaType,
      cta: item.cta ? { label: item.cta.label, type: item.cta.type, target: item.cta.target ?? undefined } : undefined, viewed: item.viewed, startsAt: item.startsAt ?? undefined, expiresAt: item.expiresAt ?? undefined,
    }));
  }
  async markStoryViewed(id: string, completed = false) { await this.http.post(`/me/gym/stories/${id}/view`, { completed }); }

  async listFavorites() { return (await this.http.get<{ targetType: 'exercise' | 'workout' | 'story'; targetId: string }[]>('/me/gym/favorites')).data.map((row) => ({ type: row.targetType, id: row.targetId })); }
  async setFavorite(type: 'exercise' | 'workout' | 'story', id: string, favorite: boolean) {
    if (favorite) await this.http.put('/me/gym/favorites', { targetType: type, targetId: id });
    else await this.http.delete(`/me/gym/favorites/${type}/${id}`);
  }

  async getActiveSession() {
    const { data } = await this.http.get<ApiPage<ApiWorkoutSession>>('/me/gym/workout-sessions', { params: { page: 1, limit: 5 } });
    const active = data.items.find((s) => s.status === 'ACTIVE');
    return active ? session(active) : undefined;
  }
  async startSession(workoutId: string, options: { discardActive?: boolean } = {}) {
    const create = async () => session((await this.http.post<ApiWorkoutSession>('/me/gym/workout-sessions', { workoutId, clientMutationId: Crypto.randomUUID() })).data);
    try {
      return await create();
    } catch (error) {
      // One active session per user: resume the same workout; for another one the user decides.
      if (!(error instanceof ApiError) || error.kind !== 'conflict') throw error;
      const active = await this.getActiveSession();
      if (!active) throw error;
      if (active.workoutId === workoutId) return active;
      if (!options.discardActive) throw new ActiveSessionConflict(active);
      await this.cancelSession(active.id);
      return create();
    }
  }
  async updateSets(sessionId: string, sets: { setId: string; completed: boolean; reps?: number; weightKg?: number; durationSeconds?: number }[], activeDurationMs: number) {
    const { data } = await this.http.patch<ApiWorkoutSession>(`/me/gym/workout-sessions/${sessionId}`, { activeDurationMs: Math.round(activeDurationMs), sets: sets.map((s) => ({ id: s.setId, completed: s.completed, reps: s.reps, weightKg: s.weightKg, durationSeconds: s.durationSeconds })) });
    return session(data);
  }
  async replaceSessionExercise(sessionId: string, sessionExerciseId: string, exerciseId: string) {
    return session((await this.http.post<ApiWorkoutSession>(`/me/gym/workout-sessions/${sessionId}/exercises/${sessionExerciseId}/replace`, { exerciseId })).data);
  }
  async addSessionExercise(sessionId: string, exerciseId: string) {
    return session((await this.http.post<ApiWorkoutSession>(`/me/gym/workout-sessions/${sessionId}/exercises`, { exerciseId })).data);
  }
  async completeSession(sessionId: string, activeDurationMs: number) {
    return session((await this.http.post<ApiWorkoutSession>(`/me/gym/workout-sessions/${sessionId}/complete`, { activeDurationMs: Math.round(activeDurationMs) })).data);
  }
  async cancelSession(sessionId: string) { await this.http.post(`/me/gym/workout-sessions/${sessionId}/cancel`, {}); }

  /** Totals, streaks, calendars, distribution and records are aggregated by the server. */
  async getProgress(): Promise<Progress> {
    const { data } = await this.http.get<ApiProgress>('/me/gym/progress');
    return {
      totalSessions: data.totalSessions, totalMinutes: data.totalMinutes, completedSets: data.completedSets, totalVolumeKg: data.totalVolumeKg, week: data.week,
      streak: data.streak.current, longestStreak: data.streak.longest,
      weekDays: data.weeklyActivity.map((d) => ({ date: d.date, done: d.sessions > 0, isToday: d.isToday, minutes: d.minutes })),
      monthDays: data.monthlyActivity.map((d) => ({ date: d.date, count: d.sessions, isToday: d.isToday, inFuture: d.inFuture })),
      gymStreak: data.gymStreak, fitness: data.fitness,
      muscleDistribution: data.muscleDistribution, exerciseFrequency: data.exerciseFrequency,
      personalRecords: data.personalRecords.map((r) => ({ exerciseId: r.exerciseId, name: r.name, maxWeightKg: r.maxWeightKg ?? undefined, repsAtMax: r.repsAtMax ?? undefined, maxReps: r.maxReps ?? undefined, achievedAt: r.achievedAt })),
      history: data.history.map((h) => ({ id: h.id, name: h.name, completedAt: h.completedAt, minutes: h.minutes, sets: h.sets, exercises: h.exercises })),
      achievements: data.achievements.map(achievement),
    };
  }

  async getPreferences(): Promise<Preferences> {
    const [user, gym, notifications, local] = await Promise.all([this.http.get<ApiUserPreferences>('/me/preferences'), this.http.get<ApiGymPreferences>('/me/gym/preferences'), this.http.get<ApiNotificationPreferences>('/me/gym/notification-preferences'), localState.preferences()]);
    // "auto" lives only in the gym preferences; the shared HealthyMe preference stays metric | imperial for the other apps.
    return { audioCues: local.audioCues, language: user.data.language, units: gym.data.units ?? user.data.units, notificationsEnabled: user.data.notificationsEnabled, restTimerEnabled: gym.data.restTimerEnabled, defaultRestSeconds: gym.data.defaultRestSeconds, notifications: notificationsFrom(notifications.data) };
  }
  async updatePreferences(patch: Partial<Preferences>) {
    const { language, units, notificationsEnabled, restTimerEnabled, defaultRestSeconds, audioCues, notifications } = patch;
    await Promise.all([
      language !== undefined || (units !== undefined && units !== 'auto') || notificationsEnabled !== undefined ? this.http.patch('/me/preferences', { language, units: units === 'auto' ? undefined : units, notificationsEnabled }) : null,
      restTimerEnabled !== undefined || defaultRestSeconds !== undefined || units !== undefined || notificationsEnabled !== undefined ? this.http.patch('/me/gym/preferences', { restTimerEnabled, defaultRestSeconds, units, notificationsEnabled }) : null,
      notifications !== undefined ? this.http.put('/me/gym/notification-preferences', notificationsTo(notifications)) : null,
      // Audio cues are a property of this device, not the account.
      audioCues !== undefined ? localState.savePreferences({ audioCues }) : null,
    ]);
    return this.getPreferences();
  }

  async registerDevice(input: DeviceRegistration) {
    const platform = Platform.OS === 'android' ? 'android' : 'ios';
    const { data } = await this.http.put<{ serverPush?: boolean }>('/me/gym/devices', { installationId: await localState.installationId(), platform, provider: 'expo', pushToken: input.pushToken ?? undefined, timezone: input.timezone, locale: input.locale, appVersion: input.appVersion });
    return { serverPush: !!data.serverPush };
  }
  async unregisterDevice() { await this.http.delete(`/me/gym/devices/${await localState.installationId()}`); }
}

export function createApiRepositories(baseURL: string, onSessionExpired: () => void): Repositories {
  const http = createApiClient(baseURL, onSessionExpired);
  return { mode: 'api', auth: new ApiAuthRepository(http), gym: new ApiGymRepository(http, baseURL) };
}

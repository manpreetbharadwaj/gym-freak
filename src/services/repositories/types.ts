import type { SupportRepository } from './support';
import { Access, Account, Activity, ActivityDetail, ActivityType, BillingPlan, HealthConnection, HealthConnectionStatus, HealthDaily, HealthProvider, HealthSyncResult, ImportedWorkout, NewActivity, CheckoutResult, DeviceRegistration, Exercise, ExerciseAccess, ExerciseQuery, FavoriteTarget, GymProfile, HomeData, OnboardingAnswers, OnboardingContent, Page, Preferences, Progress, QuickStartTile, Quote, ReferralSource, ReferralStatus, ReferralSummary, SetUpdate, ShareEventDetails, ShareEventType, Story, Workout, WeekPlan, WorkoutSession, ContentTiles, ActivityLevel, BodyFatMeasurement, BodyFatReading, BodyFatSummary, CalcSex, NutritionHistoryEntry, NutritionSummary, OrganizerSnapshot, NoteInput, PersonalNote, ReminderInput, PersonalReminder, ReminderCategory, ReminderCompletion, ReminderSnooze } from '@/types/domain';

/** Starting a workout while another one is unfinished: the screen asks whether to resume or discard it. */
export class ActiveSessionConflict extends Error {
  constructor(public active: WorkoutSession) { super('Another workout is in progress'); }
}

export interface SignUpInput { firstName: string; lastName?: string; email: string; password: string }
export interface SignInInput { email: string; password: string }

/** HealthyMe `/v1/auth/*`. Phone/OTP can be added as another method set without touching screens. */
export interface AuthRepository {
  /** Returns the stored account if a valid session exists. */
  restore(): Promise<Account | null>;
  signIn(input: SignInInput): Promise<Account>;
  signUp(input: SignUpInput): Promise<Account>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
  verifyEmail(code: string): Promise<void>;
  me(): Promise<Account>;
}

/** Everything Gym Freak needs from the HealthyMe Gym module. */
export interface GymRepository {
  /** Public, pre-sign-in: the published onboarding cards for the request locale (English fallback per field). */
  getOnboardingContent(): Promise<OnboardingContent>;
  /** Admin-managed image tiles (Explore + onboarding question photos). Public: works before sign-in. */
  getContentTiles(): Promise<ContentTiles>;
  getNutrition(): Promise<NutritionSummary>;
  setNutritionInputs(input: { calculationSex?: CalcSex | null; activityLevel?: ActivityLevel | null; medicalCaution?: boolean }): Promise<NutritionSummary>;
  setNutritionOverride(input: { calories: number; proteinG: number }): Promise<NutritionSummary>;
  clearNutritionOverride(): Promise<NutritionSummary>;
  getNutritionHistory(): Promise<NutritionHistoryEntry[]>;
  getBodyFat(): Promise<BodyFatSummary>;
  addBodyFat(input: { percent: number; measuredAt: string; source?: string | null; notes?: string | null }): Promise<BodyFatMeasurement>;
  addBodyFatNavy(input: { heightCm?: number; neckCm: number; waistCm: number; hipCm?: number; measuredAt: string; notes?: string | null }): Promise<BodyFatMeasurement>;
  importBodyFat(provider: HealthProvider, readings: BodyFatReading[]): Promise<{ imported: number; skipped: number; invalid: number }>;
  updateBodyFat(id: string, patch: { percent?: number; measuredAt?: string; source?: string | null; notes?: string | null }): Promise<BodyFatMeasurement>;
  deleteBodyFat(id: string): Promise<void>;
  getAccess(): Promise<Access>;
  /** Explicit, account-bound free trial (length configured by admins). */
  startTrial(): Promise<Access>;
  getProfile(): Promise<GymProfile>;
  saveOnboarding(answers: OnboardingAnswers): Promise<void>;
  updateProfile(patch: Partial<OnboardingAnswers>): Promise<GymProfile>;
  /** Height / weight in canonical cm + kg (unit conversion happens in the UI, once, on edit). */
  updateBodyMetrics(patch: { heightCm?: number; weightKg?: number }): Promise<GymProfile>;

  getHome(): Promise<HomeData>;
  getWeekPlan(): Promise<WeekPlan>;
  getWorkout(id: string): Promise<Workout>;
  listWorkouts(): Promise<Workout[]>;

  listExercises(query: ExerciseQuery): Promise<Page<Exercise>>;
  /** By id or slug (shared links). `access` is the server's gate; a missing exercise rejects with a 404 ApiError. */
  getExercise(id: string): Promise<{ exercise: Exercise; workouts: { id: string; name: string }[]; access?: ExerciseAccess }>;

  listStories(): Promise<Story[]>;
  markStoryViewed(id: string, completed?: boolean): Promise<void>;

  listFavorites(): Promise<{ type: FavoriteTarget; id: string }[]>;
  setFavorite(type: FavoriteTarget, id: string, favorite: boolean): Promise<void>;

  /** Resumes an active session of the same workout; throws ActiveSessionConflict for a different one unless `discardActive`. */
  startSession(workoutId: string, options?: { discardActive?: boolean }): Promise<WorkoutSession>;
  getActiveSession(): Promise<WorkoutSession | undefined>;
  /** Swaps the exercise in this session only (the workout template is untouched). */
  replaceSessionExercise(sessionId: string, sessionExerciseId: string, exerciseId: string): Promise<WorkoutSession>;
  /** Appends an exercise to this session only. */
  addSessionExercise(sessionId: string, exerciseId: string): Promise<WorkoutSession>;
  updateSets(sessionId: string, sets: SetUpdate[], activeDurationMs: number): Promise<WorkoutSession>;
  completeSession(sessionId: string, activeDurationMs: number): Promise<WorkoutSession>;
  cancelSession(sessionId: string): Promise<void>;

  getProgress(): Promise<Progress>;

  getPreferences(): Promise<Preferences>;
  updatePreferences(patch: Partial<Preferences>): Promise<Preferences>;

  /** Registers this installation (push token, time zone, locale). Resolves whether the server delivers pushes to it. */
  registerDevice(input: DeviceRegistration): Promise<{ serverPush: boolean }>;
  unregisterDevice(): Promise<void>;

  getOrganizer(since?: string): Promise<OrganizerSnapshot>;
  createNote(input: NoteInput): Promise<PersonalNote>;
  updateNote(id: string, input: Partial<NoteInput> & { baseRevision?: number }): Promise<PersonalNote>;
  deleteNote(id: string): Promise<void>;
  createReminder(input: ReminderInput): Promise<PersonalReminder>;
  updateReminder(id: string, input: Partial<ReminderInput> & { baseRevision?: number }): Promise<PersonalReminder>;
  deleteReminder(id: string): Promise<void>;
  completeReminder(id: string, occurrenceAt: string, source?: 'APP' | 'NOTIFICATION'): Promise<ReminderCompletion>;
  snoozeReminder(id: string, occurrenceAt: string, minutes: 5 | 10 | 15): Promise<ReminderSnooze>;
  createReminderCategory(input: Pick<ReminderCategory, 'name' | 'icon' | 'color'> & { description?: string | null }): Promise<ReminderCategory>;
  deleteReminderCategory(id: string): Promise<void>;
  saveReminderSchedule(id: string, input: { installationId: string; timezone: string; notificationIds: string[]; scheduledThrough?: string | null }): Promise<void>;

  /* Referrals, plans, coupons, checkout: every amount and status comes from the server. */
  getReferral(): Promise<ReferralSummary>;
  /** Attach this new account to a referrer (once, shortly after sign-up). */
  claimReferral(code: string, source: ReferralSource): Promise<{ status: ReferralStatus }>;
  /** Public check for the optional sign-up field. */
  validateReferralCode(code: string): Promise<boolean>;
  /** `country` = ISO alpha-2 storefront country; the server prices for it (or the plan default). */
  /** Home Quick Start tiles: published, with a live target, in admin order, localized by the server. */
  listQuickStart(): Promise<QuickStartTile[]>;
  listPlans(country?: string | null): Promise<BillingPlan[]>;
  quote(planKey: string, couponCode?: string | null, country?: string | null): Promise<Quote>;
  /** Zero total → access granted immediately (no charge); otherwise a pending checkout for the store purchase. */
  checkout(planKey: string, couponCode?: string | null, country?: string | null): Promise<CheckoutResult>;
  /** Sends a store receipt (App Store JWS / Play purchase token) for server-side verification; premium only changes there. */
  verifyPurchase(input: { platform: 'ios' | 'android'; productId: string; receipt: string }): Promise<void>;
  trackShare(type: ShareEventType, exerciseId?: string, referralCode?: string, details?: ShareEventDetails): Promise<void>;

  /* Activity tracking (FREE — never gated). The backend is the source of Gym Freak activity history. */
  listActivities(query?: { type?: ActivityType; before?: string; limit?: number }): Promise<{ items: Activity[]; nextCursor: string | null }>;
  getActivity(id: string): Promise<ActivityDetail>;
  /** Idempotent per `clientId`: retrying a save returns the same activity. */
  saveActivity(activity: NewActivity): Promise<ActivityDetail>;
  deleteActivity(id: string): Promise<void>;
  /** Remembers that this activity was written to Apple Health / Health Connect (so reading it back is not a new session). */
  addActivityHealthRef(id: string, provider: HealthProvider, externalId: string): Promise<void>;
  getHealthConnections(): Promise<HealthConnection[]>;
  setHealthConnection(provider: HealthProvider, status: HealthConnectionStatus, permissions?: string[], error?: string | null): Promise<HealthConnection | undefined>;
  /** Sends workouts + daily aggregates read on this device; the server de-duplicates. */
  syncHealth(input: { provider: HealthProvider; status: HealthConnectionStatus; permissions: string[]; workouts: ImportedWorkout[]; daily: HealthDaily[]; error?: string | null }): Promise<HealthSyncResult>;
}

export interface Repositories {
  mode: 'api' | 'mock';
  auth: AuthRepository;
  gym: GymRepository;
  /** Help & Support, Feedback, Advertise & Collaborate. */
  support: SupportRepository;
}

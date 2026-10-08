/**
 * App-level domain types. Screens only ever see these shapes; repositories translate
 * HealthyMe API payloads (see `src/api/contracts.ts`) or mock data into them.
 */

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'build-muscle' | 'lose-fat' | 'get-stronger' | 'stay-fit' | 'improve-endurance' | 'improve-mobility';
export type TrainingLocation = 'gym' | 'home' | 'both';
export type DurationRange = '20-30' | '30-45' | '45-60' | '60-90';
export type Equipment = 'dumbbells' | 'barbell' | 'bench' | 'cable-machine' | 'bands' | 'smith-machine' | 'pull-up-bar' | 'machines' | 'bodyweight' | 'full-gym';
export type Gender = 'woman' | 'man' | 'non-binary' | 'unspecified';
export type ExerciseMode = 'strength' | 'bodyweight_reps' | 'timed';

export const muscleGroups = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'core', 'cardio', 'mobility', 'full-body'] as const;
export type MuscleGroup = (typeof muscleGroups)[number];

/** Remote media only; nothing exercise-specific is bundled with the app. */
export interface Media {
  thumbnailUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  durationSeconds?: number;
}

export type AccessStatus = 'free' | 'trial' | 'premium' | 'expired';
/** Decided by HealthyMe; the app never infers premium on its own. */
export interface Access {
  status: AccessStatus;
  premium: boolean;
  /** The account may still start its (one) free trial. */
  trialEligible: boolean;
  /** Trial length configured in the admin panel. */
  trialDays: number;
  trialStartedAt?: string;
  trialEndsAt?: string;
  premiumUntil?: string;
  premiumSource?: string;
  /** Admin settings: whether premium content is gated / shown, and whether store purchases are possible. */
  paywallEnabled: boolean;
  premiumVisible: boolean;
  billingEnabled: boolean;
}

export interface Account {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
}

export interface BodyInfo {
  age?: number;
  heightCm?: number;
  weightKg?: number;
  gender?: Gender;
}

export interface OnboardingAnswers {
  goal: Goal;
  experience: Difficulty;
  location: TrainingLocation;
  daysPerWeek: number;
  duration: DurationRange;
  equipment: Equipment[];
  body: BodyInfo;
}

export interface GymProfile {
  goal?: Goal;
  experience?: Difficulty;
  location?: TrainingLocation;
  daysPerWeek: number;
  availableMinutes: number;
  equipment: string[];
  bodyWeightKg?: number;
  heightCm?: number;
  /** Body weight from the HealthyMe profile (onboarding / profile edits). */
  weightKg?: number;
  /** Current age derived by the server from the age entered and when it was recorded. */
  age?: number;
}

export interface Exercise {
  id: string;
  slug: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string[];
  mode: ExerciseMode;
  difficulty: Difficulty;
  instructions: string[];
  /** Backend `safetyNotes`: shown as form tips. */
  formTips: string[];
  commonMistakes: string[];
  breathing?: string;
  isPremium: boolean;
  locked: boolean;
  media: Media;
}

export interface Prescription {
  sets: number;
  repMin?: number;
  repMax?: number;
  durationSeconds?: number;
  restSeconds: number;
  notes?: string;
}

export interface WorkoutExercise extends Prescription {
  id: string;
  exerciseId: string;
  order: number;
  exercise: Exercise;
}

export interface Workout {
  id: string;
  slug: string;
  name: string;
  description?: string;
  difficulty: Difficulty;
  goal: string;
  estimatedMinutes: number;
  isPremium: boolean;
  locked: boolean;
  media: Media;
  exercises: WorkoutExercise[];
  muscleGroups: string[];
}

export interface TrainingPlan {
  id: string;
  name: string;
  description?: string;
  goal: string;
  difficulty: Difficulty;
  daysPerWeek: number;
  locked: boolean;
  days: { dayNumber: number; workout: Workout }[];
}

/** `not_started`: a day earlier in the week than the plan's start (never counted as missed). */
export type PlanDayStatus = 'completed' | 'today' | 'upcoming' | 'missed' | 'rest' | 'not_started';
export interface PlanDay {
  /** 0 = Monday … 6 = Sunday. */
  weekday: number;
  date: string;
  status: PlanDayStatus;
  workout?: Workout;
  dayNumber?: number;
}

export interface WeekPlan {
  plan?: TrainingPlan;
  /** How the plan was chosen: automatically from the profile, or pinned by a coach/admin. */
  assignment?: { source: 'AUTO' | 'ADMIN'; startDate: string };
  days: PlanDay[];
  today?: PlanDay;
}

export interface Story {
  id: string;
  title: string;
  summary?: string;
  body?: string;
  category: string;
  locked: boolean;
  media: Media;
  mediaType?: 'NONE' | 'IMAGE' | 'VIDEO';
  cta?: { label: string; type?: string; target?: string };
  viewed: boolean;
  startsAt?: string;
  expiresAt?: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ExerciseQuery {
  search?: string;
  muscle?: string;
  equipment?: string;
  difficulty?: Difficulty;
  page?: number;
  limit?: number;
}

export interface SessionSet {
  id: string;
  setNumber: number;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  completed: boolean;
}

export interface SessionExercise {
  id: string;
  exerciseId?: string;
  /** `plan` from the workout, `replacement` swapped in during the session, `added` for this session only. */
  origin?: 'plan' | 'replacement' | 'added';
  name: string;
  order: number;
  prescription: Prescription & { mode: ExerciseMode };
  sets: SessionSet[];
}

export interface WorkoutSession {
  id: string;
  workoutId?: string;
  name: string;
  status: 'active' | 'completed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  activeDurationMs: number;
  exercises: SessionExercise[];
  /** Returned when a session is completed: achievements unlocked by it. */
  newAchievements?: Achievement[];
}

export interface SetUpdate {
  setId: string;
  completed: boolean;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon?: string;
  category?: string;
  unlockedAt?: string;
}

export interface SessionSummary {
  id: string;
  name: string;
  completedAt: string;
  minutes: number;
  sets: number;
  exercises: number;
}

export interface Progress {
  totalSessions: number;
  totalMinutes: number;
  completedSets: number;
  totalVolumeKg: number;
  week: { sessions: number; minutes: number };
  streak: number;
  longestStreak: number;
  /** Monday→Sunday; `minutes` is active training time that day (server-aggregated). */
  weekDays: { date: string; done: boolean; isToday: boolean; minutes?: number }[];
  /** Last 5 weeks, oldest first, Monday-aligned. */
  monthDays: { date: string; count: number; isToday: boolean; inFuture: boolean }[];
  muscleDistribution: { muscle: string; sets: number }[];
  exerciseFrequency: { exerciseId: string; name: string; sessions: number; sets: number }[];
  personalRecords: { exerciseId: string; name: string; maxWeightKg?: number; repsAtMax?: number; maxReps?: number; achievedAt: string }[];
  history: SessionSummary[];
  achievements: Achievement[];
  /** Gym-only streak (the `streak` above combines gym + qualifying activities). */
  gymStreak?: { current: number; longest: number };
  /** Unified gym + activity analytics (server-computed). */
  fitness?: Fitness;
}

export interface HomeData {
  greetingName: string;
  today?: PlanDay;
  stories: Story[];
  recommendations: Workout[];
  progress: Pick<Progress, 'weekDays' | 'week' | 'streak'>;
  /** Name of the assigned plan (absent = no plan yet). With no `today`, the week's remaining days are rest days. */
  planName?: string;
  /** An unfinished workout the user can resume. */
  activeSession?: Pick<WorkoutSession, 'id' | 'workoutId' | 'name' | 'startedAt'>;
}

export interface DeviceRegistration {
  pushToken?: string | null;
  timezone: string;
  locale: string;
  appVersion: string;
}

/** Stored per account in HealthyMe (`/me/gym/notification-preferences`). */
export interface NotificationPreferences {
  workoutReminders: boolean;
  reminderHour: number;
  reminderMinute: number;
  streakReminders: boolean;
  stories: boolean;
  weeklyChallenge: boolean;
  newContent: boolean;
  trialEnding: boolean;
  achievements: boolean;
}

export interface Preferences {
  language: string;
  /** Display preference; stored values are always cm / kg / meters. */
  units: 'auto' | 'metric' | 'imperial';
  notificationsEnabled: boolean;
  restTimerEnabled: boolean;
  defaultRestSeconds: number;
  audioCues: boolean;
  notifications: NotificationPreferences;
}

export type FavoriteTarget = 'exercise' | 'workout' | 'story';

/* ───────────── Referrals, plans, coupons, checkout (all values decided by HealthyMe) ───────────── */

export type DiscountType = 'PERCENTAGE' | 'FIXED';
export interface Discount { discountType: DiscountType; discountValue: number }

/** Refer & Earn: the code, share links and server-computed stats. Pending referrals never count. */
export interface ReferralSummary {
  code: string;
  active: boolean;
  link: string;
  /** Public link domain for shares (e.g. https://gymfreak.app), configured on the server. */
  shareBaseUrl: string;
  /** Currency of fixed-amount rewards (the plans’ default currency); null when no plan exists. */
  currency: string | null;
  totalReferrals: number;
  pendingReferrals: number;
  successfulReferrals: number;
  reward: (Discount & { label: string | null }) | null;
  nextMilestone: (Discount & { referrals: number; remaining: number }) | null;
}

export type ReferralSource = 'CODE' | 'LINK' | 'EXERCISE_SHARE';
export type ReferralStatus = 'PENDING' | 'QUALIFIED' | 'REWARDED' | 'INVALID' | 'CANCELLED';

/** A plan priced for one storefront country (its own price row) or, when `country` is null, the plan default. */
export interface BillingPlan { key: string; name: string; priceMinor: number; currency: string; country: string | null; priceSource: 'country' | 'default'; periodDays: number; productIds: string[] }

export type CouponReason = 'NOT_FOUND' | 'INACTIVE' | 'NOT_STARTED' | 'EXPIRED' | 'LIMIT_REACHED' | 'USER_LIMIT_REACHED' | 'PLAN_NOT_ELIGIBLE' | 'MIN_PURCHASE' | 'NEW_USERS_ONLY' | 'EXISTING_USERS_ONLY' | 'CURRENCY_MISMATCH' | 'NOT_COMBINABLE';

/** The server’s checkout quote. The app renders it; it never computes prices or discounts. */
export interface Quote {
  plan: { key: string; name: string; periodDays: number; productIds: string[] };
  currency: string;
  /** Storefront country the server priced for; null when the plan's default price applied. */
  country: string | null;
  priceSource: 'country' | 'default';
  baseAmount: number;
  referralDiscount: number;
  couponDiscount: number;
  totalDiscount: number;
  finalAmount: number;
  referralReward: (Discount & { applied: boolean }) | null;
  appliedCoupon: (Discount & { code: string; description: string | null; applied: boolean }) | null;
  coupon: { code: string; valid: boolean; reason: CouponReason | null } | null;
  payment: { required: boolean; provider: 'none' | 'store' };
}

export interface CheckoutResult { checkoutId: string; status: 'GRANTED' | 'PENDING_PAYMENT' | 'COMPLETED' | 'CANCELLED'; grantedUntil: string | null; paymentRequired: boolean; productIds: string[]; quote: Quote }

/** Server-decided gate for an exercise (shared links never decide access). */
export interface ExerciseAccess { exerciseId: string; access: 'FREE' | 'PREMIUM'; userHasAccess: boolean }

export type ShareEventType = 'exercise_shared' | 'exercise_share_opened' | 'exercise_share_signup' | 'shared_exercise_viewed' | 'shared_exercise_premium_locked' | 'shared_exercise_upgrade_started' | 'shared_exercise_upgrade_completed';

/* ───────────── Activity tracking (FREE for every user) ───────────── */

export type ActivityType = 'RUNNING' | 'WALKING' | 'HIKING' | 'TREKKING' | 'YOGA';
/** GYM_FREAK = recorded in the app (primary); the others were imported from the device's health platform. */
export type ActivitySource = 'GYM_FREAK' | 'APPLE_HEALTH' | 'HEALTH_CONNECT';
export type HealthProvider = 'APPLE_HEALTH' | 'HEALTH_CONNECT';
export type HealthConnectionStatus = 'CONNECTED' | 'NOT_CONNECTED' | 'PERMISSION_LIMITED' | 'ERROR';

export interface ActivityRoutePoint { lat: number; lng: number; alt?: number | null; accuracy?: number | null; t: number; gap?: boolean }
export interface ActivitySplit { unit: 'km' | 'mi'; number: number; distanceMeters: number; durationMs: number }

/** Canonical units only: meters, milliseconds, kcal, sec/km. */
export interface Activity {
  id: string;
  type: ActivityType;
  source: ActivitySource;
  sourceName?: string | null;
  startedAt: string;
  endedAt: string;
  activeDurationMs: number;
  pausedDurationMs: number;
  distanceMeters: number | null;
  calories: number | null;
  /** true = Gym Freak estimate; false = recorded by the health platform / wearable. */
  caloriesEstimated: boolean;
  steps: number | null;
  elevationGainM: number | null;
  avgPaceSecPerKm: number | null;
  hasRoute: boolean;
  exportedTo: HealthProvider[];
}

export interface ActivityDetail extends Activity { route: ActivityRoutePoint[]; splits: ActivitySplit[] }

export interface NewActivity {
  clientId: string;
  type: ActivityType;
  startedAt: string;
  endedAt: string;
  activeDurationMs: number;
  pausedDurationMs: number;
  distanceMeters: number | null;
  calories: number | null;
  caloriesEstimated: boolean;
  steps?: number | null;
  elevationGainM: number | null;
  route: ActivityRoutePoint[];
  splits: ActivitySplit[];
}

export interface HealthConnection { provider: HealthProvider; status: HealthConnectionStatus; permissions: string[]; lastSyncedAt: string | null; lastError: string | null }

export interface ImportedWorkout {
  externalId: string;
  type: ActivityType;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  distanceMeters: number | null;
  calories: number | null;
  steps?: number | null;
  sourceName?: string | null;
  gymFreakActivityId?: string | null;
}

export interface HealthDaily { date: string; steps: number | null; distanceMeters: number | null; activeCalories: number | null }

export interface HealthSyncResult { imported: number; matched: number; skipped: number; connection?: HealthConnection }

export type FitnessKey = 'GYM' | ActivityType;
export interface FitnessPeriod {
  from: string;
  to: string;
  activeDays: number;
  gymSessions: number;
  gymMinutes: number;
  activitySessions: number;
  runningSessions: number;
  yogaSessions: number;
  activityMinutes: number;
  totalActiveMinutes: number;
  cardioMinutes: number;
  outdoorMinutes: number;
  /** Workout distance (never includes the platform's step distance). */
  totalDistanceMeters: number;
  distanceByType: Partial<Record<ActivityType, number>>;
  calories: number | null;
  caloriesEstimated: boolean;
  /** Platform aggregates (Apple Health / Health Connect), null when not connected. */
  steps: number | null;
  healthDistanceMeters: number | null;
  breakdown: { key: FitnessKey; sessions: number; minutes: number; distanceMeters: number }[];
  days: { date: string; minutes: Partial<Record<FitnessKey, number>>; totalMinutes: number; qualified: boolean }[];
}

export interface Fitness {
  week: FitnessPeriod;
  month: FitnessPeriod;
  running: { totalRuns: number; totalMinutes: number; totalDistanceMeters: number; weekDistanceMeters: number; monthDistanceMeters: number; averagePaceSecPerKm: number | null; longestRunMeters: number | null; fastestPaceSecPerKm: number | null };
  streak: { current: number; best: number; last7: { date: string; active: boolean }[] };
  rule: { minActivityMinutes: number; minDistanceMeters: number; qualifyingTypes: ActivityType[]; includeImported: boolean };
}

/** Home "Quick Start" tile (admin-managed). `target` is what tapping opens. */
export type QuickStartTarget = { type: 'muscle'; muscle: string } | { type: 'workout'; id: string } | { type: 'exercise'; id: string };
export interface QuickStartTile { id: string; title: string; imageUrl?: string; target: QuickStartTarget }

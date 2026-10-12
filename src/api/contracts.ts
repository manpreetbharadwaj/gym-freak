/**
 * Wire shapes of the shared HealthyMe backend (healthyMe-Backend: src/auth, src/users, src/gym).
 * Keep these in sync with docs/openapi.json; nothing outside `src/api` and the API repository uses them.
 */

export interface ApiAccount { id: string; email: string; firstName: string; lastName: string; emailVerified: boolean }
export interface ApiTokens { accessToken: string; refreshToken: string; expiresIn: number }
export interface ApiSession { user: ApiAccount; tokens: ApiTokens }

export type ApiAccessStatus = 'premium' | 'trial' | 'eligible' | 'expired' | 'not_eligible';
export interface ApiAccess {
  status: ApiAccessStatus; premium: boolean; trialEligible: boolean; trialDays: number;
  trialStartedAt: string | null; trialEndsAt: string | null; premiumUntil: string | null; premiumSource: string | null;
  paywallEnabled: boolean; premiumVisible: boolean; billingEnabled: boolean;
}
export interface ApiMedia { videoUrl: string | null; imageUrl: string | null; thumbnailUrl: string | null; durationSeconds: number | null }
export interface ApiPage<T> { items: T[]; total: number; page: number; limit: number; access?: ApiAccess }

export interface ApiExercise {
  id: string;
  slug: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string[];
  mode: 'strength' | 'bodyweight_reps' | 'timed';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
  safetyNotes: string[];
  isPremium: boolean;
  mediaAssetId: string | null;
  access: { isLocked: boolean };
  // Optional fields the Gym module can add without breaking older clients.
  formTips?: string[];
  commonMistakes?: string[];
  breathing?: string | null;
  media?: ApiMedia | null;
}

export interface ApiWorkoutExercise {
  id: string;
  exerciseId: string;
  displayOrder: number;
  prescribedSets: number;
  repMin: number | null;
  repMax: number | null;
  durationSeconds: number | null;
  restSeconds: number;
  notes: string | null;
  exercise: ApiExercise;
}

export interface ApiWorkout {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  goal: string;
  estimatedMinutes: number;
  isPremium: boolean;
  mediaAssetId: string | null;
  access: { isLocked: boolean };
  exercises: ApiWorkoutExercise[];
  media?: ApiMedia | null;
}

export interface ApiTrainingPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  goal: string;
  daysPerWeek: number;
  isPremium: boolean;
  access: { isLocked: boolean };
  workouts: { dayNumber: number; displayOrder: number; workout: ApiWorkout }[];
}

export interface ApiStory {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: string | null;
  category: string;
  isPremium: boolean;
  priority: number;
  startsAt: string | null;
  expiresAt: string | null;
  mediaType: 'NONE' | 'IMAGE' | 'VIDEO';
  media: ApiMedia;
  cta: { label: string; type: string; target: string | null } | null;
  access: { isLocked: boolean };
  viewed: boolean;
  completed: boolean;
}

export interface ApiGymProfile {
  experienceLevel: string;
  primaryGoal: string;
  availableMinutes: number;
  daysPerWeek: number;
  trainingLocation: string;
  availableEquipment: string[];
  bodyWeightKg: string | number | null;
  ageYears?: number | null;
  currentAge?: number | null;
}

export interface ApiGymPreferences { units: 'auto' | 'metric' | 'imperial'; notificationsEnabled: boolean; restTimerEnabled: boolean; defaultRestSeconds: number }
export interface ApiUserPreferences { language: string; timezone: string; units: 'metric' | 'imperial'; notificationsEnabled: boolean }

export interface ApiSessionSet {
  id: string;
  setNumber: number;
  mode: string;
  weightKg: string | number | null;
  reps: number | null;
  durationSeconds: number | null;
  completed: boolean;
  completedAt: string | null;
}

export interface ApiSessionExercise {
  id: string;
  exerciseId: string | null;
  nameSnapshot: string;
  displayOrder: number;
  origin?: 'plan' | 'replacement' | 'added';
  replacedFromId?: string | null;
  prescriptionSnapshot: { prescribedSets: number; repMin: number | null; repMax: number | null; durationSeconds: number | null; restSeconds: number; mode: 'strength' | 'bodyweight_reps' | 'timed' };
  sets: ApiSessionSet[];
}

export interface ApiWorkoutSession {
  id: string;
  workoutId: string | null;
  trainingPlanId: string | null;
  nameSnapshot: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startedAt: string;
  completedAt: string | null;
  activeDurationMs: number;
  revision: number;
  exercises: ApiSessionExercise[];
  newAchievements?: ApiAchievement[];
}

export interface ApiAchievement { id: string; code: string; title: string; description: string; icon: string | null; category: string; unlockedAt?: string | null }

export interface ApiProgress {
  timezone: string;
  totalSessions: number;
  totalMinutes: number;
  completedSets: number;
  totalVolumeKg: number;
  week: { sessions: number; minutes: number };
  streak: { current: number; longest: number };
  weeklyActivity: { date: string; sessions: number; minutes: number; isToday: boolean }[];
  monthlyActivity: { date: string; sessions: number; isToday: boolean; inFuture: boolean }[];
  muscleDistribution: { muscle: string; sets: number }[];
  exerciseFrequency: { exerciseId: string; name: string; sessions: number; sets: number }[];
  personalRecords: { exerciseId: string; name: string; maxWeightKg: number | null; repsAtMax: number | null; maxReps: number | null; achievedAt: string }[];
  history: { id: string; workoutId: string | null; name: string; completedAt: string; minutes: number; sets: number; exercises: number }[];
  achievements: ApiAchievement[];
  gymStreak?: { current: number; longest: number };
  fitness?: import('@/types/domain').Fitness;
  access: ApiAccess;
}

export interface ApiPlanDay { weekday: number; date: string; status: 'completed' | 'today' | 'upcoming' | 'missed' | 'rest' | 'not_started'; dayNumber: number | null; workout: ApiWorkout | null }
export interface ApiWeekPlan {
  timezone: string;
  assignment: { id: string; source: 'AUTO' | 'ADMIN'; assignedAt: string; startDate: string } | null;
  plan: { id: string; slug: string; name: string; description: string | null; goal: string; difficulty: 'beginner' | 'intermediate' | 'advanced'; daysPerWeek: number; isPremium: boolean; media?: ApiMedia | null } | null;
  days: ApiPlanDay[];
  today: ApiPlanDay | null;
}
export interface ApiRecommendations { strategy: string; generatedAt: string; items: { score: number; reasons: string[]; workout: ApiWorkout }[] }
export interface ApiNotificationPreferences { workoutReminder: boolean; motivation: boolean; stories: boolean; weeklyChallenge: boolean; achievement: boolean; newContent: boolean; trial: boolean; subscription: boolean; reminderHour: number; reminderMinute: number }

export interface ApiErrorBody { error?: { status: number; message: string; requestId?: string } }

import type { SupportCategory } from '@/types/support';
import { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ActivityType } from '@/types/domain';

export type MainTabParamList = {
  Home: undefined;
  Workout: undefined;
  Explore: { muscle?: string } | undefined;
  /** FREE activity tracking (runs, walks, hikes, treks, yoga). */
  Activity: undefined;
  Progress: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList>;
  WorkoutDetail: { workoutId: string };
  /** With `workoutId`, the screen offers Previous/Next through that workout's exercises. */
  ExerciseDetail: { exerciseId: string; workoutId?: string; shared?: boolean };
  WorkoutPlayer: { workoutId: string };
  WorkoutComplete: { sessionId: string; name: string; minutes: number; sets: number; exercises: number; newAchievements: string[] };
  /** Plays one category's stories; `startId` alone (deep link) plays that story's category from that story. */
  StoryViewer: { category?: string; startId?: string };
  Upgrade: { onboarding?: boolean } | undefined;
  TrainingPreferences: undefined;
  /** Daily calorie / macro targets (estimates) and their calculation details. */
  NutritionGoals: undefined;
  /** Profile → Body composition (body fat history, manual / Navy / health entries). */
  BodyComposition: undefined;
  NotificationSettings: undefined;
  LanguageSettings: undefined;
  Favorites: undefined;
  History: undefined;
  Achievements: undefined;
  Legal: { topic: 'privacy' | 'terms' | 'help' };
  /** Free utilities (Settings → Utilities); never gated by Pro or trial. */
  WaterIntake: undefined;
  Stopwatch: undefined;
  NotesReminders: { reminderId?: string } | undefined;
  /** Profile → Support & Feedback / Business & Partnerships. */
  HelpSupport: undefined;
  SupportNewTicket: { category?: SupportCategory } | undefined;
  SupportTicket: { ticketId: string };
  SendFeedback: undefined;
  PartnerWithUs: undefined;
  ReferEarn: undefined;
  /** Profile & settings (reached from the Home avatar and the Progress header). */
  Profile: undefined;
  /** Activity module (FREE). */
  ActivityStart: { type?: ActivityType } | undefined;
  /** With `type`, runs the 5-4-3-2-1-GO countdown and starts; without, shows the current session. */
  ActivityLive: { type?: ActivityType } | undefined;
  ActivitySummary: undefined;
  ActivityHistory: undefined;
  ActivityDetail: { activityId: string };
  ActivitySettings: undefined;
  ConnectedHealth: undefined;
  Units: undefined;
};

export type RootScreenProps<K extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, K>;

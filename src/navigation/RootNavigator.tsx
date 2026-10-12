import React, { useEffect, useRef, useState } from 'react';
import { AppState, Easing } from 'react-native';
import Constants from 'expo-constants';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabNavigationOptions, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '@/features/home/HomeScreen';
import { WorkoutPlanScreen } from '@/features/workouts/WorkoutPlanScreen';
import { WorkoutDetailScreen } from '@/features/workouts/WorkoutDetailScreen';
import { ExploreScreen } from '@/features/exercises/ExploreScreen';
import { ExerciseDetailScreen } from '@/features/exercises/ExerciseDetailScreen';
import { ProgressScreen } from '@/features/progress/ProgressScreen';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { AchievementsScreen, FavoritesScreen, HistoryScreen, LanguageSettingsScreen, LegalScreen, NotificationSettingsScreen, TrainingPreferencesScreen } from '@/features/profile/SettingsScreens';
import { WorkoutPlayerScreen } from '@/features/player/WorkoutPlayerScreen';
import { WorkoutCompleteScreen } from '@/features/player/WorkoutCompleteScreen';
import { StoryViewerScreen } from '@/features/stories/StoryViewerScreen';
import { UpgradeView } from '@/features/subscription/UpgradeScreen';
import { StopwatchScreen } from '@/features/utilities/StopwatchScreen';
import { ReferEarnScreen } from '@/features/referral/ReferEarnScreen';
import { WaterIntakeScreen } from '@/features/utilities/WaterIntakeScreen';
import { NotesRemindersScreen } from '@/features/utilities/NotesRemindersScreen';
import { HelpSupportScreen } from '@/features/support/HelpSupportScreen';
import { SupportNewTicketScreen, SupportTicketScreen } from '@/features/support/SupportTicketScreens';
import { SendFeedbackScreen } from '@/features/support/FeedbackScreen';
import { PartnerScreen } from '@/features/support/PartnerScreen';
import { NutritionGoalsScreen } from '@/features/nutrition/NutritionGoalsScreen';
import { BodyCompositionScreen } from '@/features/nutrition/BodyCompositionScreen';
import { ActivityScreen } from '@/features/activity/ActivityScreen';
import { ActivityStartScreen } from '@/features/activity/ActivityStartScreen';
import { ActivityLiveScreen } from '@/features/activity/ActivityLiveScreen';
import { ActivitySummaryScreen } from '@/features/activity/ActivitySummaryScreen';
import { ActivityHistoryScreen } from '@/features/activity/ActivityHistoryScreen';
import { ActivityDetailScreen } from '@/features/activity/ActivityDetailScreen';
import { ActivitySettingsScreen } from '@/features/activity/ActivitySettingsScreen';
import { ConnectedHealthScreen } from '@/features/activity/ConnectedHealthScreen';
import { UnitsScreen } from '@/features/activity/UnitsScreen';
import { tracker } from '@/features/activity/tracker';
import { healthSync } from '@/services/health/sync';
import { useInvalidateActivities } from '@/hooks/queries';
import { usePreferences, useProfile, useUpdatePreferences } from '@/hooks/queries';
import { useWater } from '@/services/storage/water';
import { useRepos } from '@/store/session';
import { useI18n } from '@/i18n';
import { preloadSounds } from '@/services/sounds';
import { askForPushOnce, onNotificationOpened, onPushTokenChanged, syncDevice, syncPersonalReminders, syncWaterReminders, syncWorkoutReminder } from '@/services/notifications';
import { useOrganizer } from '@/services/storage/organizer';
import { localState } from '@/services/storage/localState';
import { navigationRef, openLink } from './deepLinks';
import { onPendingRoute, takePendingRoute } from '@/services/storage/pendingLink';
import { palette } from '@/theme';
import { CapsuleTabBar } from './CapsuleTabBar';
import { useReducedMotion } from '@/utils/motion';
import { durations } from '@/theme';
import { MainTabParamList, RootScreenProps, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: palette.canvas, primary: palette.accent, card: palette.surface, text: palette.ink, border: palette.line } };

/**
 * Tab content transition: a short cross-fade with a 14 px drift toward the tab you picked, on the native
 * driver and timed with the dock's sliding pill. Screens stay mounted (scroll position and state survive);
 * with Reduce Motion on, tabs switch instantly.
 */
const tabTransition: BottomTabNavigationOptions = {
  transitionSpec: { animation: 'timing', config: { duration: durations.standard, easing: Easing.out(Easing.cubic) } },
  sceneStyleInterpolator: ({ current }) => ({
    sceneStyle: {
      opacity: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
      transform: [{ translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-14, 0, 14] }) }],
    },
  }),
};

function MainTabs() {
  const reducedMotion = useReducedMotion();
  // Workout sits in the centre slot so its raised button is truly central. Profile lives on the
  // stack (Home avatar / Progress header) so Activity can be a primary destination.
  return <Tabs.Navigator tabBar={(props) => <CapsuleTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: palette.canvas }, ...(reducedMotion ? { animation: 'none' } : tabTransition) }}>
    <Tabs.Screen name="Home" component={HomeScreen} />
    <Tabs.Screen name="Explore" component={ExploreScreen} />
    <Tabs.Screen name="Workout" component={WorkoutPlanScreen} />
    <Tabs.Screen name="Activity" component={ActivityScreen} />
    <Tabs.Screen name="Progress" component={ProgressScreen} />
  </Tabs.Navigator>;
}

/**
 * Activity lifecycle outside any one screen:
 *  - restores a live session after a relaunch (and restarts GPS if the OS stopped it), then opens it;
 *  - syncs Apple Health / Health Connect when the app comes to the foreground (throttled in the sync).
 */
function ActivitySync() {
  const { gym } = useRepos();
  const invalidate = useInvalidateActivities();
  const opened = useRef(false);
  useEffect(() => {
    tracker.recover().then((session) => {
      if (opened.current || !session) return;
      opened.current = true;
      const open = () => {
        if (!navigationRef.isReady()) { setTimeout(open, 200); return; }
        navigationRef.navigate(session.tracker.status === 'finished' ? 'ActivitySummary' : 'ActivityLive');
      };
      open();
    }).catch(() => undefined);
  }, []);
  useEffect(() => {
    const run = () => healthSync.run(gym).then((r) => { if (r && (r.imported || r.matched)) invalidate(); }).catch(() => undefined);
    run();
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') run(); });
    return () => sub.remove();
  }, [gym]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function UpgradeRoute({ navigation }: RootScreenProps<'Upgrade'>) {
  return <UpgradeView onContinue={() => navigation.goBack()} onClose={() => navigation.goBack()} />;
}

/**
 * Registers this installation with HealthyMe (push token, time zone, locale) and keeps the local
 * daily reminder only for devices the server can't push to. Also routes tapped notifications.
 */
function DeviceSync() {
  const { gym } = useRepos();
  const prefs = usePreferences();
  const { dictionary, language } = useI18n();
  const updatePrefs = useUpdatePreferences();
  const [serverPush, setServerPush] = useState<boolean | null>(null);
  const [tokenVersion, setTokenVersion] = useState(0);
  const permissionAsked = prefs.data?.notificationsEnabled;
  // One permission prompt per installation, once the user is in the app. Allowing it also switches the
  // account's notifications on (the server sends nothing while that master switch is off).
  const prompted = useRef(false);
  useEffect(() => {
    if (!prefs.data || prompted.current) return;
    prompted.current = true;
    askForPushOnce().then((result) => {
      if (result === 'granted-now' && !prefs.data?.notificationsEnabled) updatePrefs.mutate({ notificationsEnabled: true });
      else if (result === 'granted-now') setTokenVersion((v) => v + 1);
    }).catch(() => undefined);
  }, [prefs.data, updatePrefs]);
  useEffect(() => onPushTokenChanged(() => setTokenVersion((v) => v + 1)), []);
  useEffect(() => {
    syncDevice((input) => gym.registerDevice(input), language, Constants.expoConfig?.version ?? '0.0.0').then((r) => setServerPush(r.serverPush)).catch(() => setServerPush(false));
  }, [gym, language, permissionAsked, tokenVersion]);
  useEffect(() => {
    if (prefs.data && serverPush !== null) syncWorkoutReminder(prefs.data.notificationsEnabled, prefs.data.notifications, { title: dictionary.notifications.reminderTitle, body: dictionary.notifications.reminderBody }, serverPush);
  }, [dictionary.notifications.reminderBody, dictionary.notifications.reminderTitle, prefs.data, serverPush]);
  useEffect(() => onNotificationOpened(openLink), []);
  // Links from outside the app (shared exercises, invites, mail): FirstRunGate captures them — including
  // while signed out — and the signed-in navigator opens them here, once, then clears them.
  useEffect(() => {
    const open = () => { takePendingRoute().then((url) => { if (url) openLink(url); }).catch(() => undefined); };
    open();
    return onPendingRoute(open);
  }, []);
  return null;
}

/**
 * Keeps the device-only water reminders in step with today’s intake, the goal and the reminder
 * settings: re-planned (debounced) on every change and when the date rolls over, so reminders stop
 * once the goal is reached and resume the next day. Free for everyone: no access check.
 */
function WaterReminderSync() {
  const profile = useProfile();
  const water = useWater(profile.data?.weightKg ?? profile.data?.bodyWeightKg);
  const { dictionary } = useI18n();
  const { title, body, progress } = { title: dictionary.notifications.waterTitle, body: dictionary.notifications.waterBody, progress: dictionary.notifications.waterProgress };
  const { enabled, startMin, endMin, intervalMin } = water.reminder;
  // Load the water-added sound once after sign-in so the first tap plays without delay.
  useEffect(() => { preloadSounds(); }, []);
  useEffect(() => {
    if (!water.loaded) return;
    const timer = setTimeout(() => { syncWaterReminders({ enabled, startMin, endMin, intervalMin }, water.ml, water.goalMl, { title, body, progress }); }, 800);
    return () => clearTimeout(timer);
  }, [water.loaded, water.ml, water.goalMl, water.today, enabled, startMin, endMin, intervalMin, title, body, progress]);
  return null;
}

/** Restores and refreshes private local reminders on sign-in, foreground, edits, timezone changes, and reinstall recovery. */
function PersonalReminderSync() {
  const organizer = useOrganizer(); const { gym } = useRepos();
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!organizer.loaded) return;
    const timer = setTimeout(() => {
      syncPersonalReminders(organizer.reminders, organizer.categories, organizer.config?.notificationTemplates).then(async (schedules) => {
        const installationId = await localState.installationId();
        await Promise.all(schedules.filter((s) => !s.reminderId.startsWith('local-')).map((s) => gym.saveReminderSchedule(s.reminderId, { installationId, timezone, notificationIds: s.notificationIds, scheduledThrough: s.scheduledThrough }).catch(() => undefined)));
      }).catch(() => undefined);
    }, 900);
    return () => clearTimeout(timer);
  }, [gym, organizer.loaded, organizer.reminders, organizer.categories, organizer.config?.notificationTemplates, timezone]);
  return null;
}

export function RootNavigator() {
  return <NavigationContainer ref={navigationRef} theme={theme}>
    <DeviceSync />
    <WaterReminderSync />
    <PersonalReminderSync />
    <ActivitySync />
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: palette.lavenderBg } }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <Stack.Screen name="WorkoutPlayer" component={WorkoutPlayerScreen} options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="WorkoutComplete" component={WorkoutCompleteScreen} options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
      <Stack.Screen name="Upgrade" component={UpgradeRoute} options={{ presentation: 'modal' }} />
      <Stack.Screen name="TrainingPreferences" component={TrainingPreferencesScreen} />
      <Stack.Screen name="NutritionGoals" component={NutritionGoalsScreen} />
      <Stack.Screen name="BodyComposition" component={BodyCompositionScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="LanguageSettings" component={LanguageSettingsScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Legal" component={LegalScreen} />
      <Stack.Screen name="WaterIntake" component={WaterIntakeScreen} />
      <Stack.Screen name="Stopwatch" component={StopwatchScreen} />
      <Stack.Screen name="NotesReminders" component={NotesRemindersScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="SupportNewTicket" component={SupportNewTicketScreen} />
      <Stack.Screen name="SupportTicket" component={SupportTicketScreen} />
      <Stack.Screen name="SendFeedback" component={SendFeedbackScreen} />
      <Stack.Screen name="PartnerWithUs" component={PartnerScreen} />
      <Stack.Screen name="ReferEarn" component={ReferEarnScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ActivityStart" component={ActivityStartScreen} />
      <Stack.Screen name="ActivityLive" component={ActivityLiveScreen} options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="ActivitySummary" component={ActivitySummaryScreen} options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="ActivityHistory" component={ActivityHistoryScreen} />
      <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} />
      <Stack.Screen name="ActivitySettings" component={ActivitySettingsScreen} />
      <Stack.Screen name="ConnectedHealth" component={ConnectedHealthScreen} />
      <Stack.Screen name="Units" component={UnitsScreen} />
    </Stack.Navigator>
  </NavigationContainer>;
}

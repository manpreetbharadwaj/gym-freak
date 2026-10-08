import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import Constants from 'expo-constants';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
import { usePreferences, useProfile } from '@/hooks/queries';
import { useWater } from '@/services/storage/water';
import { useRepos } from '@/store/session';
import { useI18n } from '@/i18n';
import { onNotificationOpened, syncDevice, syncWaterReminders, syncWorkoutReminder } from '@/services/notifications';
import { navigationRef, openLink } from './deepLinks';
import { onPendingRoute, takePendingRoute } from '@/services/storage/pendingLink';
import { palette } from '@/theme';
import { CapsuleTabBar } from './CapsuleTabBar';
import { MainTabParamList, RootScreenProps, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: palette.canvas, primary: palette.accent, card: palette.surface, text: palette.ink, border: palette.line } };

function MainTabs() {
  // Workout sits in the centre slot so its raised button is truly central. Profile lives on the
  // stack (Home avatar / Progress header) so Activity can be a primary destination.
  return <Tabs.Navigator tabBar={(props) => <CapsuleTabBar {...props} />} screenOptions={{ headerShown: false, animation: 'shift' }}>
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
  const [serverPush, setServerPush] = useState<boolean | null>(null);
  const permissionAsked = prefs.data?.notificationsEnabled;
  useEffect(() => {
    syncDevice((input) => gym.registerDevice(input), language, Constants.expoConfig?.version ?? '0.0.0').then((r) => setServerPush(r.serverPush)).catch(() => setServerPush(false));
  }, [gym, language, permissionAsked]);
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
  useEffect(() => {
    if (!water.loaded) return;
    const timer = setTimeout(() => { syncWaterReminders({ enabled, startMin, endMin, intervalMin }, water.ml, water.goalMl, { title, body, progress }); }, 800);
    return () => clearTimeout(timer);
  }, [water.loaded, water.ml, water.goalMl, water.today, enabled, startMin, endMin, intervalMin, title, body, progress]);
  return null;
}

export function RootNavigator() {
  return <NavigationContainer ref={navigationRef} theme={theme}>
    <DeviceSync />
    <WaterReminderSync />
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
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="LanguageSettings" component={LanguageSettingsScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Legal" component={LegalScreen} />
      <Stack.Screen name="WaterIntake" component={WaterIntakeScreen} />
      <Stack.Screen name="Stopwatch" component={StopwatchScreen} />
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

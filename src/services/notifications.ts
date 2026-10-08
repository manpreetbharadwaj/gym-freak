import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { DeviceRegistration, NotificationPreferences } from '@/types/domain';
import { litres, reminderSlots, WaterReminder } from '@/utils/water';

/**
 * Notification architecture.
 * - Remote: the installation registers with HealthyMe (`PUT /me/gym/devices`) with its Expo push
 *   token, time zone and locale. Category preferences live on the server, which targets and sends
 *   pushes (stories, weekly challenge, trial ending, achievements, workout reminders).
 * - Local: the rest-timer alert, and the daily workout reminder only when the server can't push
 *   to this device (no token, or no push provider configured) — never both.
 * - Taps open the deep link in the payload (`gymfreak://workout/<id>`, `story/<id>`, …).
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const REMINDER_ID = 'gymfreak.workout-reminder';

export async function notificationPermission(request = false): Promise<'granted' | 'denied' | 'undetermined'> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || !request || !current.canAskAgain) return current.granted ? 'granted' : current.canAskAgain ? 'undetermined' : 'denied';
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted ? 'granted' : 'denied';
}

async function ensureChannel() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('training', { name: 'Training', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 200, 120, 200] });
}

/** Fires when a rest period ends while the app is in the background. Returns an id to cancel. */
export async function scheduleRestEnd(seconds: number, body: string): Promise<string | null> {
  if ((await notificationPermission()) !== 'granted' || seconds < 3) return null;
  await ensureChannel();
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Gym Freak', body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(seconds), channelId: 'training' },
  }).catch(() => null);
}

export function cancelScheduled(id: string | null) {
  if (id) Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}

/** Re-syncs the on-device daily reminder; skipped when the server already sends reminders to this device. */
export async function syncWorkoutReminder(enabled: boolean, prefs: NotificationPreferences, copy: { title: string; body: string }, serverPush = false) {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => undefined);
  if (serverPush || !enabled || !prefs.workoutReminders || (await notificationPermission()) !== 'granted') return;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: { title: copy.title, body: copy.body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: prefs.reminderHour, minute: prefs.reminderMinute ?? 0, channelId: 'training' },
  }).catch(() => undefined);
}

/** Expo push token when permission is granted and the build can issue one (not on simulators / without an EAS project). */
async function pushToken(): Promise<string | null> {
  if ((await notificationPermission()) !== 'granted') return null;
  try {
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
    return (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  } catch {
    return null;
  }
}

/** Registers this installation with HealthyMe; resolves whether the server delivers pushes here. */
export async function syncDevice(register: (input: DeviceRegistration) => Promise<{ serverPush: boolean }>, locale: string, appVersion: string) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return register({ pushToken: await pushToken(), timezone, locale, appVersion });
}

/** Routes a tapped push to its deep link. Returns the unsubscribe function. */
export function onNotificationOpened(open: (url: string) => void) {
  const handle = (response: Notifications.NotificationResponse | null) => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url === 'string') open(url);
  };
  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => undefined);
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}

const WATER_PREFIX = 'gymfreak.water';
let waterSync: Promise<void> = Promise.resolve();

/**
 * Device-only hydration reminders (water is tracked locally; there is no server category for it).
 * Each sync cancels every pending water reminder (including the old fixed 10/13/16/19 h ones) and
 * schedules dated ones from `reminderSlots`: every interval between start and end, skipping the rest
 * of today once the goal is met. Syncs are serialised, so rapid changes never leave duplicates.
 */
export function syncWaterReminders(reminder: WaterReminder, todayMl: number, goalMl: number, copy: { title: string; body: string; progress: string }) {
  waterSync = waterSync.then(async () => {
    const pending = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    await Promise.all(pending.filter((n) => n.identifier.startsWith(WATER_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => undefined)));
    if (!reminder.enabled || (await notificationPermission()) !== 'granted') return;
    await ensureChannel();
    const now = new Date();
    const today = now.toDateString();
    const progress = copy.progress.replace('{amount}', `${litres(todayMl)} L`);
    await Promise.all(reminderSlots(reminder, todayMl, goalMl, now).map((at) => Notifications.scheduleNotificationAsync({
      identifier: `${WATER_PREFIX}.${at.getTime()}`,
      content: { title: copy.title, body: at.toDateString() === today && todayMl > 0 ? progress : copy.body, data: { url: 'gymfreak://water' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: 'training' },
    }).catch(() => undefined)));
  }).catch(() => undefined);
  return waterSync;
}

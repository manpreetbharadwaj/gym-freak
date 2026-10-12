import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { getLocales } from 'expo-localization';
import { Platform } from 'react-native';
import { safeStorage } from '@/services/storage/safeStorage';
import { DeviceRegistration, NotificationPreferences } from '@/types/domain';
import type { PersonalReminder, ReminderCategory } from '@/types/domain';
import { completeReminderFromNotification, snoozeReminderFromNotification } from '@/services/storage/organizer';
import { nextReminderOccurrences } from '@/services/reminderSchedule';
import { litres, reminderSlots, WaterReminder } from '@/utils/water';

/**
 * Notification architecture.
 * - Remote: the installation registers with HealthyMe (`PUT /me/gym/devices`) with its Expo push
 *   token, time zone and locale. Category preferences live on the server, which targets and sends
 *   pushes (stories, weekly challenge, trial ending, achievements, workout reminders).
 * - Local: the rest-timer alert, and the daily workout reminder only when the server can't push
 *   to this device (no token, or no push provider configured) — never both.
 * - Taps open the deep link in the payload (`gymfreak://workout/<id>`, `story/<id>`, …).
 * - Permission is asked once, after sign-in (`askForPushOnce`); later changes go through Settings.
 * - Android: remote pushes arrive on the `default` channel (the server sends channelId "default").
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
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('training', { name: 'Training', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 200, 120, 200] });
  // Server pushes (stories, reminders, campaigns). Android 13+ only shows the permission prompt once a channel exists.
  await Notifications.setNotificationChannelAsync('default', { name: 'Updates', importance: Notifications.AndroidImportance.HIGH });
  await Notifications.setNotificationChannelAsync('personal-reminders', { name: 'Personal reminders', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 180, 100, 180], lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE });
}

const PROMPTED_KEY = 'pushPrompted.v1';

/**
 * Asks for notification permission at most once per installation (and never when the OS says it can't ask
 * again). Resolves 'granted-now' only when this call turned it on, so the caller can switch the account's
 * notifications on to match.
 */
export async function askForPushOnce(): Promise<'granted-now' | 'granted' | 'denied' | 'skipped'> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain || (await safeStorage.get<boolean>(PROMPTED_KEY, false))) return 'skipped';
  await safeStorage.set(PROMPTED_KEY, true);
  await ensureChannel();
  return (await Notifications.requestPermissionsAsync()).granted ? 'granted-now' : 'denied';
}

/** Region of the device (e.g. "IN"), when the OS reports one. */
export function deviceCountry(): string | null {
  const region = getLocales()[0]?.regionCode?.toUpperCase();
  return region && /^[A-Z]{2}$/.test(region) ? region : null;
}

/**
 * Calls `onChange` when the OS rotates this device's push token (re-register so the server never sends to a dead
 * one). expo-notifications also emits this event every time the app *requests* a token, so only a changed value
 * counts — otherwise registering (which requests the token) would trigger itself in a loop.
 */
let lastDeviceToken: string | null = null;
export function onPushTokenChanged(onChange: () => void) {
  const sub = Notifications.addPushTokenListener((token) => {
    const value = JSON.stringify(token.data);
    if (value === lastDeviceToken) return;
    const first = lastDeviceToken === null;
    lastDeviceToken = value;
    if (!first) onChange();
  });
  return () => sub.remove();
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
    await ensureChannel();
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
    return (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  } catch {
    return null;
  }
}

/** Registers this installation with HealthyMe; resolves whether the server delivers pushes here. */
export async function syncDevice(register: (input: DeviceRegistration) => Promise<{ serverPush: boolean }>, locale: string, appVersion: string) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return register({ pushToken: await pushToken(), timezone, locale, appVersion, country: deviceCountry() });
}

/** Routes a tapped push to its deep link. Returns the unsubscribe function. */
export function onNotificationOpened(open: (url: string) => void) {
  const handle = (response: Notifications.NotificationResponse | null) => {
    const data = response?.notification.request.content.data;
    const reminderId = typeof data?.reminderId === 'string' ? data.reminderId : null;
    const occurrenceAt = typeof data?.occurrenceAt === 'string' ? data.occurrenceAt : new Date().toISOString();
    if (reminderId && response?.actionIdentifier === 'reminder.done') { completeReminderFromNotification(reminderId, occurrenceAt); return; }
    const snooze = response?.actionIdentifier?.match(/^reminder\.snooze\.(5|10|15)$/)?.[1];
    if (reminderId && snooze) {
      const minutes = Number(snooze) as 5 | 10 | 15;
      snoozeReminderFromNotification(reminderId, occurrenceAt, minutes);
      const content = response!.notification.request.content;
      Notifications.scheduleNotificationAsync({
        identifier: `gymfreak.reminder.${reminderId}.snooze.${Date.now()}`,
        content: { title: content.title ?? 'Reminder', body: content.body ?? undefined, data: { ...data, occurrenceAt: new Date(Date.now() + minutes * 60_000).toISOString() }, categoryIdentifier: 'personal-reminder' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60, channelId: 'personal-reminders' },
      }).catch(() => undefined);
      return;
    }
    const url = response?.notification.request.content.data?.url;
    if (typeof url === 'string') open(url);
  };
  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => undefined);
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}

const PERSONAL_PREFIX = 'gymfreak.reminder.';
const categoryEmoji: Record<string, string> = { medication: '💊', hydration: '💧', sleep: '🌙', workout: '💪', nutrition: '🥗', personal: '📝', appointment: '📅', custom: '🔔' };

let personalSync: Promise<{ reminderId: string; notificationIds: string[]; scheduledThrough: string | null }[]> = Promise.resolve([]);
function safeTemplate(templates: Record<string, unknown> | undefined, key: string, fallback: string) {
  const value = templates?.[key];
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 240 ? value.trim() : fallback;
}
/** Rebuilds the private local schedule. Concrete dates preserve DST behavior and are capped below iOS's pending-notification limit. */
export function syncPersonalReminders(reminders: PersonalReminder[], categories: ReminderCategory[], templates?: Record<string, unknown>) {
  personalSync = personalSync.then(async () => {
    const pending = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    await Promise.all(pending.filter((n) => n.identifier.startsWith(PERSONAL_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => undefined)));
    if ((await notificationPermission()) !== 'granted') return [];
    await ensureChannel();
    await Notifications.setNotificationCategoryAsync('personal-reminder', [
      { identifier: 'reminder.done', buttonTitle: 'Mark as Done' },
      { identifier: 'reminder.snooze.5', buttonTitle: 'Snooze 5 min' },
      { identifier: 'reminder.snooze.10', buttonTitle: 'Snooze 10 min' },
      { identifier: 'reminder.snooze.15', buttonTitle: 'Snooze 15 min' },
      { identifier: 'reminder.open', buttonTitle: 'Open Reminder', options: { opensAppToForeground: true } },
    ]).catch(() => undefined);
    const byId = new Map(categories.map((category) => [category.id, category]));
    const result: { reminderId: string; notificationIds: string[]; scheduledThrough: string | null }[] = [];
    let remaining = 60;
    for (const reminder of reminders.filter((r) => r.status === 'ACTIVE' && r.notificationEnabled).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))) {
      const ids: string[] = []; const category = reminder.categoryId ? byId.get(reminder.categoryId) : undefined;
      const occurrences = nextReminderOccurrences(reminder, Math.min(24, remaining));
      for (const occurrence of occurrences) {
        if (remaining <= 0) break;
        const notifyAt = new Date(occurrence.getTime() - reminder.advanceMinutes * 60_000);
        if (notifyAt <= new Date()) continue;
        const id = `${PERSONAL_PREFIX}${reminder.id}.${occurrence.getTime()}`;
        const medicationPrivate = category?.systemKey === 'medication' && reminder.hideDescriptionOnLock;
        const displayTime = occurrence.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content: {
            title: medicationPrivate ? safeTemplate(templates, 'privateMedicationTitle', '💊 Medication reminder') : `${categoryEmoji[category?.systemKey ?? 'custom'] ?? '🔔'} ${reminder.title}`,
            body: medicationPrivate ? safeTemplate(templates, 'privateMedicationBody', 'Open Gym Freak to view this private reminder.') : reminder.description || safeTemplate(templates, 'defaultBody', 'Scheduled for {time}').replaceAll('{time}', displayTime),
            sound: true, categoryIdentifier: 'personal-reminder',
            data: { url: `gymfreak://reminder/${reminder.id}`, reminderId: reminder.id, occurrenceAt: occurrence.toISOString(), category: category?.systemKey ?? 'custom' },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notifyAt, channelId: 'personal-reminders' },
        }).then(() => ids.push(id)).catch(() => undefined);
        remaining -= 1;
      }
      result.push({ reminderId: reminder.id, notificationIds: ids, scheduledThrough: occurrences.at(-1)?.toISOString() ?? null });
    }
    return result;
  }).catch(() => []);
  return personalSync;
}

const WATER_PREFIX = 'gymfreak.water';
/**
 * Water reminders use their own Android channel because a channel's sound is fixed when it is first created:
 * the existing 'training' channel can't take the water-drop sound, so a new id is used. The sound file is bundled
 * natively (expo-notifications `sounds` plugin → iOS app bundle, Android res/raw); iOS needs PCM (.wav), not mp3.
 */
// Builds without res/raw/waterdrop created the earlier ids with the default sound, and Android never lets an app
// change a channel's sound (a deleted id even comes back with its old settings), so reminders use a new id and the
// earlier ones are removed. Bump the suffix again only if a channel is ever created without the sound.
const WATER_CHANNEL = 'water-reminders-v3';
const RETIRED_WATER_CHANNELS = ['water-reminders', 'water-reminders-v2'];
/** File in android/app/src/main/res/raw (and the iOS app bundle), via the expo-notifications `sounds` plugin. */
const WATER_SOUND = 'waterdrop.wav';

let waterChannelReady: Promise<void> | null = null;
/** Creates the channel once per launch (re-creating an existing channel is a no-op on Android anyway). */
function ensureWaterChannel() {
  if (Platform.OS !== 'android') return Promise.resolve();
  waterChannelReady ??= (async () => {
    await Promise.all(RETIRED_WATER_CHANNELS.map((id) => Notifications.deleteNotificationChannelAsync(id).catch(() => undefined)));
    await Notifications.setNotificationChannelAsync(WATER_CHANNEL, { name: 'Water reminders', importance: Notifications.AndroidImportance.DEFAULT, sound: WATER_SOUND, vibrationPattern: [0, 120] });
  })().catch((error) => { waterChannelReady = null; throw error; });
  return waterChannelReady;
}
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
    await ensureWaterChannel();
    const now = new Date();
    const today = now.toDateString();
    const progress = copy.progress.replace('{amount}', `${litres(todayMl)} L`);
    await Promise.all(reminderSlots(reminder, todayMl, goalMl, now).map((at) => Notifications.scheduleNotificationAsync({
      identifier: `${WATER_PREFIX}.${at.getTime()}`,
      // The OS plays the sound (foreground via the handler's shouldPlaySound, background/terminated natively),
      // honouring silent mode and Focus; the app never plays it a second time.
      content: { title: copy.title, body: at.toDateString() === today && todayMl > 0 ? progress : copy.body, data: { url: 'gymfreak://water' }, sound: WATER_SOUND },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: WATER_CHANNEL },
    }).catch(() => undefined)));
  }).catch(() => undefined);
  return waterSync;
}

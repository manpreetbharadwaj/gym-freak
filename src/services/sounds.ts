import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { localState } from '@/services/storage/localState';

/**
 * In-app sound effects (Settings → Sound effects). One player per sound, created on first use and reused, so a
 * sound starts without a load delay and rapid repeats restart it instead of stacking copies.
 *
 * Notification sounds are NOT played from here: the water reminder carries its own sound (`waterdrop.wav`,
 * bundled natively) and the OS plays it, foreground or background, under the device's sound / silent / focus
 * settings. Playing it in-app as well would double it.
 */

const SOURCES = {
  waterAdded: require('../assets/sound/waterGlass.mp3'),
  waterReminder: require('../assets/sound/waterdrop.mp3'),
} as const;
type SoundKey = keyof typeof SOURCES;

const players: Partial<Record<SoundKey, AudioPlayer>> = {};
let modeSet: Promise<void> | null = null;
/** Cached Sound effects preference (read once, updated by setSoundEffectsEnabled). */
let enabled: boolean | null = null;

/** Short UI sounds: honour the silent switch and mix with the user's music instead of stopping it. */
function ensureMode() {
  modeSet ??= setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => undefined);
  return modeSet;
}

function player(key: SoundKey) {
  return (players[key] ??= createAudioPlayer(SOURCES[key]));
}

async function effectsOn() {
  enabled ??= (await localState.preferences().catch(() => ({ soundEffects: true }))).soundEffects;
  return enabled;
}

/** Keeps the cache in step when the user flips the toggle. */
export function setSoundEffectsEnabled(value: boolean) {
  enabled = value;
}

async function play(key: SoundKey) {
  try {
    await ensureMode();
    const p = player(key);
    // Restart from the top rather than overlapping a second copy.
    if (p.playing) p.pause();
    await p.seekTo(0);
    p.play();
  } catch {
    // A sound effect must never break the action it accompanies.
  }
}

/** After a manual water entry has been recorded (never before, never on failure). */
export async function playWaterAddedSound() {
  if (await effectsOn()) await play('waterAdded');
}

/**
 * The reminder sound on demand (e.g. a preview). Delivered reminders already play it through the notification
 * itself, so this is never called from notification handlers.
 */
export async function playWaterReminderSound() {
  if (await effectsOn()) await play('waterReminder');
}

/** Warms the players during idle time so the first tap has no load delay. */
export function preloadSounds() {
  ensureMode();
  player('waterAdded');
}

/** Frees native audio resources (e.g. on sign-out). */
export function releaseSounds() {
  for (const key of Object.keys(players) as SoundKey[]) { players[key]?.remove(); delete players[key]; }
}

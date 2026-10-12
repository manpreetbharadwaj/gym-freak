import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * HapticService: one semantic vocabulary for every touch response in the app.
 *
 *  selection() — picking a tab, chip, option or radio
 *  light()     — ordinary taps on secondary controls
 *  medium()    — primary CTAs and state changes (start, pause, resume, finish)
 *  success()   — only after an operation actually succeeded (saved, logged, completed)
 *  warning()   — a destructive or attention-needing step (discard, end early)
 *  error()     — a failed operation
 *
 * iOS: UIKit feedback generators, which the system mutes when "System Haptics" is off.
 * Android: View.performHapticFeedback constants (no VIBRATE permission, follows the system
 * "Touch feedback" setting); success/warning/error use the vibration fallback below API 30, where the
 * semantic constants don't exist. A short de-duplication window stops one gesture firing twice
 * (e.g. a button press plus the screen's own success cue in the same frame) — the stronger one wins.
 */

type Kind = 'selection' | 'light' | 'medium' | 'success' | 'warning' | 'error';
const weight: Record<Kind, number> = { selection: 0, light: 1, medium: 2, warning: 3, error: 4, success: 4 };
const DEDUPE_MS = 80;

let enabled = true;
let last: { kind: Kind; at: number } | null = null;

const androidModern = Platform.OS === 'android' && Number(Platform.Version) >= 30;
const A = Haptics.AndroidHaptics;

function fire(kind: Kind) {
  if (!enabled || Platform.OS === 'web') return;
  const now = Date.now();
  if (last && now - last.at < DEDUPE_MS && weight[kind] <= weight[last.kind]) return;
  last = { kind, at: now };
  run(kind).catch(() => undefined);
}

function run(kind: Kind): Promise<void> {
  if (Platform.OS === 'android') {
    switch (kind) {
      case 'selection': return Haptics.performAndroidHapticsAsync(A.Segment_Tick);
      case 'light': return Haptics.performAndroidHapticsAsync(A.Virtual_Key);
      case 'medium': return Haptics.performAndroidHapticsAsync(A.Context_Click);
      case 'success': return androidModern ? Haptics.performAndroidHapticsAsync(A.Confirm) : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'warning': return androidModern ? Haptics.performAndroidHapticsAsync(A.Reject) : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      case 'error': return androidModern ? Haptics.performAndroidHapticsAsync(A.Reject) : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }
  switch (kind) {
    case 'selection': return Haptics.selectionAsync();
    case 'light': return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    case 'medium': return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    case 'success': return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    case 'warning': return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    case 'error': return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

export const HapticService = {
  selection: () => fire('selection'),
  light: () => fire('light'),
  medium: () => fire('medium'),
  success: () => fire('success'),
  warning: () => fire('warning'),
  error: () => fire('error'),
  /** App-level switch (e.g. a future in-app setting); the OS-level switches are honoured regardless. */
  setEnabled: (value: boolean) => { enabled = value; },
};

/** Legacy names kept so existing call sites read the same: select → selection, tap → light, press → medium. */
export const haptics = {
  ...HapticService,
  select: HapticService.selection,
  tap: HapticService.light,
  press: HapticService.medium,
};

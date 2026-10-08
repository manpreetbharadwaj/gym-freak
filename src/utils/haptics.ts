import * as Haptics from 'expo-haptics';

// Haptics are a nicety: never let an unsupported platform throw into the UI.
export const haptics = {
  select: () => { Haptics.selectionAsync().catch(() => undefined); },
  tap: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined); },
  press: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined); },
  success: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined); },
};

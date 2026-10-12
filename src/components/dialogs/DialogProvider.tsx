import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, findNodeHandle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, ReduceMotion, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Icon, IconName } from '@/components/Icon';
import { GradientButton, PressableScale, Txt } from '@/components/primitives';
import { fonts, gradients, palette, radius, shadow, space } from '@/theme';
import { haptics } from '@/utils/haptics';

export type DialogVariant = 'info' | 'success' | 'warning' | 'error' | 'confirm' | 'destructive';

export interface DialogOptions {
  title: string;
  description?: string;
  content?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  allowBackdropDismiss?: boolean;
  dedupeKey?: string;
  onConfirm?: () => void | Promise<void>;
}

interface QueuedDialog extends DialogOptions {
  id: number;
  variant: DialogVariant;
  resolve: (confirmed: boolean) => void;
}

export interface DialogApi {
  showAlert(options: DialogOptions): Promise<boolean>;
  showInfo(options: DialogOptions): Promise<boolean>;
  showSuccess(options: DialogOptions): Promise<boolean>;
  showWarning(options: DialogOptions): Promise<boolean>;
  showError(options: DialogOptions): Promise<boolean>;
  showConfirm(options: DialogOptions): Promise<boolean>;
  showDestructiveConfirm(options: DialogOptions): Promise<boolean>;
  dismissDialog(): void;
}

const Context = createContext<DialogApi | null>(null);
let boundManager: DialogApi | null = null;

/** Imperative bridge for non-React services. Components should prefer useDialog(). */
export const DialogManager: DialogApi = {
  showAlert: (o) => boundManager?.showAlert(o) ?? Promise.resolve(false),
  showInfo: (o) => boundManager?.showInfo(o) ?? Promise.resolve(false),
  showSuccess: (o) => boundManager?.showSuccess(o) ?? Promise.resolve(false),
  showWarning: (o) => boundManager?.showWarning(o) ?? Promise.resolve(false),
  showError: (o) => boundManager?.showError(o) ?? Promise.resolve(false),
  showConfirm: (o) => boundManager?.showConfirm(o) ?? Promise.resolve(false),
  showDestructiveConfirm: (o) => boundManager?.showDestructiveConfirm(o) ?? Promise.resolve(false),
  dismissDialog: () => boundManager?.dismissDialog(),
};

const visual: Record<DialogVariant, { icon: IconName; color: string }> = {
  info: { icon: 'info', color: palette.orange },
  success: { icon: 'checkCircle', color: palette.success },
  warning: { icon: 'alert', color: palette.yellow },
  error: { icon: 'closeCircle', color: palette.danger },
  confirm: { icon: 'help', color: palette.orange },
  destructive: { icon: 'delete', color: palette.danger },
};

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<QueuedDialog[]>([]);
  const nextId = useRef(1);
  const queueRef = useRef(queue);
  const pendingKeys = useRef(new Map<string, Promise<boolean>>());
  queueRef.current = queue;

  const enqueue = useCallback((variant: DialogVariant, options: DialogOptions) => {
    const key = options.dedupeKey;
    if (key && pendingKeys.current.has(key)) return pendingKeys.current.get(key)!;
    const promise = new Promise<boolean>((resolve) => {
      const finish = (confirmed: boolean) => { if (key) pendingKeys.current.delete(key); resolve(confirmed); };
      setQueue((current) => [...current, { ...options, variant, id: nextId.current++, resolve: finish }]);
    });
    if (key) pendingKeys.current.set(key, promise);
    return promise;
  }, []);
  const dismiss = useCallback((confirmed = false) => {
    setQueue((current) => {
      const [active, ...rest] = current;
      active?.resolve(confirmed);
      return rest;
    });
  }, []);
  const api = useMemo<DialogApi>(() => ({
    showAlert: (o) => enqueue('info', o), showInfo: (o) => enqueue('info', o),
    showSuccess: (o) => enqueue('success', o), showWarning: (o) => enqueue('warning', o),
    showError: (o) => enqueue('error', o), showConfirm: (o) => enqueue('confirm', o),
    showDestructiveConfirm: (o) => enqueue('destructive', o), dismissDialog: () => dismiss(false),
  }), [dismiss, enqueue]);

  useEffect(() => { boundManager = api; return () => {
    if (boundManager === api) boundManager = null;
    queueRef.current.forEach((item) => item.resolve(false)); pendingKeys.current.clear();
  }; }, [api]);

  return <Context.Provider value={api}>{children}<DialogView dialog={queue[0]} dismiss={dismiss} /></Context.Provider>;
}

export function useDialog() {
  const value = useContext(Context);
  if (!value) throw new Error('useDialog must be used inside DialogProvider');
  return value;
}

function DialogView({ dialog, dismiss }: { dialog?: QueuedDialog; dismiss: (confirmed?: boolean) => void }) {
  const titleRef = useRef<View>(null);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string>();
  const destructive = dialog?.variant === 'destructive';
  const cancellable = !!dialog && !pending && (dialog.variant === 'confirm' || destructive || dialog.allowBackdropDismiss === true);

  useEffect(() => {
    setPending(false); setFailure(undefined);
    if (!dialog) return;
    const timer = setTimeout(() => {
      const node = findNodeHandle(titleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 180);
    return () => clearTimeout(timer);
  }, [dialog?.id]);
  useEffect(() => {
    if (!dialog) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (cancellable) dismiss(false);
      return true;
    });
    return () => sub.remove();
  }, [cancellable, dialog, dismiss]);

  if (!dialog) return null;
  const tone = visual[dialog.variant];
  const confirm = async () => {
    if (pending) return;
    setPending(true); setFailure(undefined);
    try {
      await dialog.onConfirm?.();
      dialog.variant === 'success' ? haptics.success() : destructive ? haptics.warning() : haptics.medium();
      dismiss(true);
    } catch (error) {
      haptics.error();
      setFailure(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
      setPending(false);
    }
  };
  const hasCancel = dialog.variant === 'confirm' || destructive || !!dialog.cancelLabel;
  return <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={() => { if (cancellable) dismiss(false); }}>
    <Animated.View entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)} exiting={FadeOut.duration(140).reduceMotion(ReduceMotion.System)} style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} disabled={!cancellable} onPress={() => dismiss(false)} accessibilityElementsHidden />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center} pointerEvents="box-none">
        <Animated.View entering={SlideInDown.duration(260).reduceMotion(ReduceMotion.System)} exiting={SlideOutDown.duration(180).reduceMotion(ReduceMotion.System)} style={[styles.card, shadow('#000000', 1.3)]} accessibilityViewIsModal>
          <LinearGradient colors={['#1B1711', palette.surface, '#090D14']} style={styles.surface}>
            <View style={[styles.iconWell, { borderColor: `${tone.color}70`, backgroundColor: `${tone.color}16` }]}><Icon name={tone.icon} size={28} color={tone.color} /></View>
            <View ref={titleRef} accessible accessibilityRole="header"><Txt variant="title" align="center">{dialog.title}</Txt></View>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.copy} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {dialog.description ? <Txt color={palette.inkSoft} align="center">{dialog.description}</Txt> : null}
              {dialog.content}
              {failure ? <View style={styles.error}><Txt variant="small" color={palette.danger} align="center">{failure}</Txt></View> : null}
            </ScrollView>
            <View style={styles.actions}>
              {hasCancel ? <PressableScale onPress={() => dismiss(false)} disabled={pending} haptic="light" style={styles.secondary}><Txt variant="button" align="center">{dialog.cancelLabel ?? 'Cancel'}</Txt></PressableScale> : null}
              <GradientButton label={dialog.confirmLabel ?? 'OK'} onPress={confirm} loading={pending} gradient={destructive ? ['#FF6B7E', '#D83D58'] : ['#FF9F43', '#FFBE55']} style={styles.action} icon={destructive ? 'trash-can-outline' : 'check'} />
            </View>
          </LinearGradient>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000B8', padding: space.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { width: '100%', maxWidth: 430, maxHeight: '82%', borderRadius: radius.xl, borderWidth: 1, borderColor: '#FFB24A38', overflow: 'hidden' },
  surface: { padding: space.xl, gap: space.md },
  iconWell: { width: 52, height: 52, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  scroll: { flexGrow: 0, maxHeight: 360 }, copy: { gap: space.md },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs }, action: { flex: 1 },
  secondary: { minHeight: 52, flex: 1, borderRadius: 26, borderWidth: 1, borderColor: palette.lineStrong, backgroundColor: palette.surfaceRaised, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  error: { padding: space.sm, borderRadius: radius.sm, backgroundColor: '#FF6B7E14', borderWidth: 1, borderColor: '#FF6B7E44' },
});

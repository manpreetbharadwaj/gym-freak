import React, { useState } from 'react';
import { useI18n } from '@/i18n';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, TextInputProps, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glyph, GlyphIcon, mdi, Txt } from './primitives';
import { haptics } from '@/utils/haptics';
import { controls, fonts, palette, radius, shadow } from '@/theme';

export function TextField({ label, error, icon, secure, ...props }: TextInputProps & { label: string; error?: string; icon?: Glyph; secure?: boolean }) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const { dictionary } = useI18n();
  return <View style={{ gap: 6 }}>
    <Txt variant="label" color={palette.inkSoft}>{label}</Txt>
    <View style={[styles.field, focused && { borderColor: palette.violet }, !!error && { borderColor: palette.coral }, shadow(undefined, 0.35)]}>
      {icon ? <GlyphIcon glyph={icon} size={20} color={focused ? palette.violet : palette.inkFaint} /> : null}
      <TextInput {...props} secureTextEntry={secure && hidden} accessibilityLabel={label} placeholderTextColor={palette.inkFaint} selectionColor={palette.violet} onFocus={(e) => { setFocused(true); props.onFocus?.(e); }} onBlur={(e) => { setFocused(false); props.onBlur?.(e); }} style={styles.input} />
      {secure ? <Pressable hitSlop={10} onPress={() => setHidden(!hidden)} accessibilityRole="button" accessibilityLabel={hidden ? dictionary.common.showPassword : dictionary.common.hidePassword} testID={props.testID ? `${props.testID}-reveal` : undefined}><GlyphIcon glyph={mdi(hidden ? 'eye-outline' : 'eye-off-outline')} size={20} color={palette.inkMuted} /></Pressable> : null}
    </View>
    {error ? <Txt variant="small" color={palette.danger}>{error}</Txt> : null}
  </View>;
}

export function FilterChip({ label, active, onPress, color = palette.violet, glyph }: { label: string; active: boolean; onPress: () => void; color?: string; glyph?: Glyph }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => { haptics.select(); onPress(); }} style={({ pressed }) => [styles.chip, active ? [styles.chipActive, { borderColor: color, backgroundColor: `${color}1A` }, shadow(color, 0.35)] : null, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
    {glyph ? <GlyphIcon glyph={glyph} size={16} color={active ? color : palette.inkMuted} /> : null}
    <Txt variant="label" color={active ? palette.white : palette.inkSoft}>{label}</Txt>
  </Pressable>;
}

export function ToggleRow({ title, subtitle, value, onChange, glyph, color = palette.violet, testID }: { title: string; subtitle?: string; value: boolean; onChange: (value: boolean) => void; glyph?: Glyph; color?: string; testID?: string }) {
  return <View style={styles.row}>
    {glyph ? <View style={[styles.rowIcon, { backgroundColor: `${color}18` }]}><GlyphIcon glyph={glyph} size={20} color={color} /></View> : null}
    <View style={{ flex: 1 }}><Txt variant="row">{title}</Txt>{subtitle ? <Txt variant="small" color={palette.inkMuted}>{subtitle}</Txt> : null}</View>
    <Switch value={value} onValueChange={(next) => { haptics.select(); onChange(next); }} trackColor={{ false: palette.grayBg, true: palette.accent }} thumbColor={palette.white} ios_backgroundColor={palette.grayBg} accessibilityLabel={title} testID={testID} />
  </View>;
}

export function LinkRow({ title, value, onPress, glyph, color = palette.violet, danger }: { title: string; value?: string; onPress: () => void; glyph?: Glyph; color?: string; danger?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={() => { haptics.tap(); onPress(); }} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
    {glyph ? <View style={[styles.rowIcon, { backgroundColor: `${danger ? palette.coral : color}18` }]}><GlyphIcon glyph={glyph} size={20} color={danger ? palette.coral : color} /></View> : null}
    <Txt variant="row" color={danger ? palette.danger : palette.ink} style={{ flex: 1 }}>{title}</Txt>
    {value ? <Txt variant="small" color={palette.inkMuted} numberOfLines={1} style={{ maxWidth: '45%' }}>{value}</Txt> : null}
    {!danger ? <GlyphIcon glyph={mdi('chevron-right')} size={22} color={palette.inkFaint} /> : null}
  </Pressable>;
}

/** Slide-up sheet used for filters, exercise swaps and pickers. */
/** Modal sheet that rises above the keyboard, so search fields inside it stay usable. */
export function BottomSheet({ visible, onClose, title, children, footer }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { dictionary } = useI18n();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel={dictionary.common.close} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.grabber} />
        <View style={styles.sheetHeader}><Txt variant="title" style={{ flex: 1 }}>{title}</Txt><Pressable hitSlop={10} onPress={onClose} accessibilityRole="button" accessibilityLabel={dictionary.common.close}><GlyphIcon glyph={mdi('close-circle')} size={28} color={palette.inkFaint} /></Pressable></View>
        <ScrollView style={{ maxHeight: Math.min(520, height * 0.55) }} contentContainerStyle={{ gap: 12, paddingBottom: 8 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        {footer ? <View style={{ marginTop: 12 }}>{footer}</View> : null}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  field: { minHeight: controls.input.height, borderRadius: controls.input.radius, backgroundColor: palette.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderWidth: 1.5, borderColor: palette.line },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: palette.ink, paddingVertical: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  chipActive: { borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 8 },
  rowIcon: { width: controls.iconButton.sm, height: controls.iconButton.sm, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: palette.line },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,4,10,0.66)' },
  sheet: { backgroundColor: palette.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 10, borderWidth: StyleSheet.hairlineWidth * 2, borderBottomWidth: 0, borderColor: palette.lineStrong },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: palette.lineStrong, marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
});

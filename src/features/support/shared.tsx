import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ApiError } from '@/api/client';
import { PressableScale, Txt } from '@/components';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/i18n';
import { useRepos } from '@/store/session';
import { controls, palette, radius, shadow } from '@/theme';
import { logoPalette } from '@/theme/brandAccent';
import { LocalImage, SupportStatus } from '@/types/support';
import { AccentScope, AccentScopeProvider, DEFAULT_ACCENT_SCOPE } from '@/components/accentScope';

/** Help & Support uses the logo accent, like Home and the tab bar. */
export const accent = logoPalette.orange;
export const newClientId = () => Crypto.randomUUID();

/** Section links and other scope-aware pieces pick up the logo accent on these screens (nothing global changes). */
const supportScope: AccentScope = { ...DEFAULT_ACCENT_SCOPE, accent: logoPalette.orange, accentSoft: logoPalette.amber, onAccent: logoPalette.onAccent };
export const SupportScope = ({ children }: { children: React.ReactNode }) => <AccentScopeProvider value={supportScope}>{children}</AccentScopeProvider>;

export const supportKeys = { config: ['support', 'config'] as const, tickets: ['support', 'tickets'] as const, ticket: (id: string) => ['support', 'ticket', id] as const };
export const useSupportConfig = () => { const { support } = useRepos(); return useQuery({ queryKey: supportKeys.config, queryFn: () => support.config(), staleTime: 60_000 }); };
export const useTickets = () => { const { support } = useRepos(); return useQuery({ queryKey: supportKeys.tickets, queryFn: () => support.listTickets() }); };
export const useTicket = (id: string) => { const { support } = useRepos(); return useQuery({ queryKey: supportKeys.ticket(id), queryFn: () => support.getTicket(id) }); };

/** One user-facing sentence for any submit/upload failure (never raw server text). */
export function useSupportError() {
  const { dictionary } = useI18n();
  const copy = dictionary.support;
  return (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.kind === 'rate-limited') return copy.errors.rateLimited;
      if (error.message === 'unsupported-image') return copy.unsupportedImage;
      if (error.message === 'image-too-large') return copy.imageTooLarge;
      if (error.message === 'upload-failed') return copy.uploadFailed;
      if (error.kind === 'conflict') return copy.ticket.closedNote;
    }
    return copy.errors.generic;
  };
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

const mimeFor = (asset: ImagePicker.ImagePickerAsset) => {
  if (asset.mimeType) return asset.mimeType === 'image/jpg' ? 'image/jpeg' : asset.mimeType;
  const ext = (asset.fileName ?? asset.uri).split('.').pop()?.toLowerCase();
  return ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
};

/** Opens the system photo picker (no broad library permission needed on iOS 14+ / Android 13+). */
export async function pickImages(max: number): Promise<LocalImage[]> {
  if (max <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsMultipleSelection: max > 1, selectionLimit: max, quality: 0.7, exif: false,
    // HEIC → JPEG so the server (JPG/PNG/WebP only) accepts it.
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled) return [];
  return Promise.all(result.assets.slice(0, max).map(async (asset) => ({
    uri: asset.uri, mimeType: mimeFor(asset), name: asset.fileName ?? undefined, width: asset.width, height: asset.height,
    size: asset.fileSize ?? (await (await fetch(asset.uri)).blob()).size,
  })));
}

/** Thumbnails of picked screenshots with remove buttons, plus the add tile. */
export function AttachmentPicker({ images, onChange, max, disabled }: { images: LocalImage[]; onChange: (images: LocalImage[]) => void; max: number; disabled?: boolean }) {
  const { dictionary } = useI18n();
  const copy = dictionary.support;
  const add = async () => {
    try { onChange([...images, ...(await pickImages(max - images.length))].slice(0, max)); }
    catch { Alert.alert(copy.photoDenied); }
  };
  return <View style={styles.thumbs}>
    {images.map((image, i) => <View key={image.uri} style={styles.thumb}>
      <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <Pressable hitSlop={8} disabled={disabled} accessibilityRole="button" accessibilityLabel={copy.form.removeScreenshot} onPress={() => onChange(images.filter((_, j) => j !== i))} style={styles.remove}>
        <Icon name="close" size="xs" color={palette.white} />
      </Pressable>
    </View>)}
    {images.length < max ? <PressableScale onPress={add} disabled={disabled} haptic="light" accessibilityLabel={copy.form.addScreenshot} style={[styles.thumb, styles.addTile]}>
      <Icon name="imageAdd" size="md" color={accent} />
      <Txt variant="tab" color={palette.inkMuted} align="center">{copy.form.addScreenshot}</Txt>
    </PressableScale> : null}
  </View>;
}

/** A private attachment: fetched with the user's token, never via a public URL. */
export function PrivateImage({ url, size = 96 }: { url: string; size?: number }) {
  const { support } = useRepos();
  const [source, setSource] = useState<{ uri: string; headers: Record<string, string> } | null>(null);
  useEffect(() => { let alive = true; support.attachmentSource(url).then((s) => { if (alive) setSource(s); }).catch(() => undefined); return () => { alive = false; }; }, [support, url]);
  return <View style={[styles.thumb, { width: size, height: size }]}>
    {source ? <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" accessibilityIgnoresInvertColors /> : <ActivityIndicator color={palette.inkMuted} style={{ flex: 1 }} />}
  </View>;
}

const STATUS_COLOR: Record<SupportStatus, string> = { OPEN: logoPalette.amber, IN_PROGRESS: palette.aqua, WAITING_FOR_USER: logoPalette.orange, RESOLVED: palette.success, CLOSED: palette.inkMuted };
export function StatusPill({ status }: { status: SupportStatus }) {
  const { dictionary } = useI18n();
  const color = STATUS_COLOR[status];
  return <View style={[styles.pill, { backgroundColor: `${color}1F`, borderColor: `${color}55` }]}><View style={[styles.dot, { backgroundColor: color }]} /><Txt variant="tab" color={color}>{dictionary.support.statuses[status]}</Txt></View>;
}

/** Multi-line field styled like the app's TextField. */
export function TextArea({ label, error, hint, minHeight = 132, ...props }: TextInputProps & { label: string; error?: string; hint?: string; minHeight?: number }) {
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 6 }}>
    <Txt variant="label" color={palette.inkSoft}>{label}</Txt>
    <View style={[styles.area, { minHeight }, focused && { borderColor: accent }, !!error && { borderColor: palette.coral }, shadow(undefined, 0.35)]}>
      <TextInput multiline textAlignVertical="top" accessibilityLabel={label} placeholderTextColor={palette.inkFaint} selectionColor={accent} {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }} onBlur={(e) => { setFocused(false); props.onBlur?.(e); }} style={[styles.areaInput, { minHeight: minHeight - 24 }]} />
    </View>
    {error ? <Txt variant="small" color={palette.danger}>{error}</Txt> : hint ? <Txt variant="small" color={palette.inkMuted}>{hint}</Txt> : null}
  </View>;
}

/** Confirmation after the server acknowledged a submission (with its reference). */
export function SuccessPanel({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return <View style={styles.success} accessibilityLiveRegion="polite">
    <View style={[styles.successIcon, shadow(palette.success, 1)]}><Icon name="checkCircle" size="lg" color={palette.success} /></View>
    <Txt variant="title" align="center">{title}</Txt>
    <Txt variant="body" color={palette.inkMuted} align="center">{body}</Txt>
    <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 8 }}>{children}</View>
  </View>;
}

/** The “never share card numbers / CVV / passwords” notice. */
export function SafetyNote({ text }: { text: string }) {
  return <View style={styles.safety}><Icon name="lock" size="sm" color={logoPalette.amber} /><Txt variant="small" color={palette.inkSoft} style={{ flex: 1 }}>{text}</Txt></View>;
}

const styles = StyleSheet.create({
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: 88, height: 88, borderRadius: radius.md, overflow: 'hidden', backgroundColor: palette.surfaceRaised, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  addTile: { alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6, borderStyle: 'dashed', borderColor: `${accent}66` },
  remove: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  area: { borderRadius: controls.input.radius, backgroundColor: palette.surface, borderWidth: 1.5, borderColor: palette.line, paddingHorizontal: 14, paddingVertical: 12 },
  areaInput: { color: palette.ink, fontSize: 16, lineHeight: 22, padding: 0, ...(Platform.OS === 'android' ? { includeFontPadding: false } : null) },
  success: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  successIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: `${palette.success}1A`, borderWidth: 1, borderColor: `${palette.success}55` },
  safety: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: radius.md, backgroundColor: `${logoPalette.amber}12`, borderWidth: 1, borderColor: `${logoPalette.amber}33` },
});

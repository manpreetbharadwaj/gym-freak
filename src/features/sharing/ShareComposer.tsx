import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlyphIcon, GradientButton, mdi, PressableScale, Txt } from '@/components';
import { useDialog } from '@/components/dialogs/DialogProvider';
import { useI18n } from '@/i18n';
import { useRepos } from '@/store/session';
import { palette, radius, space } from '@/theme';
import { copyShareLink, renderShareCard, saveShareImage, shareCardFile, shareText } from './shareService';
import { ShareCard } from './ShareCard';
import { ShareCardFormat, ShareCardModel, SharePlatform, shareFormats, visibleShareMetrics } from './types';

const platforms: { id: SharePlatform; label: string; glyph: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp', glyph: 'whatsapp' }, { id: 'instagram', label: 'Instagram', glyph: 'instagram' },
  { id: 'facebook', label: 'Facebook', glyph: 'facebook' }, { id: 'snapchat', label: 'Snapchat', glyph: 'snapchat' },
  { id: 'tiktok', label: 'TikTok', glyph: 'music-note' }, { id: 'x', label: 'X', glyph: 'twitter' },
  { id: 'telegram', label: 'Telegram', glyph: 'send' }, { id: 'threads', label: 'Threads', glyph: 'at' },
  { id: 'more', label: 'More Apps', glyph: 'share-variant' },
];

export function ShareComposer({ visible, onClose, card, referral }: { visible: boolean; onClose: () => void; card: ShareCardModel; referral?: { code: string; link: string; active: boolean } | null }) {
  const insets = useSafeAreaInsets(); const dialog = useDialog(); const { dictionary } = useI18n(); const { gym } = useRepos();
  const ref = useRef<View>(null); const [format, setFormat] = useState<ShareCardFormat>('portrait'); const [busy, setBusy] = useState<string>();
  const [withReferral, setWithReferral] = useState(false); const [includeSensitive, setIncludeSensitive] = useState(false);
  const metricIds = useMemo(() => visibleShareMetrics(card.metrics, includeSensitive).map((m) => m.id), [card.metrics, includeSensitive]);
  const invite = withReferral && referral?.active ? referral : null;
  const track = (type: Parameters<typeof gym.trackShare>[0], platform?: SharePlatform) => gym.trackShare(type, undefined, invite?.code, { platform, contentType: card.kind, contentId: card.contentId });
  const perform = async (id: SharePlatform) => {
    setBusy(id); void track('share_platform_selected', id);
    try { const uri = await renderShareCard(ref, format); void track('share_card_generated', id); await shareCardFile(uri, card.title); void track('share_sheet_opened', id); }
    catch (error) { await dialog.showError({ title: dictionary.socialShare.failed, description: error instanceof Error ? error.message : dictionary.socialShare.tryAgain }); }
    finally { setBusy(undefined); }
  };
  const copy = async () => { if (!invite) return; await copyShareLink(invite.link); void track('share_link_copied'); await dialog.showSuccess({ title: dictionary.socialShare.linkCopied }); };
  const save = async () => { setBusy('save'); try { const uri = await renderShareCard(ref, format); void track('share_card_generated'); await saveShareImage(uri); void track('share_image_saved'); await dialog.showSuccess({ title: dictionary.socialShare.imageSaved }); } catch (error) { await dialog.showError({ title: dictionary.socialShare.failed, description: error instanceof Error ? error.message : dictionary.socialShare.tryAgain }); } finally { setBusy(undefined); } };
  const text = `${card.title}\n${card.statement}`;
  return <Modal visible={visible} transparent animationType="slide" onShow={() => void track('share_screen_opened')} onRequestClose={onClose}>
    <View style={styles.backdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.handle} /><View style={styles.header}><View style={{ flex: 1 }}><Txt variant="title">{dictionary.socialShare.title}</Txt><Txt variant="small" color={palette.inkMuted}>{dictionary.socialShare.privateNote}</Txt></View><PressableScale onPress={onClose} accessibilityRole="button" accessibilityLabel={dictionary.common.close}><GlyphIcon glyph={mdi('close')} size={24} color={palette.inkSoft} /></PressableScale></View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View ref={ref} collapsable={false}><ShareCard card={card} format={format} metrics={metricIds} referralCode={invite?.code} /></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formats}>{(Object.keys(shareFormats) as ShareCardFormat[]).map((id) => <PressableScale key={id} onPress={() => setFormat(id)} style={[styles.chip, format === id && styles.chipOn]}><Txt variant="label" color={format === id ? palette.onAccent : palette.inkSoft}>{shareFormats[id].label}</Txt></PressableScale>)}</ScrollView>
          {card.metrics.some((m) => m.sensitive) ? <Toggle label={dictionary.socialShare.sensitiveMetrics} value={includeSensitive} onChange={setIncludeSensitive} /> : null}
          {referral?.active ? <Toggle label={dictionary.socialShare.includeInvite} value={withReferral} onChange={setWithReferral} /> : null}
          <View style={styles.platforms}>{platforms.map((p) => <PressableScale key={p.id} disabled={!!busy} onPress={() => void perform(p.id)} containerStyle={styles.platformSlot} style={styles.platform}>{busy === p.id ? <ActivityIndicator color={palette.accentSoft} /> : <GlyphIcon glyph={mdi(p.glyph)} size={24} color={palette.accentSoft} />}<Txt variant="small" align="center" numberOfLines={2}>{p.label}</Txt></PressableScale>)}</View>
          <View style={styles.actions}>{invite ? <GradientButton label={dictionary.socialShare.copyLink} icon="link-variant" onPress={() => void copy()} style={{ flex: 1 }} /> : <GradientButton label={dictionary.socialShare.shareText} icon="message-text-outline" onPress={() => void shareText(text)} style={{ flex: 1 }} />}<GradientButton label={dictionary.socialShare.saveImage} icon="download" loading={busy === 'save'} onPress={() => void save()} style={{ flex: 1 }} /></View>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) { return <View style={styles.toggle}><Txt variant="body" style={{ flex: 1 }}>{label}</Txt><Switch value={value} onValueChange={onChange} trackColor={{ false: palette.grayBg, true: palette.accentStrong }} thumbColor={palette.white} /></View>; }

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000AA' }, sheet: { maxHeight: '94%', backgroundColor: palette.canvasHigh, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderColor: palette.lineStrong },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: palette.lineStrong, alignSelf: 'center', marginTop: 10 }, header: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: palette.line },
  scroll: { padding: 18, gap: space.md }, formats: { gap: 8 }, chip: { borderRadius: radius.pill, borderWidth: 1, borderColor: palette.lineStrong, paddingHorizontal: 14, paddingVertical: 9 }, chipOn: { backgroundColor: palette.accent, borderColor: palette.accent },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  platforms: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, platformSlot: { width: '31.5%' }, platform: { width: '100%', minHeight: 76, gap: 7, padding: 9, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  actions: { flexDirection: 'row', gap: 10 },
});

import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { GradientButton, Txt } from '@/components';
import { SecondaryButton } from '@/components/buttons';
import { ErrorState, SkeletonList } from '@/components/feedback';
import { Icon } from '@/components/Icon';
import { FilterChip, TextField } from '@/components/inputs';
import { Card, Header, Screen } from '@/components/layout';
import { format, useI18n } from '@/i18n';
import { RootScreenProps } from '@/navigation/types';
import { useRepos } from '@/store/session';
import { palette, radius, scenes } from '@/theme';
import { brandGradient } from '@/theme/brandAccent';
import { BILLING_CATEGORIES, BillingRecord, LocalImage, MAX_ATTACHMENTS, SUPPORT_CATEGORIES, SupportCategory, SupportTicket } from '@/types/support';
import { haptics } from '@/utils/haptics';
import { accent, AttachmentPicker, isEmail, newClientId, PrivateImage, SafetyNote, StatusPill, SuccessPanel, supportKeys, TextArea, useSupportConfig, useSupportError, useTicket } from './shared';

/**
 * Uploads picked images once each (keyed by local uri), so retrying a failed submit never re-uploads
 * what already succeeded.
 */
function useUploads() {
  const { support } = useRepos();
  const done = useRef(new Map<string, string>());
  return async (images: LocalImage[]) => {
    const ids: string[] = [];
    for (const image of images) {
      let id = done.current.get(image.uri);
      if (!id) { id = await support.uploadAttachment(image); done.current.set(image.uri, id); }
      ids.push(id);
    }
    return ids;
  };
}

const recordLabel = (r: BillingRecord, language: string, template: string) => {
  const amount = r.amountMinor !== null && r.currency ? new Intl.NumberFormat(language, { style: 'currency', currency: r.currency }).format(r.amountMinor / 100) : null;
  const product = [r.product, amount, r.platform].filter(Boolean).join(' · ');
  return format(template, { product, date: new Date(r.date).toLocaleDateString(language, { day: 'numeric', month: 'short', year: 'numeric' }) });
};

/** New help request: category, subject, details, reply-to email, optional purchase and screenshots. */
export function SupportNewTicketScreen({ navigation, route }: RootScreenProps<'SupportNewTicket'>) {
  const { dictionary, language } = useI18n();
  const copy = dictionary.support;
  const { support } = useRepos();
  const queryClient = useQueryClient();
  const config = useSupportConfig();
  const errorText = useSupportError();
  const upload = useUploads();
  const clientId = useRef(newClientId());
  const [category, setCategory] = useState<SupportCategory | undefined>(route.params?.category);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [record, setRecord] = useState<BillingRecord | null>(null);
  const [images, setImages] = useState<LocalImage[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<SupportTicket | null>(null);

  // Prefill the reply-to address with the account email once it's known (the user can still change it).
  useEffect(() => { if (config.data?.contactEmail) setEmail((current) => current || config.data!.contactEmail); }, [config.data?.contactEmail]);
  const billing = category && BILLING_CATEGORIES.includes(category) ? config.data?.billingRecords ?? [] : [];

  const errors = {
    category: !category ? copy.form.required : undefined,
    subject: subject.trim().length < 3 ? (subject.trim() ? format(copy.form.tooShort, { count: 3 }) : copy.form.required) : undefined,
    description: description.trim().length < 10 ? (description.trim() ? format(copy.form.tooShort, { count: 10 }) : copy.form.required) : undefined,
    email: email.trim() && !isEmail(email) ? copy.form.invalidEmail : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);

  const submit = async () => {
    if (busy) return;
    if (!valid) { setShowErrors(true); haptics.warning(); return; }
    setBusy(true);
    try {
      const attachmentIds = await upload(images);
      const ticket = await support.createTicket({
        clientId: clientId.current, category: category!, subject: subject.trim(), description: description.trim(), contactEmail: email.trim() || undefined,
        linkedSubscriptionId: record?.type === 'subscription' ? record.id : undefined, linkedCheckoutId: record?.type === 'checkout' ? record.id : undefined,
        attachmentIds: attachmentIds.length ? attachmentIds : undefined,
      });
      haptics.success();
      await queryClient.invalidateQueries({ queryKey: supportKeys.tickets });
      setCreated(ticket);
    } catch (error) {
      haptics.error();
      Alert.alert(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  if (created) return <Screen scene={scenes.violet} header={<Header title={copy.title} onBack={() => navigation.goBack()} />}>
    <SuccessPanel title={copy.submitted} body={format(copy.submittedBody, { reference: created.reference })}>
      <GradientButton testID="support-view-request" label={copy.viewRequest} icon="chevron-forward" gradient={brandGradient} onPress={() => navigation.replace('SupportTicket', { ticketId: created.id })} />
      <SecondaryButton label={copy.done} color={accent} onPress={() => navigation.goBack()} />
    </SuccessPanel>
  </Screen>;

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen scene={scenes.violet} header={<Header title={copy.newRequest} onBack={() => navigation.goBack()} />}>
      <View style={styles.form}>
        <View style={{ gap: 8 }}>
          <Txt variant="label" color={palette.inkSoft}>{copy.form.category}</Txt>
          <View style={styles.chips}>{SUPPORT_CATEGORIES.map((c) => <FilterChip key={c} label={copy.categories[c]} active={category === c} color={accent} onPress={() => { setCategory(c); setRecord(null); }} />)}</View>
          {showErrors && errors.category ? <Txt variant="small" color={palette.danger}>{errors.category}</Txt> : null}
        </View>
        <TextField testID="support-subject" label={copy.form.subject} placeholder={copy.form.subjectPlaceholder} value={subject} onChangeText={setSubject} maxLength={160} error={showErrors ? errors.subject : undefined} />
        <TextArea testID="support-description" label={copy.form.description} placeholder={copy.form.descriptionPlaceholder} value={description} onChangeText={setDescription} maxLength={5000} error={showErrors ? errors.description : undefined} />
        <View style={{ gap: 6 }}>
          <TextField testID="support-email" label={copy.form.contactEmail} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={showErrors ? errors.email : undefined} />
          <Txt variant="small" color={palette.inkMuted}>{copy.form.contactEmailHint}</Txt>
        </View>
        {billing.length ? <View style={{ gap: 8 }}>
          <Txt variant="label" color={palette.inkSoft}>{copy.form.billingRecord}</Txt>
          {[null, ...billing].map((r) => {
            const selected = (record?.id ?? null) === (r?.id ?? null);
            return <Pressable key={r?.id ?? 'none'} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => { haptics.selection(); setRecord(r); }} style={[styles.radioRow, selected && { borderColor: accent }]}>
              <View style={[styles.radio, selected && { borderColor: accent }]}>{selected ? <View style={styles.radioDot} /> : null}</View>
              <Txt variant="body" style={{ flex: 1 }}>{r ? recordLabel(r, language, copy.billingRecord) : copy.form.billingNone}</Txt>
            </Pressable>;
          })}
        </View> : null}
        <View style={{ gap: 8 }}>
          <Txt variant="label" color={palette.inkSoft}>{copy.form.attachments}</Txt>
          <AttachmentPicker images={images} onChange={setImages} max={MAX_ATTACHMENTS} disabled={busy} />
          <Txt variant="small" color={palette.inkMuted}>{format(copy.form.attachmentLimit, { count: MAX_ATTACHMENTS })}</Txt>
        </View>
        <SafetyNote text={copy.form.safety} />
        <GradientButton testID="support-submit" label={busy && images.length ? copy.uploading : copy.form.submit} icon="send" gradient={brandGradient} loading={busy} haptic={null} onPress={submit} />
      </View>
    </Screen>
  </KeyboardAvoidingView>;
}

/** One request: details, the conversation with the team, and a reply box while it's not closed. */
export function SupportTicketScreen({ navigation, route }: RootScreenProps<'SupportTicket'>) {
  const { dictionary, language } = useI18n();
  const copy = dictionary.support;
  const { support } = useRepos();
  const queryClient = useQueryClient();
  const ticket = useTicket(route.params.ticketId);
  const errorText = useSupportError();
  const upload = useUploads();
  const clientId = useRef(newClientId());
  const [body, setBody] = useState('');
  const [images, setImages] = useState<LocalImage[]>([]);
  const [busy, setBusy] = useState(false);

  // Opening the ticket clears its "new reply" flag on the server; refresh the list behind us.
  useEffect(() => { if (ticket.data) void queryClient.invalidateQueries({ queryKey: supportKeys.tickets }); }, [ticket.data?.id, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    if (busy || !body.trim()) return;
    setBusy(true);
    try {
      const attachmentIds = await upload(images);
      const updated = await support.reply(route.params.ticketId, { clientId: clientId.current, body: body.trim(), attachmentIds: attachmentIds.length ? attachmentIds : undefined });
      queryClient.setQueryData(supportKeys.ticket(route.params.ticketId), updated);
      void queryClient.invalidateQueries({ queryKey: supportKeys.tickets });
      haptics.success();
      clientId.current = newClientId();
      setBody(''); setImages([]);
    } catch (error) {
      haptics.error();
      Alert.alert(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const date = (iso: string) => new Date(iso).toLocaleString(language, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const t = ticket.data;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen scene={scenes.violet} header={<Header title={t ? format(copy.ticket.reference, { reference: t.reference }) : copy.title} onBack={() => navigation.goBack()} />}
      refreshing={ticket.isRefetching} onRefresh={() => void ticket.refetch()}>
      {ticket.isPending ? <SkeletonList rows={3} /> : ticket.isError ? <ErrorState error={ticket.error} onRetry={() => void ticket.refetch()} /> : t ? <View style={{ gap: 14 }}>
        <Card style={{ gap: 8 }}>
          <StatusPill status={t.status} />
          <Txt variant="h3">{t.subject}</Txt>
          <Txt variant="small" color={palette.inkMuted}>{copy.categories[t.category]} · {format(copy.ticket.opened, { date: date(t.createdAt) })}</Txt>
          <Txt variant="body" color={palette.inkSoft}>{t.description}</Txt>
          {t.attachments?.length ? <View style={styles.thumbs}>{t.attachments.map((a) => <PrivateImage key={a.id} url={a.url} />)}</View> : null}
        </Card>

        {(t.messages ?? []).map((m) => {
          const mine = m.authorType === 'USER';
          return <View key={m.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
            <Txt variant="tab" color={mine ? accent : palette.aqua}>{mine ? copy.ticket.you : copy.ticket.team} · {date(m.createdAt)}</Txt>
            <Txt variant="body">{m.body}</Txt>
            {m.attachments.length ? <View style={styles.thumbs}>{m.attachments.map((a) => <PrivateImage key={a.id} url={a.url} size={80} />)}</View> : null}
          </View>;
        })}

        {t.status === 'WAITING_FOR_USER' ? <Note text={copy.ticket.waitingNote} color={accent} /> : t.status === 'RESOLVED' ? <Note text={copy.ticket.resolvedNote} color={palette.success} /> : null}

        {t.status === 'CLOSED' ? <Note text={copy.ticket.closedNote} color={palette.inkMuted} /> : <Card style={{ gap: 10 }}>
          <TextArea testID="support-reply" label={copy.ticket.replyPlaceholder} placeholder={copy.ticket.replyPlaceholder} value={body} onChangeText={setBody} maxLength={5000} minHeight={96} />
          <AttachmentPicker images={images} onChange={setImages} max={MAX_ATTACHMENTS} disabled={busy} />
          <GradientButton testID="support-send" label={busy && images.length ? copy.uploading : copy.ticket.send} icon="send" gradient={brandGradient} loading={busy} disabled={!body.trim()} haptic={null} onPress={send} size="compact" />
        </Card>}
      </View> : null}
    </Screen>
  </KeyboardAvoidingView>;
}

function Note({ text, color }: { text: string; color: string }) {
  return <View style={[styles.note, { borderColor: `${color}55`, backgroundColor: `${color}12` }]}><Icon name="info" size="sm" color={color} /><Txt variant="small" color={palette.inkSoft} style={{ flex: 1 }}>{text}</Txt></View>;
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1.5, borderColor: palette.line },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: palette.lineStrong, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: accent },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  bubble: { gap: 6, padding: 12, borderRadius: radius.lg, maxWidth: '92%' },
  mine: { alignSelf: 'flex-end', backgroundColor: `${accent}1A`, borderWidth: 1, borderColor: `${accent}40` },
  theirs: { alignSelf: 'flex-start', backgroundColor: palette.surfaceRaised, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: radius.md, borderWidth: 1 },
});

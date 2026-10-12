import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { GradientButton, Txt } from '@/components';
import { SecondaryButton } from '@/components/buttons';
import { Icon } from '@/components/Icon';
import { FilterChip, TextField } from '@/components/inputs';
import { Header, Screen } from '@/components/layout';
import { format, useI18n } from '@/i18n';
import { RootScreenProps } from '@/navigation/types';
import { useRepos } from '@/store/session';
import { palette, scenes } from '@/theme';
import { brandGradient, logoPalette } from '@/theme/brandAccent';
import { FEEDBACK_CATEGORIES, FeedbackCategory, LocalImage, SubmissionReceipt } from '@/types/support';
import { haptics } from '@/utils/haptics';
import { accent, AttachmentPicker, newClientId, SuccessPanel, TextArea, useSupportError } from './shared';

/** Profile → Send Feedback: product feedback (kept separate from support requests on the server). */
export function SendFeedbackScreen({ navigation }: RootScreenProps<'SendFeedback'>) {
  const { dictionary } = useI18n();
  const copy = dictionary.support;
  const fb = copy.feedback;
  const { support } = useRepos();
  const errorText = useSupportError();
  const clientId = useRef(newClientId());
  const uploaded = useRef(new Map<string, string>());
  const [category, setCategory] = useState<FeedbackCategory>('GENERAL');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [images, setImages] = useState<LocalImage[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);

  const errors = {
    subject: subject.trim().length < 3 ? (subject.trim() ? format(copy.form.tooShort, { count: 3 }) : copy.form.required) : undefined,
    message: message.trim().length < 10 ? (message.trim() ? format(copy.form.tooShort, { count: 10 }) : copy.form.required) : undefined,
  };

  const submit = async () => {
    if (busy) return;
    if (errors.subject || errors.message) { setShowErrors(true); haptics.warning(); return; }
    setBusy(true);
    try {
      const attachmentIds: string[] = [];
      for (const image of images) {
        let id = uploaded.current.get(image.uri);
        if (!id) { id = await support.uploadAttachment(image); uploaded.current.set(image.uri, id); }
        attachmentIds.push(id);
      }
      const result = await support.sendFeedback({ clientId: clientId.current, category, subject: subject.trim(), description: message.trim(), rating: rating ?? undefined, attachmentIds: attachmentIds.length ? attachmentIds : undefined });
      haptics.success();
      setReceipt(result);
    } catch (error) {
      haptics.error();
      Alert.alert(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  if (receipt) return <Screen scene={scenes.violet} header={<Header title={fb.title} onBack={() => navigation.goBack()} />}>
    <SuccessPanel title={fb.thanks} body={format(fb.thanksBody, { reference: receipt.reference })}>
      <SecondaryButton label={copy.done} color={accent} onPress={() => navigation.goBack()} />
    </SuccessPanel>
  </Screen>;

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen scene={scenes.violet} header={<Header title={fb.title} onBack={() => navigation.goBack()} />}>
      <View style={styles.form}>
        <Txt variant="body" color={palette.inkMuted}>{fb.intro}</Txt>
        <View style={{ gap: 8 }}>
          <Txt variant="label" color={palette.inkSoft}>{copy.form.category}</Txt>
          <View style={styles.chips}>{FEEDBACK_CATEGORIES.map((c) => <FilterChip key={c} label={fb.categories[c]} active={category === c} color={accent} onPress={() => setCategory(c)} />)}</View>
        </View>
        <TextField testID="feedback-subject" label={copy.form.subject} value={subject} onChangeText={setSubject} maxLength={160} error={showErrors ? errors.subject : undefined} />
        <TextArea testID="feedback-message" label={fb.message} placeholder={fb.messagePlaceholder} value={message} onChangeText={setMessage} maxLength={5000} error={showErrors ? errors.message : undefined} />
        <View style={{ gap: 8 }}>
          <Txt variant="label" color={palette.inkSoft}>{fb.rating}</Txt>
          <View style={styles.stars} accessibilityRole="adjustable" accessibilityLabel={fb.rating} accessibilityValue={rating ? { text: format(fb.ratingLabel, { count: rating }) } : undefined}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={(e) => setRating((r) => Math.max(1, Math.min(5, (r ?? 0) + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}>
            {[1, 2, 3, 4, 5].map((n) => <Pressable key={n} hitSlop={6} testID={`feedback-star-${n}`} accessibilityRole="button" accessibilityLabel={format(fb.ratingLabel, { count: n })}
              onPress={() => { haptics.selection(); setRating(rating === n ? null : n); }}>
              <Icon name="star" size="lg" color={rating && n <= rating ? logoPalette.amber : palette.inkFaint} variant={rating && n <= rating ? 'filled' : 'outline'} />
            </Pressable>)}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Txt variant="label" color={palette.inkSoft}>{fb.screenshot}</Txt>
          <AttachmentPicker images={images} onChange={setImages} max={1} disabled={busy} />
        </View>
        <GradientButton testID="feedback-submit" label={busy && images.length ? copy.uploading : fb.submit} icon="send" gradient={brandGradient} loading={busy} haptic={null} onPress={submit} />
      </View>
    </Screen>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stars: { flexDirection: 'row', gap: 10 },
});

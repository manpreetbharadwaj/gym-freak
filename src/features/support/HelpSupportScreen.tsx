import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';
import { PressableScale, Txt } from '@/components';
import { EmptyState, ErrorState, SkeletonList } from '@/components/feedback';
import { Icon, IconName } from '@/components/Icon';
import { LinkRow } from '@/components/inputs';
import { Card, Header, Screen, Section } from '@/components/layout';
import { format, useI18n } from '@/i18n';
import { RootScreenProps } from '@/navigation/types';
import { mdi } from '@/components';
import { palette, pressScales, radius, scenes, shadow } from '@/theme';
import { SUPPORT_CATEGORIES, SupportCategory, SupportTicket } from '@/types/support';
import { SupportScope, accent, SafetyNote, StatusPill, useTickets } from './shared';

export const CATEGORY_ICONS: Record<SupportCategory, IconName> = {
  PAYMENT: 'card', SUBSCRIPTION_BILLING: 'receipt', ACCOUNT_LOGIN: 'key', WORKOUT_PLAN: 'workout',
  TECHNICAL: 'wrench', NOTIFICATIONS: 'bell', REFUND_CANCELLATION: 'undo', OTHER: 'message',
};

/** Profile → Help & Support: pick a topic to open a request, follow earlier requests, or read the FAQs. */
export function HelpSupportScreen({ navigation }: RootScreenProps<'HelpSupport'>) {
  const { dictionary } = useI18n();
  const copy = dictionary.support;
  const tickets = useTickets();
  // Replies arrive while you're elsewhere: refresh statuses / "new reply" whenever this screen comes back into view.
  useFocusEffect(useCallback(() => { void tickets.refetch(); }, [tickets.refetch])); // eslint-disable-line react-hooks/exhaustive-deps
  return <SupportScope><Screen scene={scenes.violet} header={<Header title={copy.title} onBack={() => navigation.goBack()} />} refreshing={tickets.isRefetching} onRefresh={() => void tickets.refetch()}>
    <Txt variant="body" color={palette.inkMuted}>{copy.intro}</Txt>

    <Section title={copy.howCanWeHelp}>
      <View style={styles.grid}>
        {SUPPORT_CATEGORIES.map((category) => <PressableScale key={category} testID={`support-category-${category}`} haptic="selection" scaleTo={pressScales.card} accessibilityLabel={copy.categories[category]}
          onPress={() => navigation.navigate('SupportNewTicket', { category })} containerStyle={styles.tileSlot} style={[styles.tile, shadow(undefined, 0.35)]}>
          <View style={styles.tileIcon}><Icon name={CATEGORY_ICONS[category]} size="sm" color={accent} /></View>
          <Txt variant="row" numberOfLines={2}>{copy.categories[category]}</Txt>
        </PressableScale>)}
      </View>
    </Section>

    <Section title={copy.myRequests} action={copy.newRequest} onAction={() => navigation.navigate('SupportNewTicket')}>
      {tickets.isPending ? <SkeletonList rows={2} height={72} /> : tickets.isError ? <ErrorState error={tickets.error} onRetry={() => void tickets.refetch()} compact />
        : !tickets.data.length ? <EmptyState title={copy.noRequests} body={copy.noRequestsBody} glyph={mdi('lifebuoy')} />
          : <View style={{ gap: 10 }}>{tickets.data.map((t) => <TicketRow key={t.id} ticket={t} onPress={() => navigation.navigate('SupportTicket', { ticketId: t.id })} />)}</View>}
    </Section>

    <Card padded={false} style={{ marginTop: 24 }}>
      <LinkRow title={copy.faqs} glyph={mdi('book-open-outline')} color={accent} onPress={() => navigation.navigate('Legal', { topic: 'help' })} />
    </Card>
    <View style={{ marginTop: 16 }}><SafetyNote text={copy.form.safety} /></View>
  </Screen></SupportScope>;
}

function TicketRow({ ticket, onPress }: { ticket: SupportTicket; onPress: () => void }) {
  const { dictionary, language } = useI18n();
  const copy = dictionary.support;
  return <PressableScale onPress={onPress} haptic="light" scaleTo={pressScales.card} testID={`support-ticket-${ticket.reference}`}
    accessibilityLabel={`${ticket.subject}, ${copy.statuses[ticket.status]}${ticket.unread ? `, ${copy.newReply}` : ''}`} style={[styles.row, ticket.unread && { borderColor: `${accent}88` }]}>
    <View style={{ flex: 1, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt variant="row" numberOfLines={1} style={{ flexShrink: 1 }}>{ticket.subject}</Txt>
        {ticket.unread ? <View style={styles.unread}><Txt variant="tab" color={palette.white}>{copy.newReply}</Txt></View> : null}
      </View>
      <Txt variant="small" color={palette.inkMuted}>{format(copy.ticket.reference, { reference: ticket.reference })} · {new Date(ticket.lastMessageAt).toLocaleDateString(language, { day: 'numeric', month: 'short' })}</Txt>
      <StatusPill status={ticket.status} />
    </View>
    <Icon name="chevronRight" size="sm" color={palette.inkFaint} />
  </PressableScale>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tileSlot: { width: '48%', flexGrow: 1 },
  tile: { minHeight: 96, gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: palette.surface, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  tileIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: `${accent}1A`, borderWidth: 1, borderColor: `${accent}40` },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: palette.surface, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  unread: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: accent },
});

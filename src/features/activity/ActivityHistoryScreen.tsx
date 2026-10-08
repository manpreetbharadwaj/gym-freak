import React, { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { mdi } from '@/components';
import { EmptyState, ErrorState, SkeletonList } from '@/components/feedback';
import { FilterChip } from '@/components/inputs';
import { Header, Screen } from '@/components/layout';
import { useI18n } from '@/i18n';
import { useActivities } from '@/hooks/queries';
import { useUnitSystem } from '@/hooks/useUnits';
import { RootScreenProps } from '@/navigation/types';
import { gutter, palette, scenes } from '@/theme';
import { ActivityType } from '@/types/domain';
import { ACTIVITY_ORDER, ACTIVITY_TYPES } from './activityTypes';
import { ActivityRow } from './components';

/** All activities (recorded in Gym Freak and imported from Apple Health / Health Connect), newest first. */
export function ActivityHistoryScreen({ navigation }: RootScreenProps<'ActivityHistory'>) {
  const { dictionary } = useI18n();
  const copy = dictionary.activity;
  const system = useUnitSystem();
  const [type, setType] = useState<ActivityType | undefined>();
  const list = useActivities(type);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  return <Screen scene={scenes.violet} scroll={false} header={<Header title={copy.history} onBack={() => navigation.goBack()} />} contentStyle={{ paddingHorizontal: 0, paddingTop: 0 }}>
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <FilterChip label={copy.all} active={!type} onPress={() => setType(undefined)} />
        {ACTIVITY_ORDER.map((t) => <FilterChip key={t} label={copy.types[t]} active={type === t} color={ACTIVITY_TYPES[t].color} glyph={mdi(ACTIVITY_TYPES[t].icon)} onPress={() => setType(t)} />)}
      </ScrollView>
    </View>
    {list.isLoading ? <View style={{ paddingHorizontal: gutter }}><SkeletonList rows={5} height={96} /></View>
      : list.error ? <View style={{ paddingHorizontal: gutter }}><ErrorState error={list.error} onRetry={() => list.refetch()} /></View>
        : <FlatList
          data={items}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 40, gap: 10 }}
          renderItem={({ item }) => <ActivityRow activity={item} system={system} onPress={() => navigation.navigate('ActivityDetail', { activityId: item.id })} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage(); }}
          refreshing={list.isRefetching}
          onRefresh={() => list.refetch()}
          ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={palette.violet} style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={<EmptyState title={copy.empty} body={copy.emptyBody} glyph={mdi('run-fast')} />}
        />}
  </Screen>;
}

const styles = StyleSheet.create({
  filters: { gap: 8, paddingHorizontal: gutter, paddingVertical: 12 },
});

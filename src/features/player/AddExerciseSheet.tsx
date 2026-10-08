import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { ExerciseRow } from '@/components/cards';
import { BottomSheet } from '@/components/inputs';
import { Txt } from '@/components';
import { useExerciseLibrary } from '@/hooks/queries';
import { useI18n } from '@/i18n';
import { controls, fonts, palette, radius } from '@/theme';
import { Exercise } from '@/types/domain';

/** Searchable library to add an exercise to the running session only. */
export function AddExerciseSheet({ visible, onClose, exclude, onPick }: { visible: boolean; onClose: () => void; exclude: string[]; onPick: (exercise: Exercise) => void }) {
  const { dictionary } = useI18n();
  const copy = dictionary.player;
  const [search, setSearch] = useState('');
  const library = useExerciseLibrary({ search: search.trim() || undefined });
  const options = (library.data?.pages.flatMap((p) => p.items) ?? []).filter((e) => !exclude.includes(e.id) && !e.locked);
  return <BottomSheet visible={visible} onClose={onClose} title={copy.addTitle}>
    <Txt variant="small" color={palette.inkMuted} style={{ marginBottom: 10 }}>{copy.addHint}</Txt>
    <TextInput value={search} onChangeText={setSearch} placeholder={dictionary.common.search} placeholderTextColor={palette.inkFaint} style={styles.search} autoCorrect={false} accessibilityLabel={dictionary.common.search} />
    {library.isLoading ? <ActivityIndicator color={palette.violet} style={{ marginVertical: 24 }} />
      : options.length ? <View style={{ gap: 8 }}>{options.slice(0, 30).map((e) => <ExerciseRow key={e.id} exercise={e} onPress={() => onPick(e)} />)}</View>
      : <View style={{ paddingVertical: 24 }}><Txt variant="body" color={palette.inkMuted} align="center">{dictionary.player.noAlternatives}</Txt></View>}
  </BottomSheet>;
}

const styles = StyleSheet.create({
  search: { backgroundColor: palette.lavenderBg, borderRadius: controls.input.radius, paddingHorizontal: 14, height: controls.input.height, fontSize: 15, color: palette.ink, marginBottom: 12, fontFamily: fonts.medium },
});

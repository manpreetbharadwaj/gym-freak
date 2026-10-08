import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ExerciseRow } from '@/components/cards';
import { BottomSheet } from '@/components/inputs';
import { Txt } from '@/components';
import { useExerciseLibrary, useProfile } from '@/hooks/queries';
import { useI18n } from '@/i18n';
import { palette } from '@/theme';
import { Exercise } from '@/types/domain';

/** Alternatives for the same primary muscle, preferring equipment the user said they have. */
export function ReplaceSheet({ visible, onClose, exercise, onPick }: { visible: boolean; onClose: () => void; exercise?: Exercise; onPick: (exercise: Exercise) => void }) {
  const { dictionary } = useI18n();
  const profile = useProfile();
  const library = useExerciseLibrary({ muscle: exercise?.primaryMuscle });
  const owned = new Set(profile.data?.equipment ?? []);
  const fullGym = owned.has('full-gym') || profile.data?.location === 'gym';
  const options = (library.data?.pages.flatMap((p) => p.items) ?? [])
    .filter((e) => e.id !== exercise?.id && !e.locked)
    .sort((a, b) => Number(b.equipment.some((x) => fullGym || owned.has(x))) - Number(a.equipment.some((x) => fullGym || owned.has(x))));
  return <BottomSheet visible={visible} onClose={onClose} title={dictionary.player.replaceTitle}>
    {library.isLoading ? <ActivityIndicator color={palette.violet} style={{ marginVertical: 24 }} />
      : options.length ? options.map((e) => <ExerciseRow key={e.id} exercise={e} onPress={() => onPick(e)} />)
      : <View style={{ paddingVertical: 24 }}><Txt variant="body" color={palette.inkMuted} align="center">{dictionary.player.noAlternatives}</Txt></View>}
  </BottomSheet>;
}

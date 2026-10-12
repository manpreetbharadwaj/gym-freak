import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlyphIcon, GradientButton, MeshBackground, mdi, SecondaryButton, Txt } from '@/components';
import { ExerciseRow, useLabels } from '@/components/cards';
import { EmptyState, ErrorState, Skeleton, SkeletonList } from '@/components/feedback';
import { BottomSheet, FilterChip } from '@/components/inputs';
import { HorizontalRail, TAB_BAR_SPACE } from '@/components/layout';
import Animated from 'react-native-reanimated';
import { useTabBarOnScroll } from '@/navigation/TabBarVisibilityContext';
import { visualFor } from '@/components/media';
import { useContentTiles, useExerciseLibrary, useHome, useWorkouts } from '@/hooks/queries';
import { RemoteImage } from '@/components/RemoteImage';
import { PhotoWorkoutCard } from '@/components/dashboard';
import { PressableScale } from '@/components';
import { LinearGradient } from 'expo-linear-gradient';
import { ContentTile, Goal, Workout } from '@/types/domain';
import { Glyph } from '@/components/primitives';
import { format } from '@/i18n';
import { MainTabParamList, RootStackParamList } from '@/navigation/types';
import { controls, fonts, gutter, palette, pressScales, radius, scenes, shadow, typography } from '@/theme';
import { Difficulty, ExerciseMode, muscleGroups } from '@/types/domain';

const scene = scenes.aqua;
const equipmentOptions = ['dumbbells', 'barbell', 'bench', 'cable-machine', 'bands', 'smith-machine', 'pull-up-bar', 'machines', 'bodyweight'] as const;
const difficulties: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
const modes: ExerciseMode[] = ['strength', 'bodyweight_reps', 'timed'];
/** App goal → HealthyMe workout goal vocabulary. */
const goalKeys: [Goal, string][] = [['build-muscle', 'build_muscle'], ['lose-fat', 'lose_fat'], ['get-stronger', 'get_stronger'], ['stay-fit', 'general_fitness'], ['improve-endurance', 'endurance'], ['improve-mobility', 'mobility']];
type DurationBand = 'short' | 'medium' | 'long';
const inBand = (minutes: number, band: DurationBand) => (band === 'short' ? minutes < 20 : band === 'medium' ? minutes >= 20 && minutes < 40 : minutes >= 40);

function useDebounced<T>(value: T, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), ms); return () => clearTimeout(t); }, [ms, value]);
  return debounced;
}

export function ExploreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, 'Explore'>>();
  const insets = useSafeAreaInsets();
  const tabBarScroll = useTabBarOnScroll();
  const { dictionary, muscle, equipment, difficulty } = useLabels();
  const copy = dictionary.explore;
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscle] = useState<string | undefined>(route.params?.muscle);
  const [equipmentFilter, setEquipment] = useState<string>();
  const [difficultyFilter, setDifficulty] = useState<Difficulty>();
  const [modeFilter, setMode] = useState<ExerciseMode>();
  const [sheet, setSheet] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [goalFilter, setGoal] = useState<string>();
  const [durationFilter, setDuration] = useState<DurationBand>();
  const workouts = useWorkouts();
  const home = useHome();
  // Muscle / goal / equipment tiles and their photos are admin-managed (Admin → Explore content).
  const tiles = useContentTiles();
  const section = (key: 'explore_muscle' | 'explore_goal' | 'explore_equipment') => tiles.data?.sections[key] ?? [];
  const goalLabel = (apiGoal: string) => { const app = goalKeys.find(([, api]) => api === apiGoal)?.[0]; return app ? dictionary.onboarding.goal.options[app].title : apiGoal; };
  // Keep in sync when Home's quick-start circles open Explore with a muscle.
  useEffect(() => { if (route.params?.muscle) setMuscle(route.params.muscle); }, [route.params?.muscle]);
  const term = useDebounced(search.trim());
  const library = useExerciseLibrary({ search: term || undefined, muscle: muscleFilter, equipment: equipmentFilter, difficulty: difficultyFilter });
  // Workout type isn't a server filter yet, so it narrows the loaded pages client-side.
  const items = useMemo(() => (library.data?.pages.flatMap((p) => p.items) ?? []).filter((e) => !modeFilter || e.mode === modeFilter), [library.data, modeFilter]);
  const total = library.data?.pages[0]?.total ?? 0;
  const activeFilters = [equipmentFilter, difficultyFilter, modeFilter].filter(Boolean).length;
  const searching = !!term || !!muscleFilter || activeFilters > 0;
  const workoutResults = (workouts.data ?? []).filter((w) => (!goalFilter || w.goal === goalFilter) && (!durationFilter || inBand(w.estimatedMinutes, durationFilter)) && (!term || w.name.toLowerCase().includes(term.toLowerCase())));
  const openWorkout = (w: Workout) => navigation.navigate('WorkoutDetail', { workoutId: w.id });

  const header = <View>
    <View style={{ paddingTop: insets.top + 12 }}>
      <Txt variant="overline" color={palette.accent}>{dictionary.nav.Explore.toUpperCase()}</Txt>
      <Txt variant="display" style={{ marginTop: 4 }}>{copy.title}</Txt>
      <Txt variant="body" color={palette.inkMuted} style={{ marginTop: 4 }}>{copy.subtitle}</Txt>
    </View>
    <View style={styles.searchRow}>
      <View style={[styles.search, searchFocused && styles.searchFocused]}>
        <GlyphIcon glyph={mdi('magnify')} size={21} color={searchFocused ? palette.accent : palette.inkMuted} />
        <TextInput value={search} onChangeText={setSearch} placeholder={copy.search} placeholderTextColor={palette.inkFaint} style={styles.searchInput} returnKeyType="search" autoCorrect={false} accessibilityLabel={copy.search} selectionColor={palette.accent} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
        {search ? <Pressable onPress={() => setSearch('')} hitSlop={10} accessibilityLabel={dictionary.common.close}><GlyphIcon glyph={mdi('close-circle')} size={20} color={palette.inkFaint} /></Pressable> : null}
      </View>
      <PressableScale onPress={() => setSheet(true)} haptic="light" scaleTo={pressScales.icon} style={[styles.filterButton, activeFilters > 0 && styles.filterActive]} accessibilityLabel={copy.filters}>
        <GlyphIcon glyph={mdi('tune-variant')} size={21} color={activeFilters ? palette.accent : palette.ink} />
        {activeFilters ? <View style={styles.badge}><Txt variant="tab" color={palette.onAccent}>{activeFilters}</Txt></View> : null}
      </PressableScale>
    </View>
    <HorizontalRail gap={8}>
      <FilterChip label={copy.all} active={!muscleFilter} onPress={() => setMuscle(undefined)} color={palette.accent} />
      {muscleGroups.map((m) => <FilterChip key={m} label={muscle(m)} glyph={visualFor(m).glyph} active={muscleFilter === m} onPress={() => setMuscle(muscleFilter === m ? undefined : m)} color={palette.accent} />)}
    </HorizontalRail>
    {goalFilter || durationFilter ? <View style={{ marginTop: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt variant="title" style={{ flex: 1 }}>{format(copy.workoutResults, { count: workoutResults.length })}</Txt>
        <Pressable onPress={() => { setGoal(undefined); setDuration(undefined); }} hitSlop={10} accessibilityRole="button"><Txt variant="label" color={palette.accent}>{copy.clear}</Txt></Pressable>
      </View>
      {workoutResults.length ? workoutResults.map((w) => <PhotoWorkoutCard key={w.id} workout={w} width="100%" height={150} onPress={() => openWorkout(w)} />) : <EmptyState title={copy.noResults} glyph={mdi('magnify-close')} />}
    </View> : !searching ? <View>
      {(workouts.data ?? []).length ? <DiscoverSection title={copy.featured}>
        <HorizontalRail gap={12}>{(workouts.data ?? []).slice(0, 6).map((w) => <PhotoWorkoutCard key={w.id} workout={w} width={276} height={220} onPress={() => openWorkout(w)} />)}</HorizontalRail>
      </DiscoverSection> : null}
      {tiles.isLoading ? <DiscoverSection title={copy.byMuscle}><View style={styles.tiles}>{[0, 1, 2, 3].map((i) => <View key={i} style={styles.tileSlot}><Skeleton height={118} round={radius.lg} /></View>)}</View></DiscoverSection> : null}
      {section('explore_muscle').length ? <DiscoverSection title={copy.byMuscle}>
        <View style={styles.tiles}>{section('explore_muscle').map((t) => <PhotoTile key={t.id} tile={t} label={t.title ?? muscle(t.key)} glyph={visualFor(t.key).glyph} onPress={() => setMuscle(t.key)} />)}</View>
      </DiscoverSection> : null}
      {section('explore_goal').length ? <DiscoverSection title={copy.byGoal}>
        <HorizontalRail gap={12}>{section('explore_goal').map((t) => <PhotoTile key={t.id} wide tile={t} label={t.title ?? goalLabel(t.key)} onPress={() => setGoal(t.key)} />)}</HorizontalRail>
      </DiscoverSection> : null}
      {section('explore_equipment').length ? <DiscoverSection title={copy.byEquipment}>
        <HorizontalRail gap={12}>{section('explore_equipment').map((t) => <PressableScale key={t.id} onPress={() => setEquipment(t.key)} accessibilityLabel={t.title ?? equipment(t.key)}>
          <View style={styles.equipTile}><RemoteImage uri={t.imageUrl} fit={t.imageFit} backdrop={palette.productBackdrop} glyph={mdi('dumbbell')} style={styles.equipPhoto} /><Txt variant="label" numberOfLines={1}>{t.title ?? equipment(t.key)}</Txt></View>
        </PressableScale>)}</HorizontalRail>
      </DiscoverSection> : null}
      <DiscoverSection title={copy.byDuration}>
        <View style={{ flexDirection: 'row', gap: 10 }}>{(['short', 'medium', 'long'] as const).map((band) => <PressableScale key={band} onPress={() => setDuration(band)} containerStyle={{ flex: 1 }} accessibilityLabel={copy[band]}>
          <View style={styles.durationTile}><GlyphIcon glyph={mdi(band === 'short' ? 'timer-sand' : band === 'medium' ? 'timer-outline' : 'timer-plus-outline')} size={22} color={palette.accent} /><Txt variant="label" numberOfLines={1}>{copy[band]}</Txt></View>
        </PressableScale>)}</View>
      </DiscoverSection>
      {home.data?.recommendations.length ? <DiscoverSection title={copy.recommended}>
        <HorizontalRail gap={14}>{home.data.recommendations.map((w) => <PhotoWorkoutCard key={w.id} workout={w} onPress={() => openWorkout(w)} />)}</HorizontalRail>
      </DiscoverSection> : null}
    </View> : null}
    {searching && !goalFilter && !durationFilter && !library.isLoading && !library.error ? <Txt variant="label" color={palette.inkMuted} style={{ marginTop: 14, marginBottom: 10 }}>{format(copy.results, { count: modeFilter ? items.length : total })}</Txt> : null}
  </View>;

  return <View style={[styles.root, { backgroundColor: scene.background }]}>
    <StatusBar style="light" />
    <MeshBackground base={scene.background} blobs={scene.blobs} animated={false} layout="top" />
    <Animated.FlatList
      {...tabBarScroll}
      data={!searching || goalFilter || durationFilter || library.isLoading || library.error ? [] : items}
      keyExtractor={(e) => e.id}
      ListHeaderComponent={header}
      contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_SPACE + insets.bottom }]}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item }) => <ExerciseRow exercise={item} onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })} />}
      onEndReachedThreshold={0.5}
      onEndReached={() => { if (library.hasNextPage && !library.isFetchingNextPage) library.fetchNextPage(); }}
      ListEmptyComponent={!searching || goalFilter || durationFilter ? null : library.isLoading ? <SkeletonList rows={6} /> : library.error ? <ErrorState error={library.error} onRetry={() => library.refetch()} /> : <EmptyState title={copy.noResults} glyph={mdi('magnify-close')} action={activeFilters || muscleFilter || term ? <GradientButton label={copy.reset} icon="refresh" onPress={() => { setSearch(''); setMuscle(undefined); setEquipment(undefined); setDifficulty(undefined); setMode(undefined); }} style={{ alignSelf: 'stretch', marginTop: 8 }} /> : undefined} />}
      ListFooterComponent={library.isFetchingNextPage ? <ActivityIndicator color={scene.accent} style={{ marginVertical: 20 }} /> : null}
      keyboardDismissMode="on-drag"
      initialNumToRender={8}
      windowSize={7}
      removeClippedSubviews
    />
    <BottomSheet visible={sheet} onClose={() => setSheet(false)} title={copy.filters} footer={<View style={{ flexDirection: 'row', gap: 10 }}>
      <SecondaryButton label={copy.reset} color={palette.inkSoft} onPress={() => { setEquipment(undefined); setDifficulty(undefined); setMode(undefined); }} />
      <GradientButton label={copy.apply} icon="checkmark" gradient={scene.gradient} onPress={() => setSheet(false)} style={{ flex: 1 }} />
    </View>}>
      <FilterGroup title={copy.equipment}>{equipmentOptions.map((e) => <FilterChip key={e} label={equipment(e)} active={equipmentFilter === e} onPress={() => setEquipment(equipmentFilter === e ? undefined : e)} color={scene.accent} />)}</FilterGroup>
      <FilterGroup title={copy.difficulty}>{difficulties.map((d) => <FilterChip key={d} label={difficulty(d)} active={difficultyFilter === d} onPress={() => setDifficulty(difficultyFilter === d ? undefined : d)} color={palette.orange} />)}</FilterGroup>
      <FilterGroup title={copy.type}>{modes.map((m) => <FilterChip key={m} label={dictionary.catalog.modes[m]} active={modeFilter === m} onPress={() => setMode(modeFilter === m ? undefined : m)} color={palette.violet} />)}</FilterGroup>
    </BottomSheet>
  </View>;
}

function DiscoverSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={{ marginTop: 28 }}><Txt variant="title" style={{ marginBottom: 12 }}>{title}</Txt>{children}</View>;
}
function PhotoTile({ label, tile, glyph, onPress, wide }: { label: string; tile: ContentTile; glyph?: Glyph; onPress: () => void; wide?: boolean }) {
  return <PressableScale onPress={onPress} accessibilityLabel={label} containerStyle={wide ? { width: 156 } : styles.tileSlot}>
    <View style={[wide ? styles.goalTile : styles.tile, shadow(undefined, 0.6)]}>
      <RemoteImage uri={tile.imageUrl} fit={tile.imageFit} glyph={glyph} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(8,16,27,0)', 'rgba(8,16,27,0.4)', 'rgba(8,16,27,0.95)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.tileLabel}>
        <Txt variant="h3" color={palette.white} numberOfLines={2} style={{ flex: 1 }}>{label}</Txt>
        <View style={styles.tileArrow}><GlyphIcon glyph={mdi('arrow-top-right')} size={14} color={palette.accentSoft} /></View>
      </View>
    </View>
  </PressableScale>;
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={{ gap: 10, marginBottom: 6 }}><Txt variant="label" color={palette.inkMuted}>{title.toUpperCase()}</Txt><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: gutter, maxWidth: 640, width: '100%', alignSelf: 'center' },
  searchRow: { flexDirection: 'row', gap: 10, marginTop: 18, marginBottom: 14 },
  // Focus changes values only (same keys) so the TextInput is never remounted.
  search: { flex: 1, minHeight: controls.input.height, borderRadius: controls.input.height / 2, backgroundColor: palette.glass, borderWidth: 1, borderColor: palette.line, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  searchFocused: { borderColor: palette.accent, backgroundColor: palette.surfaceRaised },
  searchInput: { flex: 1, ...typography.input, lineHeight: undefined, color: palette.ink, paddingVertical: 12 },
  filterButton: { width: controls.input.height, height: controls.input.height, borderRadius: controls.input.height / 2, backgroundColor: palette.glass, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  filterActive: { borderColor: palette.accent, backgroundColor: 'rgba(34,184,245,0.12)' },
  badge: { position: 'absolute', top: 4, right: 4, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tileSlot: { width: '48.5%' },
  tile: { height: 118, borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: palette.surface, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  goalTile: { height: 176, borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: palette.surface, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  tileLabel: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12 },
  tileArrow: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,16,27,0.6)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.lineStrong },
  equipTile: { width: 108, backgroundColor: palette.surface, borderRadius: radius.md, padding: 8, gap: 8, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
  equipPhoto: { width: 90, height: 74, borderRadius: radius.xs },
  durationTile: { backgroundColor: palette.glass, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.line },
});

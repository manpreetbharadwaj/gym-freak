import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepos } from '@/store/session';
import { ActivityType, ExerciseQuery, FavoriteTarget, OnboardingAnswers, Preferences } from '@/types/domain';
import { healthAdapter } from '@/services/health';
import { useHealthSync } from '@/services/health/sync';
import { dayKey } from '@/utils/dates';

/** Cache keys in one place so mutations invalidate exactly what they change. */
export const keys = {
  home: ['home'] as const,
  quickStart: ['quick-start'] as const,
  week: ['week-plan'] as const,
  workouts: ['workouts'] as const,
  workout: (id: string) => ['workout', id] as const,
  exercises: (q: ExerciseQuery) => ['exercises', q] as const,
  exercise: (id: string) => ['exercise', id] as const,
  stories: ['stories'] as const,
  progress: ['progress'] as const,
  access: ['access'] as const,
  profile: ['profile'] as const,
  preferences: ['preferences'] as const,
  favorites: ['favorites'] as const,
  activeSession: ['active-session'] as const,
  referral: ['referral'] as const,
  plans: ['billing-plans'] as const,
  activities: (type?: ActivityType) => ['activities', type ?? 'all'] as const,
  activity: (id: string) => ['activity', id] as const,
  healthConnections: ['health-connections'] as const,
  healthToday: ['health-today'] as const,
};

/** Admin-managed Home Quick Start tiles (cached like the rest of Home; refreshed with it). */
export const useQuickStart = () => { const { gym } = useRepos(); return useQuery({ queryKey: keys.quickStart, queryFn: () => gym.listQuickStart() }); };

/** Home also seeds the stories list, so the Stories & Tips cards and the viewer always hold the same stories. */
export const useHome = () => {
  const { gym } = useRepos();
  const client = useQueryClient();
  return useQuery({ queryKey: keys.home, queryFn: async () => { const home = await gym.getHome(); client.setQueryData(keys.stories, home.stories); return home; } });
};
export const useWeekPlan = () => { const { gym } = useRepos(); return useQuery({ queryKey: keys.week, queryFn: () => gym.getWeekPlan() }); };
export const useWorkouts = () => { const { gym } = useRepos(); return useQuery({ queryKey: keys.workouts, queryFn: () => gym.listWorkouts(), staleTime: 5 * 60_000 }); };
export const useWorkout = (id: string, enabled = true) => { const { gym } = useRepos(); return useQuery({ queryKey: keys.workout(id), queryFn: () => gym.getWorkout(id), staleTime: 5 * 60_000, enabled: !!id && enabled }); };
export const useExercise = (id: string | undefined, enabled = true) => { const { gym } = useRepos(); return useQuery({ queryKey: keys.exercise(id ?? ''), queryFn: () => gym.getExercise(id!), staleTime: 10 * 60_000, enabled: !!id && enabled }); };
export const useStories = () => { const { gym } = useRepos(); return useQuery({ queryKey: keys.stories, queryFn: () => gym.listStories() }); };
export const useProgress = () => { const { gym } = useRepos(); return useQuery({ queryKey: keys.progress, queryFn: () => gym.getProgress() }); };
export const useAccess = () => { const { gym } = useRepos(); return useQuery({ queryKey: keys.access, queryFn: () => gym.getAccess() }); };
export const useProfile = () => { const { gym } = useRepos(); return useQuery({ queryKey: keys.profile, queryFn: () => gym.getProfile() }); };
export const usePreferences = () => { const { gym } = useRepos(); return useQuery({ queryKey: keys.preferences, queryFn: () => gym.getPreferences() }); };
/** The unfinished workout, if any (Home shows its live exercise count). */
export const useActiveSession = () => { const { gym } = useRepos(); return useQuery({ queryKey: keys.activeSession, queryFn: async () => (await gym.getActiveSession()) ?? null, staleTime: 30_000 }); };
/** Refer & Earn summary (code, link, server-computed stats). */
export const useReferral = (enabled = true) => { const { gym } = useRepos(); return useQuery({ queryKey: keys.referral, queryFn: () => gym.getReferral(), staleTime: 60_000, enabled }); };
/** Plans priced for the storefront country (`undefined` while it's still being resolved → query waits). */
export const usePlans = (country: string | null | undefined) => { const { gym } = useRepos(); return useQuery({ queryKey: [...keys.plans, country ?? 'default'], queryFn: () => gym.listPlans(country), enabled: country !== undefined, staleTime: 10 * 60_000 }); };
export const useFavorites = () => { const { gym } = useRepos(); return useQuery({ queryKey: keys.favorites, queryFn: () => gym.listFavorites() }); };

/** Paginated exercise library; screens call `fetchNextPage` as the list nears its end. */
export function useExerciseLibrary(filters: Omit<ExerciseQuery, 'page' | 'limit'>) {
  const { gym } = useRepos();
  return useInfiniteQuery({
    queryKey: keys.exercises(filters),
    queryFn: ({ pageParam }) => gym.listExercises({ ...filters, page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    staleTime: 5 * 60_000,
  });
}

export function useToggleFavorite() {
  const { gym } = useRepos();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, favorite }: { type: FavoriteTarget; id: string; favorite: boolean }) => gym.setFavorite(type, id, favorite),
    onMutate: async ({ type, id, favorite }) => {
      await client.cancelQueries({ queryKey: keys.favorites });
      const previous = client.getQueryData<{ type: FavoriteTarget; id: string }[]>(keys.favorites);
      client.setQueryData(keys.favorites, (current: { type: FavoriteTarget; id: string }[] = []) => (favorite ? [...current, { type, id }] : current.filter((f) => !(f.type === type && f.id === id))));
      return { previous };
    },
    onError: (_error, _vars, context) => client.setQueryData(keys.favorites, context?.previous),
    onSettled: () => client.invalidateQueries({ queryKey: keys.favorites }),
  });
}

export function useUpdatePreferences() {
  const { gym } = useRepos();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Preferences>) => gym.updatePreferences(patch),
    onMutate: (patch) => { client.setQueryData(keys.preferences, (current?: Preferences) => (current ? { ...current, ...patch, notifications: { ...current.notifications, ...patch.notifications } } : current)); },
    onSuccess: (data) => client.setQueryData(keys.preferences, data),
  });
}

export function useUpdateProfile() {
  const { gym } = useRepos();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<OnboardingAnswers>) => gym.updateProfile(patch),
    onSuccess: (profile) => { client.setQueryData(keys.profile, profile); client.invalidateQueries({ queryKey: keys.week }); client.invalidateQueries({ queryKey: keys.home }); },
  });
}

export function useUpdateBodyMetrics() {
  const { gym } = useRepos();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: { heightCm?: number; weightKg?: number }) => gym.updateBodyMetrics(patch),
    onSuccess: (profile) => { client.setQueryData(keys.profile, profile); client.invalidateQueries({ queryKey: keys.home }); },
  });
}

export function useMarkStoryViewed() {
  const { gym } = useRepos();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed?: boolean }) => gym.markStoryViewed(id, completed),
    onMutate: ({ id }) => { client.setQueryData(keys.stories, (s?: { id: string; viewed: boolean }[]) => s?.map((x) => (x.id === id ? { ...x, viewed: true } : x))); },
    onSettled: () => client.invalidateQueries({ queryKey: keys.home }),
  });
}

/** After a workout finishes, everything derived from sessions is stale. */
export function useInvalidateAfterWorkout() {
  const client = useQueryClient();
  return () => Promise.all([keys.home, keys.week, keys.progress, keys.activeSession].map((queryKey) => client.invalidateQueries({ queryKey })));
}

/* ───────────── Activity tracking (FREE) ───────────── */

export function useActivities(type?: ActivityType) {
  const { gym } = useRepos();
  return useInfiniteQuery({
    queryKey: keys.activities(type),
    queryFn: ({ pageParam }) => gym.listActivities({ type, before: pageParam ?? undefined, limit: 20 }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}

export const useActivity = (id: string) => { const { gym } = useRepos(); return useQuery({ queryKey: keys.activity(id), queryFn: () => gym.getActivity(id), enabled: !!id }); };
export const useHealthConnections = () => { const { gym } = useRepos(); return useQuery({ queryKey: keys.healthConnections, queryFn: () => gym.getHealthConnections() }); };

/** Today's platform totals (steps / distance / active energy), read on the device — only when the user connected a health app. */
export function useHealthToday() {
  const sync = useHealthSync();
  return useQuery({
    queryKey: [...keys.healthToday, sync.enabled, sync.lastSuccessAt],
    queryFn: async () => {
      const adapter = healthAdapter();
      if (!adapter || !sync.enabled) return null;
      const [today] = await adapter.daily([dayKey(new Date())]);
      return today ?? null;
    },
    staleTime: 60_000,
  });
}

/** After saving / deleting / importing activities, everything derived from them is stale. */
export function useInvalidateActivities() {
  const client = useQueryClient();
  return () => Promise.all([['activities'], keys.progress, keys.home, keys.healthToday, keys.healthConnections].map((queryKey) => client.invalidateQueries({ queryKey })));
}

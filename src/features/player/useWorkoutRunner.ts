import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ActiveSessionConflict } from '@/services/repositories';
import { useRepos } from '@/store/session';
import { Exercise, SetUpdate, Workout, WorkoutSession } from '@/types/domain';

export interface Cursor { exercise: number; set: number }
/** `conflict`: another workout is unfinished; the screen asks to resume or discard it. */
export type Phase = 'starting' | 'conflict' | 'work' | 'rest' | 'finishing' | 'error';

/**
 * Drives one workout session against the HealthyMe session API.
 * Set completions are applied locally first and flushed in the background with retry,
 * so a flaky gym connection never blocks the next set.
 */
export function useWorkoutRunner(workout: Workout | undefined) {
  const { gym } = useRepos();
  const [session, setSession] = useState<WorkoutSession>();
  const [phase, setPhase] = useState<Phase>('starting');
  const [error, setError] = useState<unknown>();
  const [cursor, setCursor] = useState<Cursor>({ exercise: 0, set: 0 });
  const [conflict, setConflict] = useState<WorkoutSession>();
  const [changing, setChanging] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const pending = useRef(new Map<string, SetUpdate>());
  const flushing = useRef<Promise<void> | null>(null);
  const startedAt = useRef(Date.now());
  const sessionRef = useRef<WorkoutSession | undefined>(undefined);
  sessionRef.current = session;

  const activeMs = useCallback(() => Date.now() - startedAt.current, []);

  const start = useCallback(async (options?: { discardActive?: boolean }) => {
    if (!workout) return;
    setPhase('starting'); setError(undefined); setConflict(undefined);
    try {
      const next = await gym.startSession(workout.id, options);
      startedAt.current = Date.now() - next.activeDurationMs;
      setSession(next);
      // Resuming: continue at the first set that isn't done yet.
      const exercise = next.exercises.findIndex((e) => e.sets.some((s) => !s.completed));
      const set = exercise >= 0 ? next.exercises[exercise].sets.findIndex((s) => !s.completed) : 0;
      setCursor({ exercise: Math.max(0, exercise), set: Math.max(0, set) });
      setPhase('work');
    } catch (e) {
      if (e instanceof ActiveSessionConflict) { setConflict(e.active); setPhase('conflict'); return; }
      setError(e); setPhase('error');
    }
  }, [gym, workout]);

  useEffect(() => { if (workout && !sessionRef.current) start(); }, [start, workout]);

  const flush = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || !pending.current.size) return;
    if (flushing.current) return flushing.current;
    const batch = [...pending.current.values()];
    flushing.current = gym.updateSets(current.id, batch, activeMs())
      .then(() => { batch.forEach((u) => { if (pending.current.get(u.setId) === u) pending.current.delete(u.setId); }); setSyncFailed(false); })
      .catch(() => setSyncFailed(true))
      .finally(() => { flushing.current = null; });
    return flushing.current;
  }, [activeMs, gym]);

  // Retry unsynced sets periodically and whenever the app comes back to the foreground.
  useEffect(() => {
    const timer = setInterval(() => { if (pending.current.size) flush(); }, 8000);
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') flush(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [flush]);

  const exercises = session?.exercises ?? [];
  const current = exercises[cursor.exercise];
  /** The template's copy of the current exercise, when it is one (replaced/added ones are fetched by the screen). */
  const templateExercise = useMemo(() => workout?.exercises.find((w) => w.exerciseId === current?.exerciseId)?.exercise, [current?.exerciseId, workout]);
  const completedSets = exercises.reduce((t, e) => t + e.sets.filter((s) => s.completed).length, 0);
  const totalSets = exercises.reduce((t, e) => t + e.sets.length, 0);
  const isLastSet = !!current && cursor.exercise === exercises.length - 1 && cursor.set === current.sets.length - 1;

  /** Marks the current set done; returns whether there is a following set (→ rest). */
  const completeSet = useCallback((values: { reps?: number; weightKg?: number; durationSeconds?: number }) => {
    if (!current) return false;
    const set = current.sets[cursor.set];
    const update: SetUpdate = { setId: set.id, completed: true, ...values };
    pending.current.set(set.id, update);
    setSession((s) => s && { ...s, exercises: s.exercises.map((e, i) => (i !== cursor.exercise ? e : { ...e, sets: e.sets.map((x) => (x.id === set.id ? { ...x, ...values, completed: true } : x)) })) });
    flush();
    if (cursor.set < current.sets.length - 1) { setCursor({ exercise: cursor.exercise, set: cursor.set + 1 }); return true; }
    if (cursor.exercise < exercises.length - 1) { setCursor({ exercise: cursor.exercise + 1, set: 0 }); return true; }
    return false;
  }, [current, cursor, exercises.length, flush]);

  const goToExercise = useCallback((index: number) => {
    const target = exercises[index];
    if (!target) return;
    const firstOpen = target.sets.findIndex((s) => !s.completed);
    setCursor({ exercise: index, set: firstOpen >= 0 ? firstOpen : target.sets.length - 1 });
    setPhase('work');
  }, [exercises]);

  const finish = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession) return undefined;
    setPhase('finishing');
    try {
      await flush();
      if (pending.current.size) await flush();
      const done = await gym.completeSession(currentSession.id, activeMs());
      return done;
    } catch (e) { setError(e); setPhase('work'); throw e; }
  }, [activeMs, flush, gym]);

  const quit = useCallback(async () => { const s = sessionRef.current; if (s) await gym.cancelSession(s.id).catch(() => undefined); }, [gym]);

  /** Server-side session edits need the latest set state first, so the split of done/remaining sets is right. */
  const syncedEdit = useCallback(async (edit: (s: WorkoutSession) => Promise<WorkoutSession>) => {
    const currentSession = sessionRef.current;
    if (!currentSession) return undefined;
    setChanging(true);
    try {
      await flush();
      if (pending.current.size) { await flush(); if (pending.current.size) throw new Error('unsynced'); }
      const next = await edit(currentSession);
      setSession(next);
      return next;
    } finally { setChanging(false); }
  }, [flush]);

  /** Replaces the current exercise for this session only; done sets stay with the original. */
  const replace = useCallback(async (exercise: Exercise) => {
    const row = current;
    const at = cursor.exercise;
    if (!row) return;
    const next = await syncedEdit((s) => gym.replaceSessionExercise(s.id, row.id, exercise.id));
    if (!next) return;
    // Continue at the first open set from this position (a split puts the replacement right after).
    const index = next.exercises.findIndex((e, i) => i >= at && e.sets.some((x) => !x.completed));
    const target = index >= 0 ? index : at;
    setCursor({ exercise: target, set: Math.max(0, next.exercises[target].sets.findIndex((x) => !x.completed)) });
    setPhase('work');
  }, [current, cursor.exercise, gym, syncedEdit]);

  /** Appends an exercise to this session only (the workout template is unchanged). */
  const add = useCallback(async (exercise: Exercise) => { await syncedEdit((s) => gym.addSessionExercise(s.id, exercise.id)); }, [gym, syncedEdit]);

  return {
    session, phase, setPhase, error, retry: () => start(), cursor, current, templateExercise, exercises, completedSets, totalSets, isLastSet, syncFailed,
    completeSet, goToExercise, finish, quit, activeMs, replace, add, changing,
    conflict, discardAndStart: () => start({ discardActive: true }),
  };
}

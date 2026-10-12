import { useCallback, useEffect, useSyncExternalStore } from 'react';
import * as Crypto from 'expo-crypto';
import { AppState } from 'react-native';
import { useRepos, useSession } from '@/store/session';
import type { GymRepository } from '@/services/repositories/types';
import type { NoteInput, OrganizerSnapshot, PersonalNote, PersonalReminder, ReminderCategory, ReminderInput } from '@/types/domain';
import { safeStorage } from './safeStorage';

const CATEGORY_IDS = ['medication', 'hydration', 'sleep', 'workout', 'nutrition', 'personal', 'appointment', 'custom'] as const;
const CATEGORY_META: Record<(typeof CATEGORY_IDS)[number], [string, string, string]> = {
  medication: ['Medication', 'pill', '#FF6B7E'], hydration: ['Hydration', 'water', '#63D8FF'], sleep: ['Sleep', 'moon', '#7A5CFF'], workout: ['Workout', 'workout', '#22B8F5'],
  nutrition: ['Nutrition', 'nutrition', '#8BE04E'], personal: ['Personal', 'user', '#FFD166'], appointment: ['Appointment', 'calendar', '#FFA24C'], custom: ['Custom', 'bookmark', '#A7B0C0'],
};
export const bundledReminderCategories: ReminderCategory[] = CATEGORY_IDS.map((key, index) => ({ id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, systemKey: key, name: CATEGORY_META[key][0], icon: CATEGORY_META[key][1], color: CATEGORY_META[key][2], enabled: true, sortOrder: (index + 1) * 10 }));

type Mutation =
  | { key: string; type: 'category.create'; localId: string; input: Pick<ReminderCategory, 'name' | 'icon' | 'color'> & { description?: string | null } }
  | { key: string; type: 'category.delete'; id: string }
  | { key: string; type: 'note.create'; localId: string; input: NoteInput }
  | { key: string; type: 'note.update'; id: string; input: Partial<NoteInput> & { baseRevision?: number } }
  | { key: string; type: 'note.delete'; id: string }
  | { key: string; type: 'reminder.create'; localId: string; input: ReminderInput }
  | { key: string; type: 'reminder.update'; id: string; input: Partial<ReminderInput> & { baseRevision?: number } }
  | { key: string; type: 'reminder.delete'; id: string }
  | { key: string; type: 'reminder.complete'; id: string; occurrenceAt: string; source: 'APP' | 'NOTIFICATION' }
  | { key: string; type: 'reminder.snooze'; id: string; occurrenceAt: string; minutes: 5 | 10 | 15 };

interface OrganizerCache extends OrganizerSnapshot { pending: Mutation[] }
interface StoreState extends OrganizerCache { loaded: boolean; syncing: boolean; offline: boolean; error?: string; accountId?: string }
const empty = (): StoreState => ({ loaded: false, syncing: false, offline: false, syncedAt: '', categories: bundledReminderCategories, notes: [], reminders: [], completions: [], snoozes: [], pending: [] });
let state = empty();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
const storageKey = (accountId: string) => `organizer.${accountId}`;
const NOTIFICATION_ACTIONS_KEY = 'organizer.notification-actions.v1';
type DeferredNotificationAction = { type: 'complete'; id: string; occurrenceAt: string } | { type: 'snooze'; id: string; occurrenceAt: string; minutes: 5 | 10 | 15 };
let persistence = Promise.resolve<void>(undefined);
const persist = () => {
  if (!state.accountId) return Promise.resolve();
  const key = storageKey(state.accountId);
  const snapshot = { syncedAt: state.syncedAt, categories: state.categories, notes: state.notes, reminders: state.reminders, completions: state.completions, snoozes: state.snoozes, config: state.config, pending: state.pending };
  persistence = persistence.then(() => safeStorage.set(key, snapshot)).catch(() => undefined);
  return persistence;
};
const setState = (patch: Partial<StoreState>) => { state = { ...state, ...patch }; emit(); void persist(); };
const localId = () => `local-${Crypto.randomUUID()}`;
const now = () => new Date().toISOString();
let activeRepo: GymRepository | null = null;
let loadingFor = '';

async function deferNotificationAction(action: DeferredNotificationAction) {
  const actions = await safeStorage.get<DeferredNotificationAction[]>(NOTIFICATION_ACTIONS_KEY, []);
  if (!actions.some((item) => JSON.stringify(item) === JSON.stringify(action))) await safeStorage.set(NOTIFICATION_ACTIONS_KEY, [...actions, action]);
}

async function drainNotificationActions() {
  const actions = await safeStorage.get<DeferredNotificationAction[]>(NOTIFICATION_ACTIONS_KEY, []);
  const remaining: DeferredNotificationAction[] = [];
  actions.forEach((action) => {
    if (!state.reminders.some((item) => item.id === action.id)) { remaining.push(action); return; }
    if (action.type === 'complete') completeReminderFromNotification(action.id, action.occurrenceAt);
    else snoozeReminderFromNotification(action.id, action.occurrenceAt, action.minutes);
  });
  await safeStorage.set(NOTIFICATION_ACTIONS_KEY, remaining);
}

function replaceMutationId(oldId: string, id: string) {
  state.pending = state.pending.map((m) => 'id' in m && m.id === oldId ? { ...m, id } : m).map((item) => replaceMutationNoteId(item, oldId, id));
  state.reminders = state.reminders.map((r) => r.noteId === oldId ? { ...r, noteId: id } : r);
  state.completions = state.completions.map((item) => item.reminderId === oldId ? { ...item, reminderId: id } : item);
  state.snoozes = state.snoozes.map((item) => item.reminderId === oldId ? { ...item, reminderId: id } : item);
}

function replaceMutationCategoryId(mutation: Mutation, oldId: string, id: string | null): Mutation {
  switch (mutation.type) {
    case 'note.create':
      return mutation.input.categoryId === oldId
        ? { ...mutation, input: { ...mutation.input, categoryId: id } }
        : mutation;
    case 'note.update':
      return mutation.input.categoryId === oldId
        ? { ...mutation, input: { ...mutation.input, categoryId: id } }
        : mutation;
    case 'reminder.create':
      return mutation.input.categoryId === oldId
        ? { ...mutation, input: { ...mutation.input, categoryId: id } }
        : mutation;
    case 'reminder.update':
      return mutation.input.categoryId === oldId
        ? { ...mutation, input: { ...mutation.input, categoryId: id } }
        : mutation;
    default:
      return mutation;
  }
}

function replaceMutationNoteId(mutation: Mutation, noteId: string, replacement: string | null): Mutation {
  if (mutation.type === 'reminder.create') {
    return mutation.input.noteId === noteId ? { ...mutation, input: { ...mutation.input, noteId: replacement } } : mutation;
  }
  if (mutation.type === 'reminder.update') {
    return mutation.input.noteId === noteId ? { ...mutation, input: { ...mutation.input, noteId: replacement } } : mutation;
  }
  return mutation;
}

async function flush(repo: GymRepository) {
  while (state.pending.length) {
    const mutation = state.pending[0];
    if (mutation.type === 'category.create') {
      const saved = await repo.createReminderCategory(mutation.input);
      state.categories = state.categories.map((c) => c.id === mutation.localId ? saved : c);
      state.notes = state.notes.map((n) => n.categoryId === mutation.localId ? { ...n, categoryId: saved.id } : n);
      state.reminders = state.reminders.map((r) => r.categoryId === mutation.localId ? { ...r, categoryId: saved.id } : r);
      state.pending = state.pending.map((item) => replaceMutationCategoryId(item, mutation.localId, saved.id));
    } else if (mutation.type === 'category.delete') await repo.deleteReminderCategory(mutation.id);
    else if (mutation.type === 'note.create') {
      const saved = await repo.createNote(mutation.input); replaceMutationId(mutation.localId, saved.id); state.notes = state.notes.map((n) => n.id === mutation.localId ? saved : n);
    } else if (mutation.type === 'note.update') {
      const saved = await repo.updateNote(mutation.id, mutation.input); state.notes = state.notes.map((n) => n.id === mutation.id ? saved : n);
    } else if (mutation.type === 'note.delete') await repo.deleteNote(mutation.id);
    else if (mutation.type === 'reminder.create') {
      const saved = await repo.createReminder(mutation.input); replaceMutationId(mutation.localId, saved.id); state.reminders = state.reminders.map((r) => r.id === mutation.localId ? saved : r);
    } else if (mutation.type === 'reminder.update') {
      const saved = await repo.updateReminder(mutation.id, mutation.input); state.reminders = state.reminders.map((r) => r.id === mutation.id ? saved : r);
    } else if (mutation.type === 'reminder.delete') await repo.deleteReminder(mutation.id);
    else if (mutation.type === 'reminder.complete') await repo.completeReminder(mutation.id, mutation.occurrenceAt, mutation.source);
    else if (mutation.type === 'reminder.snooze') await repo.snoozeReminder(mutation.id, mutation.occurrenceAt, mutation.minutes);
    state.pending = state.pending.slice(1); await persist();
  }
}

async function sync(repo = activeRepo) {
  if (!repo || state.syncing || !state.accountId) return;
  setState({ syncing: true, error: undefined });
  try {
    await flush(repo);
    const remote = await repo.getOrganizer();
    setState({ ...remote, pending: [], syncing: false, offline: false });
  } catch (error) {
    setState({ syncing: false, offline: true, error: error instanceof Error ? error.message : 'Sync unavailable' });
  }
}

async function load(accountId: string, repo: GymRepository) {
  activeRepo = repo;
  if (loadingFor === accountId) return;
  loadingFor = accountId;
  state = { ...empty(), accountId };
  const cached = await safeStorage.get<OrganizerCache | null>(storageKey(accountId), null);
  state = { ...state, ...(cached ?? {}), categories: cached?.categories?.length ? cached.categories : bundledReminderCategories, loaded: true };
  emit(); await drainNotificationActions(); void sync(repo);
}

function queue(mutation: Mutation) { setState({ pending: [...state.pending, mutation], offline: state.offline }); void sync(); }

export function useOrganizer() {
  const repos = useRepos(); const { account } = useSession();
  const snapshot = useSyncExternalStore(subscribe, () => state);
  useEffect(() => { if (account?.id) void load(account.id, repos.gym); }, [account?.id, repos.gym]);
  useEffect(() => { const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void sync(repos.gym); }); return () => sub.remove(); }, [repos.gym]);

  const createNote = useCallback((input: Omit<NoteInput, 'clientId'>) => {
    const clientId = Crypto.randomUUID(); const id = localId(); const timestamp = now();
    const note: PersonalNote = { id, clientId, title: input.title.trim(), description: input.description?.trim() || null, categoryId: input.categoryId ?? null, pinned: input.pinned ?? false, archived: input.archived ?? false, revision: 0, createdAt: timestamp, updatedAt: timestamp };
    setState({ notes: [note, ...state.notes] }); queue({ key: Crypto.randomUUID(), type: 'note.create', localId: id, input: { ...input, clientId } }); return note;
  }, []);
  const updateNote = useCallback((id: string, patch: Partial<NoteInput>) => {
    const original = state.notes.find((n) => n.id === id); if (!original) return;
    setState({ notes: state.notes.map((n) => n.id === id ? { ...n, ...patch, updatedAt: now() } : n) });
    const create = state.pending.find((m): m is Extract<Mutation, { type: 'note.create' }> => m.type === 'note.create' && m.localId === id);
    if (create) { create.input = { ...create.input, ...patch }; setState({ pending: [...state.pending] }); } else queue({ key: Crypto.randomUUID(), type: 'note.update', id, input: { ...patch, baseRevision: original.revision } });
  }, []);
  const deleteNote = useCallback((id: string) => {
    setState({ notes: state.notes.filter((n) => n.id !== id), reminders: state.reminders.map((r) => r.noteId === id ? { ...r, noteId: null } : r) });
    const create = state.pending.find((m) => m.type === 'note.create' && m.localId === id);
    if (create) setState({ pending: state.pending.filter((m) => m !== create).map((item) => replaceMutationNoteId(item, id, null)) }); else queue({ key: Crypto.randomUUID(), type: 'note.delete', id });
  }, []);
  const createReminder = useCallback((input: Omit<ReminderInput, 'clientId'>) => {
    const clientId = Crypto.randomUUID(); const id = localId(); const timestamp = now();
    const reminder: PersonalReminder = { id, clientId, title: input.title.trim(), description: input.description?.trim() || null, categoryId: input.categoryId ?? null, noteId: input.noteId ?? null, scheduledAt: input.scheduledAt, timezone: input.timezone, repeatType: input.repeatType, recurrence: input.recurrence ?? {}, endAt: input.endAt ?? null, advanceMinutes: input.advanceMinutes ?? 0, notificationEnabled: input.notificationEnabled ?? true, hideDescriptionOnLock: input.hideDescriptionOnLock ?? false, status: input.status ?? 'ACTIVE', revision: 0, createdAt: timestamp, updatedAt: timestamp };
    setState({ reminders: [...state.reminders, reminder].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)) }); queue({ key: Crypto.randomUUID(), type: 'reminder.create', localId: id, input: { ...input, clientId } }); return reminder;
  }, []);
  const updateReminder = useCallback((id: string, patch: Partial<ReminderInput>) => {
    const original = state.reminders.find((r) => r.id === id); if (!original) return;
    setState({ reminders: state.reminders.map((r) => r.id === id ? { ...r, ...patch, updatedAt: now() } : r) });
    const create = state.pending.find((m): m is Extract<Mutation, { type: 'reminder.create' }> => m.type === 'reminder.create' && m.localId === id);
    if (create) { create.input = { ...create.input, ...patch }; setState({ pending: [...state.pending] }); } else queue({ key: Crypto.randomUUID(), type: 'reminder.update', id, input: { ...patch, baseRevision: original.revision } });
  }, []);
  const deleteReminder = useCallback((id: string) => {
    setState({ reminders: state.reminders.filter((r) => r.id !== id) });
    const create = state.pending.find((m) => m.type === 'reminder.create' && m.localId === id);
    if (create) setState({ pending: state.pending.filter((m) => m !== create) }); else queue({ key: Crypto.randomUUID(), type: 'reminder.delete', id });
  }, []);
  const complete = useCallback((id: string, occurrenceAt = now(), source: 'APP' | 'NOTIFICATION' = 'APP') => {
    const reminder = state.reminders.find((r) => r.id === id); if (!reminder) return;
    const completedAt = now();
    setState({
      reminders: state.reminders.map((r) => r.id === id ? { ...r, lastCompletedAt: completedAt, ...(r.repeatType === 'ONCE' ? { status: 'COMPLETED' as const } : {}) } : r),
      completions: state.completions.some((item) => item.reminderId === id && item.occurrenceAt === occurrenceAt) ? state.completions : [{ id: localId(), reminderId: id, occurrenceAt, completedAt, source }, ...state.completions],
    });
    queue({ key: Crypto.randomUUID(), type: 'reminder.complete', id, occurrenceAt, source });
  }, []);
  const snooze = useCallback((id: string, occurrenceAt: string, minutes: 5 | 10 | 15) => {
    const createdAt = now();
    setState({ snoozes: [{ id: localId(), reminderId: id, originalScheduledAt: occurrenceAt, snoozedUntil: new Date(Date.now() + minutes * 60_000).toISOString(), minutes, createdAt }, ...state.snoozes] });
    queue({ key: Crypto.randomUUID(), type: 'reminder.snooze', id, occurrenceAt, minutes });
  }, []);
  const createCategory = useCallback((input: Pick<ReminderCategory, 'name' | 'icon' | 'color'> & { description?: string | null }) => {
    const id = localId(); const category: ReminderCategory = { id, userId: account?.id, systemKey: null, enabled: true, sortOrder: 1000, ...input };
    setState({ categories: [...state.categories, category] }); queue({ key: Crypto.randomUUID(), type: 'category.create', localId: id, input }); return category;
  }, [account?.id]);
  const deleteCategory = useCallback((id: string) => {
    const category = state.categories.find((c) => c.id === id); if (!category || !category.userId) return;
    setState({ categories: state.categories.filter((c) => c.id !== id), notes: state.notes.map((n) => n.categoryId === id ? { ...n, categoryId: null } : n), reminders: state.reminders.map((r) => r.categoryId === id ? { ...r, categoryId: null } : r) });
    const create = state.pending.find((m) => m.type === 'category.create' && m.localId === id);
    if (create) setState({ pending: state.pending.filter((m) => m !== create).map((item) => replaceMutationCategoryId(item, id, null)) }); else queue({ key: Crypto.randomUUID(), type: 'category.delete', id });
  }, []);
  return { ...snapshot, refresh: () => sync(repos.gym), createNote, updateNote, deleteNote, createReminder, updateReminder, deleteReminder, complete, snooze, createCategory, deleteCategory };
}

export function completeReminderFromNotification(id: string, occurrenceAt: string) {
  const reminder = state.reminders.find((r) => r.id === id); if (!reminder) { void deferNotificationAction({ type: 'complete', id, occurrenceAt }); return; }
  const completedAt = now();
  setState({ reminders: state.reminders.map((r) => r.id === id ? { ...r, lastCompletedAt: completedAt, ...(r.repeatType === 'ONCE' ? { status: 'COMPLETED' as const } : {}) } : r), completions: state.completions.some((item) => item.reminderId === id && item.occurrenceAt === occurrenceAt) ? state.completions : [{ id: localId(), reminderId: id, occurrenceAt, completedAt, source: 'NOTIFICATION' }, ...state.completions] });
  queue({ key: Crypto.randomUUID(), type: 'reminder.complete', id, occurrenceAt, source: 'NOTIFICATION' });
}

export function snoozeReminderFromNotification(id: string, occurrenceAt: string, minutes: 5 | 10 | 15) {
  if (!state.reminders.some((item) => item.id === id)) { void deferNotificationAction({ type: 'snooze', id, occurrenceAt, minutes }); return; }
  const createdAt = now();
  setState({ snoozes: [{ id: localId(), reminderId: id, originalScheduledAt: occurrenceAt, snoozedUntil: new Date(Date.now() + minutes * 60_000).toISOString(), minutes, createdAt }, ...state.snoozes] });
  queue({ key: Crypto.randomUUID(), type: 'reminder.snooze', id, occurrenceAt, minutes });
}

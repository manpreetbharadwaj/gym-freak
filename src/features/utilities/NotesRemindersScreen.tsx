import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomSheet, FilterChip, TextField, ToggleRow } from '@/components/inputs';
import { PrimaryButton, SecondaryButton, TextButton } from '@/components/buttons';
import { SkeletonList } from '@/components/feedback';
import { Card, Header, Screen, Section } from '@/components/layout';
import { Icon, icons, type IconName } from '@/components/Icon';
import { PressableScale, Txt } from '@/components/primitives';
import { SwipeRow } from '@/components/swipe';
import { haptics } from '@/utils/haptics';
import { useOrganizer } from '@/services/storage/organizer';
import { notificationPermission } from '@/services/notifications';
import type { NoteInput, PersonalNote, PersonalReminder, ReminderCategory, ReminderInput, ReminderRepeatType } from '@/types/domain';
import type { RootStackParamList } from '@/navigation/types';
import { fonts, palette, pressScales, radius, scenes } from '@/theme';
import { useDialog } from '@/components/dialogs/DialogProvider';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const repeats: { value: ReminderRepeatType; label: string }[] = [{ value: 'ONCE', label: 'One time' }, { value: 'DAILY', label: 'Every day' }, { value: 'WEEKDAYS', label: 'Selected weekdays' }, { value: 'WEEKLY', label: 'Every week' }, { value: 'MONTHLY', label: 'Every month' }, { value: 'CUSTOM', label: 'Custom interval' }];
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const safeIcon = (name?: string): IconName => name && name in icons ? name as IconName : 'bookmark';

export function NotesRemindersScreen() {
  const dialog = useDialog();
  const navigation = useNavigation<Nav>(); const route = useRoute<RouteProp<RootStackParamList, 'NotesReminders'>>(); const store = useOrganizer();
  const [tab, setTab] = useState<'notes' | 'reminders'>('notes'); const [search, setSearch] = useState(''); const [archived, setArchived] = useState(false);
  const [noteEdit, setNoteEdit] = useState<PersonalNote | null | 'new'>(null); const [reminderEdit, setReminderEdit] = useState<PersonalReminder | null | 'new'>(null); const [categoryOpen, setCategoryOpen] = useState(false);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const openedReminder = useRef<string | null>(null);
  useEffect(() => { void notificationPermission().then(setPermission); }, []);
  useEffect(() => {
    const id = route.params?.reminderId;
    if (!id || openedReminder.current === id) return;
    const reminder = store.reminders.find((item) => item.id === id);
    if (reminder) { openedReminder.current = id; setTab('reminders'); setReminderEdit(reminder); }
  }, [route.params?.reminderId, store.reminders]);
  const q = search.trim().toLowerCase();
  const notes = useMemo(() => store.notes.filter((note) => note.archived === archived && (!q || `${note.title} ${note.description ?? ''}`.toLowerCase().includes(q))).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)), [store.notes, archived, q]);
  const reminders = useMemo(() => store.reminders.filter((r) => r.status !== 'CANCELLED' && (!q || `${r.title} ${r.description ?? ''}`.toLowerCase().includes(q))).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)), [store.reminders, q]);
  const category = (id?: string | null) => store.categories.find((c) => c.id === id);
  const deleteNote = (id: string) => { void dialog.showDestructiveConfirm({ title: 'Delete note?', description: 'This removes the note from your synced account.', confirmLabel: 'Delete', onConfirm: () => store.deleteNote(id) }); };
  const deleteReminder = (id: string) => { void dialog.showDestructiveConfirm({ title: 'Delete reminder?', description: 'Pending device notifications will be cancelled on the next schedule refresh.', confirmLabel: 'Delete', onConfirm: () => store.deleteReminder(id) }); };
  if (!store.loaded) return <Screen scene={scenes.violet} header={<Header title="Notes & Reminders" onBack={() => navigation.goBack()} />}><SkeletonList rows={4} height={90} /></Screen>;
  return <Screen scene={scenes.violet} header={<Header title="Notes & Reminders" onBack={() => navigation.goBack()} right={<Pressable onPress={() => setCategoryOpen(true)} accessibilityRole="button" accessibilityLabel="Manage categories"><Icon name="settings" color={palette.accent} /></Pressable>} />} refreshing={store.syncing} onRefresh={store.refresh}>
    {store.offline ? <View style={styles.offline}><Icon name="cloudAlert" size="sm" color={palette.orange} /><Txt variant="small" color={palette.orange}>Offline — changes are saved on this device and will sync automatically.</Txt></View> : null}
    {permission === 'denied' ? <Pressable style={styles.offline} onPress={() => Linking.openSettings()}><Icon name="bell" size="sm" color={palette.orange} /><Txt variant="small" color={palette.orange}>Notifications are disabled. Reminders will sync, but this device cannot alert you. Open device settings.</Txt></Pressable> : null}
    <View style={styles.tabs}><FilterChip label="Notes" active={tab === 'notes'} onPress={() => setTab('notes')} glyph={{ set: 'mdi', name: 'file-document-outline' }} /><FilterChip label="Reminders" active={tab === 'reminders'} onPress={() => setTab('reminders')} glyph={{ set: 'mdi', name: 'bell-outline' }} /></View>
    <View style={styles.search}><Icon name="search" size="sm" color={palette.inkMuted} /><TextInput value={search} onChangeText={setSearch} placeholder={`Search ${tab}`} placeholderTextColor={palette.inkFaint} style={styles.searchInput} /></View>
    {tab === 'notes' ? <>
      <View style={styles.actions}><TextButton label={archived ? 'Show active notes' : 'Show archive'} onPress={() => setArchived(!archived)} /><PrimaryButton label="New Note" icon="plus" onPress={() => setNoteEdit('new')} size="compact" /></View>
      {!notes.length ? <Empty icon="document" title={archived ? 'No archived notes' : 'No notes yet'} body="Keep ideas, wellness observations, and personal tasks here." /> : notes.map((note) => <NoteCard key={note.id} note={note} category={category(note.categoryId)} onEdit={() => setNoteEdit(note)} onPin={() => store.updateNote(note.id, { pinned: !note.pinned })} onArchive={() => store.updateNote(note.id, { archived: !note.archived })} onDelete={() => deleteNote(note.id)} />)}
    </> : <>
      <View style={styles.actions}><Txt variant="small" color={palette.inkMuted}>{reminders.filter((r) => r.status === 'ACTIVE').length} active</Txt><PrimaryButton label="New Reminder" icon="plus" onPress={() => setReminderEdit('new')} size="compact" /></View>
      {!reminders.length ? <Empty icon="bell" title="No reminders yet" body="Create a one-time or recurring reminder. It can work locally without internet." /> : reminders.map((reminder) => <ReminderCard key={reminder.id} reminder={reminder} category={category(reminder.categoryId)} onEdit={() => setReminderEdit(reminder)} onDone={() => { store.complete(reminder.id, reminder.scheduledAt); haptics.success(); }} onDelete={() => deleteReminder(reminder.id)} />)}
      {store.completions.length ? <Section title="Reminder history">{store.completions.slice(0, 10).map((completion) => <View key={completion.id} style={styles.historyRow}><Icon name="checkCircle" size="sm" color={palette.success} /><View style={{ flex: 1 }}><Txt variant="label">{store.reminders.find((r) => r.id === completion.reminderId)?.title ?? 'Completed reminder'}</Txt><Txt variant="small" color={palette.inkMuted}>{new Date(completion.completedAt).toLocaleString()}</Txt></View></View>)}</Section> : null}
    </>}
    {noteEdit ? <NoteEditor value={noteEdit === 'new' ? null : noteEdit} categories={store.categories} onClose={() => setNoteEdit(null)} onSave={(input) => { if (noteEdit === 'new') store.createNote(input); else store.updateNote(noteEdit.id, input); setNoteEdit(null); }} /> : null}
    {reminderEdit ? <ReminderEditor value={reminderEdit === 'new' ? null : reminderEdit} categories={store.categories} notes={store.notes.filter((n) => !n.archived)} reminders={store.reminders} allowedRepeats={store.config?.allowedRepeatPatterns ?? repeats.map((item) => item.value)} permission={permission} onPermission={setPermission} onClose={() => setReminderEdit(null)} onSave={(input) => { if (reminderEdit === 'new') store.createReminder(input); else store.updateReminder(reminderEdit.id, input); setReminderEdit(null); }} /> : null}
    {categoryOpen ? <CategoryManager categories={store.categories} onCreate={store.createCategory} onDelete={store.deleteCategory} onClose={() => setCategoryOpen(false)} /> : null}
  </Screen>;
}

function NoteCard({ note, category, onEdit, onPin, onArchive, onDelete }: { note: PersonalNote; category?: ReminderCategory; onEdit: () => void; onPin: () => void; onArchive: () => void; onDelete: () => void }) {
  return <SwipeRow actions={[{ key: 'archive', label: note.archived ? 'Restore' : 'Archive', icon: note.archived ? 'replay' : 'history', color: palette.accent, onPress: onArchive }, { key: 'delete', label: 'Delete', icon: 'delete', color: palette.danger, onPress: onDelete }]}>
  <PressableScale onPress={onEdit} haptic={null} scaleTo={pressScales.card} containerStyle={{ marginBottom: 12 }}><Card style={[styles.card, note.pinned && { borderColor: palette.yellow }]}>
    <View style={styles.cardTop}><CategoryBadge category={category} /><View style={styles.miniActions}><MiniIcon name={note.pinned ? 'bookmark' : 'pin' as IconName} fallback="bookmark" label="Pin note" onPress={onPin} /><MiniIcon name={note.archived ? 'replay' : 'archive' as IconName} fallback="history" label="Archive note" onPress={onArchive} /><MiniIcon name="delete" label="Delete note" color={palette.danger} onPress={onDelete} /></View></View>
    <Txt variant="h3">{note.title}</Txt>{note.description ? <Txt variant="small" color={palette.inkMuted} numberOfLines={3}>{note.description}</Txt> : null}
    <Txt variant="tab" color={palette.inkFaint}>{new Date(note.updatedAt).toLocaleString()}</Txt>
  </Card></PressableScale></SwipeRow>;
}

function ReminderCard({ reminder, category, onEdit, onDone, onDelete }: { reminder: PersonalReminder; category?: ReminderCategory; onEdit: () => void; onDone: () => void; onDelete: () => void }) {
  const done = reminder.status === 'COMPLETED';
  return <SwipeRow actions={[...(!done ? [{ key: 'done', label: 'Done', icon: 'checkCircle' as const, color: palette.success, onPress: onDone }] : []), { key: 'delete', label: 'Delete', icon: 'delete', color: palette.danger, onPress: onDelete }]}>
  <PressableScale onPress={onEdit} haptic={null} scaleTo={pressScales.card} containerStyle={{ marginBottom: 12 }}><Card style={[styles.card, done && { opacity: 0.65 }]}>
    <View style={styles.cardTop}><CategoryBadge category={category} /><View style={styles.miniActions}>{!done ? <MiniIcon name="checkCircle" label="Mark done" color={palette.success} onPress={onDone} /> : null}<MiniIcon name="delete" label="Delete reminder" color={palette.danger} onPress={onDelete} /></View></View>
    <Txt variant="h3">{reminder.title}</Txt>{reminder.description ? <Txt variant="small" color={palette.inkMuted} numberOfLines={2}>{reminder.description}</Txt> : null}
    <View style={styles.when}><Icon name="calendar" size="xs" color={palette.accent} /><Txt variant="label" color={palette.inkSoft}>{new Date(reminder.scheduledAt).toLocaleString()} · {repeats.find((r) => r.value === reminder.repeatType)?.label}</Txt></View>
  </Card></PressableScale></SwipeRow>;
}

function CategoryBadge({ category }: { category?: ReminderCategory }) { const color = category?.color ?? palette.inkMuted; return <View style={[styles.badge, { backgroundColor: `${color}18`, borderColor: `${color}55` }]}><Icon name={safeIcon(category?.icon)} size="xs" color={color} /><Txt variant="label" color={color}>{category?.name ?? 'Uncategorized'}</Txt></View>; }
function MiniIcon({ name, fallback, label, color = palette.inkMuted, onPress }: { name: IconName; fallback?: IconName; label: string; color?: string; onPress: () => void }) { return <Pressable hitSlop={8} onPress={(event) => { event.stopPropagation(); onPress(); }} accessibilityLabel={label}><Icon name={name in icons ? name : fallback ?? 'more'} size="sm" color={color} /></Pressable>; }
function Empty({ icon, title, body }: { icon: IconName; title: string; body: string }) { return <Card style={styles.empty}><Icon name={icon} size={34} color={palette.inkFaint} /><Txt variant="h3">{title}</Txt><Txt variant="small" color={palette.inkMuted} align="center">{body}</Txt></Card>; }

function NoteEditor({ value, categories, onClose, onSave }: { value: PersonalNote | null; categories: ReminderCategory[]; onClose: () => void; onSave: (input: Omit<NoteInput, 'clientId'>) => void }) {
  const [title, setTitle] = useState(value?.title ?? ''); const [description, setDescription] = useState(value?.description ?? ''); const [categoryId, setCategoryId] = useState(value?.categoryId ?? categories.find((c) => c.systemKey === 'personal')?.id ?? null); const [pinned, setPinned] = useState(value?.pinned ?? false); const [error, setError] = useState('');
  const save = () => { if (!title.trim()) { setError('Title is required.'); return; } onSave({ title: title.trim(), description: description.trim() || null, categoryId, pinned, archived: value?.archived ?? false }); };
  return <BottomSheet visible onClose={onClose} title={value ? 'Edit Note' : 'New Note'} footer={<PrimaryButton label="Save Note" icon="content-save-outline" onPress={save} />}>
    <TextField label="Title" value={title} onChangeText={setTitle} error={error} maxLength={160} autoFocus /><TextField label="Description" value={description} onChangeText={setDescription} multiline maxLength={10000} />
    <FieldLabel text="Category" /><ChipWrap>{categories.map((c) => <FilterChip key={c.id} label={c.name} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} color={c.color} />)}</ChipWrap>
    <ToggleRow title="Pin important note" value={pinned} onChange={setPinned} glyph={{ set: 'mdi', name: 'bookmark-outline' }} />
  </BottomSheet>;
}

function ReminderEditor({ value, categories, notes, reminders, allowedRepeats, permission, onPermission, onClose, onSave }: { value: PersonalReminder | null; categories: ReminderCategory[]; notes: PersonalNote[]; reminders: PersonalReminder[]; allowedRepeats: ReminderRepeatType[]; permission: 'granted' | 'denied' | 'undetermined'; onPermission: (value: 'granted' | 'denied' | 'undetermined') => void; onClose: () => void; onSave: (input: Omit<ReminderInput, 'clientId'>) => void }) {
  const initial = value ? new Date(value.scheduledAt) : new Date(Date.now() + 3600_000); const initialEnd = value?.endAt ? new Date(value.endAt) : new Date(initial.getTime() + 30 * 86400_000); const [title, setTitle] = useState(value?.title ?? ''); const [description, setDescription] = useState(value?.description ?? ''); const [date, setDate] = useState(initial); const [endEnabled, setEndEnabled] = useState(!!value?.endAt); const [endDate, setEndDate] = useState(initialEnd); const [picker, setPicker] = useState<'date' | 'time' | 'end' | null>(null);
  const [categoryId, setCategoryId] = useState(value?.categoryId ?? categories.find((c) => c.systemKey === 'personal')?.id ?? null); const [noteId, setNoteId] = useState(value?.noteId ?? null); const [repeatType, setRepeatType] = useState<ReminderRepeatType>(value?.repeatType ?? 'ONCE'); const [selectedDays, setSelectedDays] = useState<number[]>(value?.recurrence.weekdays ?? [date.getDay()]); const [interval, setInterval] = useState(String(value?.recurrence.interval ?? 1)); const [unit, setUnit] = useState<'day' | 'week' | 'month'>(value?.recurrence.unit ?? 'day'); const [advanceMinutes, setAdvance] = useState(value?.advanceMinutes ?? 0); const [notificationEnabled, setNotificationEnabled] = useState(value?.notificationEnabled ?? true); const category = categories.find((c) => c.id === categoryId); const [privacy, setPrivacy] = useState(value?.hideDescriptionOnLock ?? category?.systemKey === 'medication'); const [error, setError] = useState('');
  const save = () => {
    if (!title.trim()) { setError('Title is required.'); return; } if (date <= new Date()) { setError('Choose a future date and time.'); return; }
    if (reminders.some((item) => item.id !== value?.id && item.status === 'ACTIVE' && item.title.trim().toLowerCase() === title.trim().toLowerCase() && item.scheduledAt === date.toISOString())) { setError('A reminder with this title and time already exists.'); return; }
    const custom = Number(interval); if (repeatType === 'CUSTOM' && (!Number.isInteger(custom) || custom < 1 || custom > 365)) { setError('Custom interval must be between 1 and 365.'); return; }
    if (repeatType === 'WEEKDAYS' && !selectedDays.length) { setError('Select at least one weekday.'); return; }
    if (repeatType !== 'ONCE' && endEnabled && endDate <= date) { setError('The end date must be after the first reminder.'); return; }
    onSave({ title: title.trim(), description: description.trim() || null, categoryId, noteId, scheduledAt: date.toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', repeatType, recurrence: repeatType === 'WEEKDAYS' ? { weekdays: selectedDays } : repeatType === 'CUSTOM' ? { interval: custom, unit } : {}, endAt: repeatType !== 'ONCE' && endEnabled ? endDate.toISOString() : null, advanceMinutes, notificationEnabled, hideDescriptionOnLock: privacy, status: 'ACTIVE' });
  };
  return <BottomSheet visible onClose={onClose} title={value ? 'Edit Reminder' : 'New Reminder'} footer={<PrimaryButton label="Save Reminder" icon="content-save-outline" onPress={save} />}>
    <TextField label="Title" value={title} onChangeText={setTitle} error={error} maxLength={160} autoFocus /><TextField label="Description (optional)" value={description} onChangeText={setDescription} multiline maxLength={2000} />
    <FieldLabel text="Category" /><ChipWrap>{categories.map((c) => <FilterChip key={c.id} label={c.name} active={categoryId === c.id} onPress={() => { setCategoryId(c.id); if (c.systemKey === 'medication') setPrivacy(true); }} color={c.color} />)}</ChipWrap>
    <View style={styles.dateRow}><SecondaryButton label={date.toLocaleDateString()} icon="calendar" onPress={() => setPicker('date')} style={{ flex: 1 }} /><SecondaryButton label={date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} icon="clock-outline" onPress={() => setPicker('time')} style={{ flex: 1 }} /></View>
    {picker ? <DateTimePicker value={picker === 'end' ? endDate : date} mode={picker === 'time' ? 'time' : 'date'} minimumDate={picker === 'end' ? date : new Date()} onChange={(_, next) => { if (Platform.OS === 'android') setPicker(null); if (next) { if (picker === 'end') { const mergedEnd = new Date(endDate); mergedEnd.setFullYear(next.getFullYear(), next.getMonth(), next.getDate()); setEndDate(mergedEnd); } else { const merged = new Date(date); if (picker === 'date') merged.setFullYear(next.getFullYear(), next.getMonth(), next.getDate()); else merged.setHours(next.getHours(), next.getMinutes(), 0, 0); setDate(merged); } } }} /> : null}
    <Txt variant="small" color={palette.inkMuted}>Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}</Txt>
    <FieldLabel text="Repeat" /><ChipWrap>{repeats.filter((r) => allowedRepeats.includes(r.value) || r.value === repeatType).map((r) => <FilterChip key={r.value} label={r.label} active={repeatType === r.value} onPress={() => setRepeatType(r.value)} />)}</ChipWrap>
    {repeatType === 'WEEKDAYS' ? <ChipWrap>{weekdays.map((day, index) => <FilterChip key={day} label={day} active={selectedDays.includes(index)} onPress={() => setSelectedDays(selectedDays.includes(index) ? selectedDays.filter((d) => d !== index) : [...selectedDays, index])} />)}</ChipWrap> : null}
    {repeatType === 'CUSTOM' ? <><TextField label="Repeat every" value={interval} onChangeText={setInterval} keyboardType="number-pad" /><ChipWrap>{(['day', 'week', 'month'] as const).map((u) => <FilterChip key={u} label={`${u}s`} active={unit === u} onPress={() => setUnit(u)} />)}</ChipWrap></> : null}
    {repeatType !== 'ONCE' ? <><ToggleRow title="End repeating" value={endEnabled} onChange={setEndEnabled} glyph={{ set: 'mdi', name: 'calendar-check-outline' }} />{endEnabled ? <SecondaryButton label={`Ends ${endDate.toLocaleDateString()}`} icon="calendar" onPress={() => setPicker('end')} /> : null}</> : null}
    <FieldLabel text="Alert before" /><ChipWrap>{[0, 5, 10, 15, 30].map((m) => <FilterChip key={m} label={m ? `${m} min` : 'At time'} active={advanceMinutes === m} onPress={() => setAdvance(m)} />)}</ChipWrap>
    {notes.length ? <><FieldLabel text="Linked note (optional)" /><ChipWrap><FilterChip label="None" active={!noteId} onPress={() => setNoteId(null)} />{notes.map((n) => <FilterChip key={n.id} label={n.title} active={noteId === n.id} onPress={() => setNoteId(n.id)} />)}</ChipWrap></> : null}
    <ToggleRow title="Enable notification" value={notificationEnabled} onChange={(enabled) => { setNotificationEnabled(enabled); if (enabled && permission === 'undetermined') void notificationPermission(true).then(onPermission); }} glyph={{ set: 'mdi', name: 'bell-outline' }} />
    {notificationEnabled && permission === 'denied' ? <Txt variant="small" color={palette.orange}>Notifications are disabled in device settings. The reminder will still be saved and synced.</Txt> : null}
    {category?.systemKey === 'medication' ? <ToggleRow title="Hide details on lock screen" subtitle="Recommended for private medication reminders" value={privacy} onChange={setPrivacy} glyph={{ set: 'mdi', name: 'shield-lock-outline' }} /> : null}
    {category?.systemKey === 'medication' ? <Txt variant="small" color={palette.inkMuted}>Scheduling only. Gym Freak does not recommend dosage and is not a medical alert system.</Txt> : null}
  </BottomSheet>;
}

function CategoryManager({ categories, onCreate, onDelete, onClose }: { categories: ReminderCategory[]; onCreate: (input: Pick<ReminderCategory, 'name' | 'icon' | 'color'> & { description?: string | null }) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [name, setName] = useState(''); const [color, setColor] = useState('#22B8F5'); const [icon, setIcon] = useState<IconName>('bookmark');
  const add = () => { if (!name.trim()) return; onCreate({ name: name.trim(), icon, color }); setName(''); };
  return <BottomSheet visible onClose={onClose} title="Reminder Categories" footer={<PrimaryButton label="Add Custom Category" icon="plus" disabled={!name.trim()} onPress={add} />}>
    <Txt variant="small" color={palette.inkMuted}>Choose from the safe built-in Lucide icons. Imported SVG or executable icon data is never accepted.</Txt>
    <TextField label="Custom category name" value={name} onChangeText={setName} maxLength={80} />
    <FieldLabel text="Icon" /><ChipWrap>{(['bookmark', 'bell', 'heart', 'calendar', 'nutrition', 'workout'] as IconName[]).map((item) => <FilterChip key={item} label={item} active={icon === item} onPress={() => setIcon(item)} />)}</ChipWrap>
    <FieldLabel text="Color" /><ChipWrap>{['#22B8F5', '#FF6B7E', '#8BE04E', '#FFD166', '#7A5CFF'].map((item) => <FilterChip key={item} label={item} color={item} active={color === item} onPress={() => setColor(item)} />)}</ChipWrap>
    {categories.map((c) => <View key={c.id} style={styles.categoryRow}><View style={styles.cardTop}><CategoryBadge category={c} />{c.userId ? <MiniIcon name="delete" label="Delete custom category" color={palette.danger} onPress={() => onDelete(c.id)} /> : null}</View><Txt variant="small" color={palette.inkMuted}>{c.description}</Txt></View>)}
  </BottomSheet>;
}
function FieldLabel({ text }: { text: string }) { return <Txt variant="label" color={palette.inkSoft}>{text}</Txt>; }
function ChipWrap({ children }: { children: React.ReactNode }) { return <View style={styles.chips}>{children}</View>; }

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginTop: 12 }, search: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 14, marginTop: 14 }, searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: palette.ink, paddingVertical: 12 },
  actions: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, offline: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.sm, backgroundColor: `${palette.orange}12`, marginTop: 10 },
  card: { gap: 8 }, cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, miniActions: { flexDirection: 'row', gap: 14 }, badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5 }, when: { flexDirection: 'row', alignItems: 'center', gap: 6 }, empty: { alignItems: 'center', gap: 8, paddingVertical: 34 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, dateRow: { flexDirection: 'row', gap: 8 }, categoryRow: { gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line }, historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
});

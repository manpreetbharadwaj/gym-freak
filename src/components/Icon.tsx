import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import {
  Activity, Apple, ArrowLeftRight, ChartNoAxesColumnIncreasing, Bookmark, Globe, User, Weight, ArrowRight, ArrowUpRight, AudioLines, Award, BadgeCheck, Bell, BellRing, BicepsFlexed, BookOpen, Calendar, CalendarArrowUp,
  CalendarCheck, CalendarDays, CalendarRange, ChartColumn, ChartLine, ChartPie, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleAlert,
  CircleCheck, CirclePause, CircleStop, CircleUser, CircleX, Clock, ClockPlus, CloudAlert, Compass, Copy, Crosshair, Crown, CupSoda, Droplet, Dumbbell,
  Ellipsis, Eye, EyeOff, FileText, Flag, Flame, Footprints, Gauge, Gift, Goal, Heart, HeartPlus, HeartPulse, Hourglass, House, Image, Info, Languages,
  LifeBuoy, Lightbulb, Link, List, ListOrdered, ListPlus, LocateFixed, Lock, LockKeyhole, LockOpen, LogOut, LucideIcon, Mail, MailCheck, MailWarning,
  MapPin, MapPinOff, Mars, Medal, Minus, Moon, Mountain, Pause, Pencil, PersonStanding, Pill, Play, Plus, RefreshCw, RotateCcw, Route, Ruler, Save, Scale,
  Search, SearchX, Settings, Share2, ShieldCheck, SignalHigh, SignalLow, SignalMedium, SkipBack, SkipForward, SlidersHorizontal, Sparkles, SquarePlay, Square, StepForward,
  Target, TicketPercent, Timer, Trash, Trophy, Venus, VenusAndMars, Volume2, Watch, WandSparkles, Wind, X, Zap,
  CreditCard, Receipt, MessageSquare, MessagesSquare, Megaphone, Handshake, Bug, Palette, Star, Send, Wrench, Smartphone, BadgePercent, ImagePlus, KeyRound, Store, Undo2,
} from 'lucide-react-native';
import { iconSizes, IconSize, iconStroke, palette } from '@/theme';

/**
 * The app's one icon set: Lucide line icons drawn with react-native-svg, so they stay sharp at every size and
 * screen density, share one stroke design, and take theme colours. Names are semantic (what the icon means),
 * so swapping artwork later is a one-line change here.
 */
export const icons = {
  home: House, explore: Compass, workout: Dumbbell, activity: Footprints, progress: ChartColumn, profile: CircleUser,
  search: Search, searchEmpty: SearchX, filter: SlidersHorizontal, close: X, closeCircle: CircleX, check: Check, checkAll: CheckCheck,
  checkCircle: CircleCheck, verified: BadgeCheck, chevronRight: ChevronRight, chevronLeft: ChevronLeft, chevronDown: ChevronDown,
  arrowRight: ArrowRight, arrowUpRight: ArrowUpRight, plus: Plus, minus: Minus, more: Ellipsis, edit: Pencil, delete: Trash, copy: Copy, link: Link, save: Save,
  play: Play, pause: Pause, pauseCircle: CirclePause, stop: Square, stopCircle: CircleStop, next: SkipForward, previous: SkipBack, step: StepForward, replay: RefreshCw, history: RotateCcw,
  timer: Timer, hourglass: Hourglass, clock: Clock, clockPlus: ClockPlus, progressClock: Gauge, calendar: Calendar, calendarCheck: CalendarCheck,
  calendarWeek: CalendarDays, calendarMonth: CalendarRange, calendarNext: CalendarArrowUp,
  flame: Flame, bolt: Zap, trophy: Trophy, medal: Medal, award: Award, crown: Crown, target: Target, goal: Goal, flag: Flag, sparkle: Sparkles, magic: WandSparkles,
  strength: BicepsFlexed, person: PersonStanding, heartRate: HeartPulse, heart: Heart, heartPlus: HeartPlus, pulse: Activity, chartLine: ChartLine, chartPie: ChartPie,
  lock: Lock, lockSecure: LockKeyhole, unlock: LockOpen, shield: ShieldCheck, share: Share2, info: Info, alert: CircleAlert, cloudAlert: CloudAlert, bell: Bell, bellRing: BellRing,
  mail: Mail, mailSent: MailCheck, mailAlert: MailWarning, gift: Gift, ticket: TicketPercent, location: MapPin, locationOff: MapPinOff, locate: LocateFixed, crosshair: Crosshair, route: Route,
  ruler: Ruler, scale: Scale, water: Droplet, cup: CupSoda, wind: Wind, moon: Moon, mountain: Mountain, watch: Watch, swap: ArrowLeftRight, pill: Pill,
  list: List, listOrdered: ListOrdered, listAdd: ListPlus, playlist: SquarePlay, translate: Languages, lightbulb: Lightbulb, image: Image, eye: Eye, eyeOff: EyeOff,
  male: Mars, female: Venus, nonBinary: VenusAndMars, settings: Settings, logout: LogOut, document: FileText, book: BookOpen, help: LifeBuoy, voice: AudioLines, volume: Volume2, signal: SignalMedium, signalLow: SignalLow, signalHigh: SignalHigh, level: ChartNoAxesColumnIncreasing, nutrition: Apple, bookmark: Bookmark, globe: Globe, user: User, weight: Weight,
  // Help & Support / Feedback / Partnerships
  card: CreditCard, receipt: Receipt, message: MessageSquare, messages: MessagesSquare, megaphone: Megaphone, handshake: Handshake, bug: Bug, palette: Palette,
  star: Star, send: Send, wrench: Wrench, phone: Smartphone, offer: BadgePercent, imageAdd: ImagePlus, key: KeyRound, store: Store, undo: Undo2,
} satisfies Record<string, LucideIcon>;
export type IconName = keyof typeof icons;

export function iconPixels(size: IconSize | number) {
  return typeof size === 'number' ? size : iconSizes[size];
}

/** Stroke for a pixel size, from the shared stroke scale (absolute: the line width doesn't grow with the icon). */
export function strokeFor(px: number) {
  return px <= 16 ? iconStroke.xs : px <= 20 ? iconStroke.sm : px <= 24 ? iconStroke.md : iconStroke.lg;
}

/**
 * `variant="filled"` adds a soft tint inside closed shapes (active tab, selected state) while keeping the
 * outline crisp; use it only on closed shapes (home, compass, heart, star …), not on arrows or checks.
 */
export function Icon({ name, size = 'md', color = palette.ink, strokeWidth, variant = 'outline', style, accessibilityLabel }: {
  name: IconName; size?: IconSize | number; color?: string; strokeWidth?: number; variant?: 'outline' | 'filled'; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const Glyph = icons[name];
  const px = iconPixels(size);
  return <Glyph
    size={px}
    color={color}
    strokeWidth={strokeWidth ?? strokeFor(px)}
    absoluteStrokeWidth
    fill={variant === 'filled' ? color : 'none'}
    fillOpacity={variant === 'filled' ? 0.2 : undefined}
    style={style}
    accessible={!!accessibilityLabel}
    accessibilityLabel={accessibilityLabel}
  />;
}

/**
 * Legacy glyph names (Material Design Icons / Ionicons) → the Lucide set, so every existing `GlyphIcon` and
 * button icon renders from the one set. Names not listed keep their original font glyph (activity-type
 * pictograms such as yoga or hiking that have no line-icon equivalent).
 */
export const legacyGlyphs: Record<string, IconName> = {
  // navigation
  'home-variant': 'home', 'home-variant-outline': 'home', 'home-outline': 'home', compass: 'explore', 'compass-outline': 'explore', dumbbell: 'workout',
  'chart-box': 'progress', 'chart-box-outline': 'progress', 'account-circle-outline': 'profile',
  // actions
  magnify: 'search', search: 'search', 'magnify-close': 'searchEmpty', 'tune-variant': 'filter', close: 'close', 'close-circle': 'closeCircle',
  check: 'check', checkmark: 'check', 'check-bold': 'check', 'check-all': 'checkAll', 'check-circle': 'checkCircle', 'check-circle-outline': 'checkCircle', 'checkmark-circle': 'checkCircle',
  'check-decagram': 'verified', 'check-decagram-outline': 'verified', 'chevron-right': 'chevronRight', 'chevron-left': 'chevronLeft', 'chevron-down': 'chevronDown',
  'arrow-right': 'arrowRight', 'arrow-forward': 'arrowRight', 'arrow-top-right': 'arrowUpRight', plus: 'plus', add: 'plus', minus: 'minus', 'dots-horizontal': 'more',
  'pencil-outline': 'edit', 'trash-can-outline': 'delete', 'copy-outline': 'copy', 'link-variant': 'link', 'content-save-outline': 'save',
  play: 'play', pause: 'pause', 'pause-circle-outline': 'pauseCircle', stop: 'stop', 'skip-next': 'next', 'play-skip-forward': 'next', 'skip-previous': 'previous',
  'debug-step-over': 'step', refresh: 'replay', sync: 'replay', history: 'history', 'swap-horizontal': 'swap',
  // time
  'timer-outline': 'timer', 'timer-sand': 'hourglass', 'clock-outline': 'clock', 'clock-plus-outline': 'clockPlus', 'progress-clock': 'progressClock', speedometer: 'progressClock',
  calendar: 'calendar', 'calendar-blank': 'calendar', 'calendar-outline': 'calendar', 'calendar-check': 'calendarCheck', 'calendar-check-outline': 'calendarCheck',
  'calendar-week': 'calendarWeek', 'calendar-week-outline': 'calendarWeek', 'calendar-month-outline': 'calendarMonth', 'calendar-arrow-right': 'calendarNext',
  // training & rewards
  fire: 'flame', 'lightning-bolt': 'bolt', 'lightning-bolt-outline': 'bolt', flash: 'bolt', trophy: 'trophy', 'trophy-outline': 'trophy', 'trophy-variant': 'trophy',
  medal: 'medal', 'medal-outline': 'medal', crown: 'crown', 'crown-outline': 'crown', target: 'target', 'bullseye-arrow': 'target', goal: 'goal',
  'flag-checkered': 'flag', 'flag-outline': 'flag', 'star-four-points': 'sparkle', 'auto-fix': 'magic', 'arm-flex': 'strength', 'arm-flex-outline': 'strength',
  'weight-lifter': 'workout', human: 'person', 'human-male': 'person', 'human-handsup': 'person', 'human-male-height': 'ruler', 'heart-pulse': 'heartRate',
  heart: 'heart', 'heart-outline': 'heart', 'heart-plus-outline': 'heartPlus', 'chart-line': 'chartLine', 'chart-donut': 'chartPie', 'format-list-numbered': 'listOrdered',
  'format-list-bulleted': 'list', 'playlist-plus': 'listAdd', 'play-box-multiple-outline': 'playlist', 'run-fast': 'activity', run: 'activity', walk: 'activity',
  // status & account
  'message-outline': 'message', 'handshake-outline': 'handshake', 'book-open-outline': 'book', 'star-outline': 'star', 'credit-card-outline': 'card',
  'lock-outline': 'lock', 'lock-check-outline': 'lockSecure', 'shield-lock-outline': 'lockSecure', 'lock-open': 'unlock', 'shield-check-outline': 'shield',
  'share-variant': 'share', 'share-variant-outline': 'share', 'share-social-outline': 'share', 'information-outline': 'info', 'information-variant': 'info',
  'alert-circle': 'alert', 'alert-circle-outline': 'alert', 'cloud-alert': 'cloudAlert', 'cloud-alert-outline': 'cloudAlert', 'bell-outline': 'bell', 'bell-ring-outline': 'bellRing',
  'email-outline': 'mail', 'email-fast-outline': 'mailSent', 'email-alert-outline': 'mailAlert', 'gift-outline': 'gift', 'ticket-percent-outline': 'ticket',
  'map-marker-outline': 'location', 'map-marker-off-outline': 'locationOff', 'map-marker-distance': 'route', 'crosshairs-gps': 'locate',
  ruler: 'ruler', 'scale-bathroom': 'scale', 'water-outline': 'water', 'cup-water': 'cup', 'weather-windy': 'wind', 'weather-night': 'moon', 'image-filter-hdr': 'mountain',
  'image-outline': 'image', 'eye-outline': 'eye', 'eye-off-outline': 'eyeOff', translate: 'translate', 'lightbulb-on-outline': 'lightbulb',
  'gender-male': 'male', 'gender-female': 'female', 'gender-non-binary': 'nonBinary', 'cog-outline': 'settings', 'settings-outline': 'settings', logout: 'logout',
  'file-document-outline': 'document', 'book-open-page-variant-outline': 'book', lifebuoy: 'help', 'account-voice': 'voice', 'volume-high': 'volume', 'signal-cellular-1': 'level', 'signal-cellular-2': 'level', 'signal-cellular-3': 'level',
  'shoe-print': 'activity', earth: 'globe', 'ruler-square': 'ruler', 'crosshairs-question': 'crosshair', 'calendar-star': 'calendarCheck',
  'play-box-multiple': 'playlist', water: 'water', 'cup-outline': 'cup', 'bottle-soda-classic-outline': 'cup', 'account-outline': 'user',
  bookmark: 'bookmark', 'bookmark-outline': 'bookmark', 'timer-plus-outline': 'clockPlus', weight: 'weight', whistle: 'lightbulb',
  'account-star-outline': 'verified', 'motion-pause-outline': 'pauseCircle', 'watch-variant': 'watch', watch: 'watch', 'food-apple': 'nutrition',
};

import type { Translation } from './types';
import { ar } from './ar';
import { de } from './de';
import { es } from './es';
import { fr } from './fr';
import { hi } from './hi';
import { it } from './it';
import { ja } from './ja';
import { ko } from './ko';
import { nl } from './nl';
import { pt } from './pt';
import { tr } from './tr';

export interface LanguageMeta {
  code: string;
  /** English name, shown as the card title so everyone can scan the list. */
  name: string;
  /** Endonym, shown underneath so speakers recognise their own language. */
  native: string;
  flag: string;
  popular?: boolean;
  rtl?: boolean;
  /** Overrides on top of English. Missing keys fall back to English. */
  messages: Translation;
}

/**
 * To add a language: create `xx.ts` exporting a `Translation`, then add one entry here.
 * Order here is the order of the "All languages" list (popular ones also appear up top).
 */
export const languages = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧', popular: true, messages: {} },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', popular: true, messages: es },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪', popular: true, messages: de },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', popular: true, messages: fr },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇵🇹', popular: true, messages: pt },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳', popular: true, messages: hi },
  { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹', messages: it },
  { code: 'nl', name: 'Dutch', native: 'Nederlands', flag: '🇳🇱', messages: nl },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦', rtl: true, messages: ar },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷', messages: tr },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵', messages: ja },
  { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷', messages: ko },
] as const satisfies readonly LanguageMeta[];

export type Language = (typeof languages)[number]['code'];

export const languageByCode = Object.fromEntries(languages.map((language) => [language.code, language])) as Record<Language, LanguageMeta>;

export function isLanguage(code: string): code is Language {
  return code in languageByCode;
}

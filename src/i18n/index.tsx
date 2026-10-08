import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager, Platform } from 'react-native';
import { reloadAppAsync } from 'expo';
import { safeStorage } from '@/services/storage/safeStorage';
import { en } from './en';
import { isLanguage, Language, languageByCode, LanguageMeta, languages } from './languages';
import { Dictionary, Translation } from './types';

function merge<T>(base: T, overlay: unknown): T {
  if (!overlay || typeof overlay !== 'object' || Array.isArray(overlay) || typeof base !== 'object' || base === null || Array.isArray(base)) return (overlay ?? base) as T;
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(overlay as Record<string, unknown>)) result[key] = value === undefined ? result[key] : merge(result[key], value);
  return result as T;
}

const cache = new Map<Language, Dictionary>();
function dictionaryFor(language: Language): Dictionary {
  let dictionary = cache.get(language);
  if (!dictionary) { dictionary = merge(en, languageByCode[language].messages as Translation); cache.set(language, dictionary); }
  return dictionary;
}

/** Replaces `{name}` placeholders: format('Step {current}', { current: 2 }). */
export function format(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

function deviceLanguage(): Language {
  try {
    const code = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0].toLowerCase();
    return isLanguage(code) ? code : 'en';
  } catch {
    return 'en';
  }
}

const STORAGE_KEY = 'language';

/**
 * Arabic is right-to-left. React Native mirrors layouts only after a reload, so this switches the
 * native direction and reloads when the chosen language needs the other direction.
 * Returns true when a reload was triggered.
 */
export function applyLayoutDirection(language: Language): boolean {
  if (Platform.OS === 'web') return false;
  const rtl = !!languageByCode[language].rtl;
  if (I18nManager.isRTL === rtl) return false;
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  reloadAppAsync('Layout direction changed').catch(() => undefined);
  return true;
}

interface I18nContextValue { language: Language; meta: LanguageMeta; dictionary: Dictionary; setLanguage: (language: Language) => void; }
const I18nContext = createContext<I18nContextValue>({ language: 'en', meta: languageByCode.en, dictionary: en, setLanguage: () => undefined });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(deviceLanguage);
  useEffect(() => {
    safeStorage.get<string | null>(STORAGE_KEY, null).then((saved) => {
      if (!saved || !isLanguage(saved)) return;
      setLanguageState(saved);
      // Keeps the native direction in step with the saved language (e.g. after an OS-level change).
      applyLayoutDirection(saved);
    });
  }, []);
  const value = useMemo(() => ({
    language,
    meta: languageByCode[language],
    dictionary: dictionaryFor(language),
    setLanguage: (next: Language) => { setLanguageState(next); safeStorage.set(STORAGE_KEY, next).catch(() => undefined); },
  }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() { return useContext(I18nContext); }

export { languages };
export type { Language, LanguageMeta };

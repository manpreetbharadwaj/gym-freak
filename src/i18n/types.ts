import type { en } from './en';

/** English is the source of truth; every other language is a partial overlay that falls back to it. */
export type Dictionary = typeof en;

export type DeepPartial<T> = T extends readonly unknown[] ? T : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
export type Translation = DeepPartial<Dictionary>;

export type { Language, LanguageMeta } from './languages';

/** Deep-merges translation overlays (later wins); arrays are replaced, not merged. */
export function mergeTranslations(...parts: Translation[]): Translation {
  const merge = (a: unknown, b: unknown): unknown => {
    if (!b || typeof b !== 'object' || Array.isArray(b) || !a || typeof a !== 'object' || Array.isArray(a)) return b ?? a;
    const out: Record<string, unknown> = { ...(a as Record<string, unknown>) };
    for (const [k, v] of Object.entries(b as Record<string, unknown>)) out[k] = merge(out[k], v);
    return out;
  };
  return parts.reduce<Translation>((acc, part) => merge(acc, part) as Translation, {});
}

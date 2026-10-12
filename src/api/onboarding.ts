import type { OnboardingCard } from '../types/domain';
import { resolveMediaUrl } from './media';

/** HealthyMe `GET /v1/app/onboarding` (public). */
export interface ApiOnboardingCard { id: string; tag: string | null; title: string; description: string; imageUrl: string | null; imageWidth: number | null; imageHeight: number | null; imageFit: string; backgroundColor: string | null; gradient: { colors?: unknown; angle?: unknown } | null; textColor: string; accentColor: string | null }
export interface ApiOnboardingContent { version: string; locale: string; items: ApiOnboardingCard[] }
const HEX = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
const color = (value: unknown) => (typeof value === 'string' && HEX.test(value) ? value : undefined);

/** Defensive mapping: a card the app can't render (no title / image) is dropped rather than shown broken. */
export function onboardingCardFrom(item: ApiOnboardingCard, baseURL: string): OnboardingCard[] {
  const imageUrl = resolveMediaUrl(baseURL, item?.imageUrl ?? undefined);
  if (!item?.id || !item.title?.trim() || !imageUrl) return [];
  const stops = Array.isArray(item.gradient?.colors) ? (item.gradient!.colors as unknown[]).map(color) : [];
  return [{
    id: item.id,
    tag: item.tag?.trim() || undefined,
    title: item.title,
    description: item.description ?? '',
    imageUrl,
    imageWidth: item.imageWidth ?? undefined,
    imageHeight: item.imageHeight ?? undefined,
    imageFit: item.imageFit === 'CONTAIN' ? 'contain' : 'cover',
    backgroundColor: color(item.backgroundColor),
    gradient: stops.length >= 2 && stops.every(Boolean) ? { colors: stops as string[], angle: typeof item.gradient?.angle === 'number' ? item.gradient.angle : 180 } : undefined,
    textColor: color(item.textColor) ?? '#FFFFFF',
    accentColor: color(item.accentColor),
  }];
}

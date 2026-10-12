import type { ContentSection, ContentTile, ContentTiles } from '../types/domain';
import { resolveMediaUrl } from './media';

/** HealthyMe `GET /v1/app/content-tiles` (public, localized via Accept-Language). */
export interface ApiContentTile { id: string; key: string; title: string | null; imageUrl: string | null; imageWidth: number | null; imageHeight: number | null; imageFit: string }
export interface ApiContentTiles { version: string; sections: Record<string, ApiContentTile[] | undefined> }

export const CONTENT_SECTIONS: ContentSection[] = ['explore_muscle', 'explore_goal', 'explore_equipment', 'onboarding_goal', 'onboarding_level', 'onboarding_location', 'onboarding_equipment'];

/** Defensive mapping: unknown sections and tiles without an id, key or image are dropped, never shown broken. */
export function contentTilesFrom(data: ApiContentTiles | null | undefined, baseURL: string): ContentTiles {
  const sections: ContentTiles['sections'] = {};
  for (const section of CONTENT_SECTIONS) {
    const items = Array.isArray(data?.sections?.[section]) ? data!.sections[section]! : [];
    sections[section] = items.flatMap((item): ContentTile[] => {
      const imageUrl = resolveMediaUrl(baseURL, item?.imageUrl ?? undefined);
      if (!item?.id || !item.key || !imageUrl) return [];
      return [{ id: item.id, key: item.key, title: item.title?.trim() || undefined, imageUrl, imageWidth: item.imageWidth ?? undefined, imageHeight: item.imageHeight ?? undefined, imageFit: item.imageFit === 'CONTAIN' ? 'contain' : 'cover' }];
    });
  }
  return { version: String(data?.version ?? ''), sections };
}

/** The tile for one option (onboarding questions look photos up by their option key). */
export const tileFor = (tiles: ContentTiles | undefined, section: ContentSection, key: string) => tiles?.sections[section]?.find((t) => t.key === key);

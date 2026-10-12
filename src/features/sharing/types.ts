export type ShareCardKind = 'workout' | 'activity' | 'progress' | 'achievement' | 'referral';
export type ShareCardFormat = 'story' | 'portrait' | 'square' | 'landscape';
export type SharePlatform = 'whatsapp' | 'instagram' | 'facebook' | 'snapchat' | 'tiktok' | 'x' | 'telegram' | 'threads' | 'more';

export interface ShareMetric {
  id: string;
  label: string;
  value: string;
  /** Estimated values remain visibly qualified and can be hidden independently. */
  estimated?: boolean;
  sensitive?: boolean;
}

export interface ShareCardModel {
  kind: ShareCardKind;
  title: string;
  eyebrow: string;
  subtitle?: string;
  date?: string;
  statement: string;
  metrics: ShareMetric[];
  contentId?: string;
}

export const shareFormats: Record<ShareCardFormat, { width: number; height: number; label: string }> = {
  story: { width: 1080, height: 1920, label: 'Story' },
  portrait: { width: 1080, height: 1350, label: 'Portrait' },
  square: { width: 1080, height: 1080, label: 'Square' },
  landscape: { width: 1200, height: 630, label: 'Landscape' },
};

export const visibleShareMetrics = (metrics: ShareMetric[], includeSensitive: boolean) => metrics.filter((metric) => includeSensitive || !metric.sensitive);

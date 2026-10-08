/** HealthyMe media URLs may be relative (`/v1/media/:id/content`); resolve them against the API origin. */
export function resolveMediaUrl(baseURL: string, url?: string | null) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = baseURL.replace(/\/$/, '').replace(/\/v1$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Where `cachedFetch` keeps its last good answers (AsyncStorage in the app; injected so this stays pure for tests). */
export interface CacheStore { get: <T>(key: string) => Promise<T | null>; set: <T>(key: string, value: T) => Promise<void> }

/**
 * Network first; the last good answer is kept on disk and served when the network fails, so admin-managed
 * content still renders offline after one successful load. With no cache the error propagates (the caller
 * shows its empty / error state — never bundled stand-in content).
 */
export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>, store: CacheStore): Promise<T> {
  try {
    const fresh = await fetcher();
    await store.set(key, fresh).catch(() => undefined);
    return fresh;
  } catch (error) {
    const cached = await store.get<T>(key).catch(() => null);
    if (cached !== null && cached !== undefined) return cached;
    throw error;
  }
}

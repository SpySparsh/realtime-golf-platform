type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const cache = new Map<string, CacheEntry<unknown>>();

export type CacheOptions = {
  refresh?: boolean;
};

export type CacheStore = {
  get<T>(key: string): Promise<T | undefined> | T | undefined;
  set<T>(key: string, value: T, ttlMs: number): Promise<void> | void;
  delete(prefix?: string): Promise<void> | void;
};

export async function getCached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  options: CacheOptions = {}
) {
  const now = Date.now();
  const existing = cache.get(key) as CacheEntry<T> | undefined;
  if (!options.refresh && existing && existing.expiresAt > now) return existing.value;

  const value = await loader();
  cache.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function clearCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

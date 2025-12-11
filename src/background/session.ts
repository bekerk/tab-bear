import { MAX_MARKDOWN_LENGTH, normalizeCacheEntries } from "../shared/session";
import { getLocal, setLocal, type StorageShape } from "../shared/storage";
import type { CacheEntry } from "../shared/types";

const MAX_CACHE_ENTRIES = 100;

let cacheWrite = Promise.resolve();

const runSerialized = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = cacheWrite.then(fn, fn);
  cacheWrite = next.catch(() => Promise.resolve());
  return next;
};

const trimCache = (cache: CacheEntry[]): CacheEntry[] => {
  if (cache.length <= MAX_CACHE_ENTRIES) return cache;
  return cache.slice(-MAX_CACHE_ENTRIES);
};

export const ensureDefaults = async () => {
  const data = await getLocal([
    "activeSession",
    "cache",
    "pagesCount",
    "sessionStartTime",
  ]);

  const updates: Partial<StorageShape> = {};
  if (typeof data.activeSession !== "boolean") updates.activeSession = false;
  if (!Array.isArray(data.cache)) updates.cache = [];
  if (typeof data.pagesCount !== "number") updates.pagesCount = 0;
  if (typeof data.sessionStartTime !== "number")
    updates.sessionStartTime = null;

  if (Object.keys(updates).length) await setLocal(updates);
};

export const startSession = () =>
  runSerialized(() =>
    setLocal({
      activeSession: true,
      sessionStartTime: Date.now(),
      cache: [],
      pagesCount: 0,
    }),
  );

export const stopSession = () =>
  runSerialized(() => setLocal({ activeSession: false, sessionStartTime: null }));

export const cacheMarkdown = async (
  url: string,
  markdown: string,
  tabId?: number,
) =>
  runSerialized(async () => {
    const data = await getLocal(["activeSession", "cache", "pagesCount"]);

    const cache = normalizeCacheEntries(data.cache);
    const currentCount =
      typeof data.pagesCount === "number" ? data.pagesCount : cache.length;

    if (!data.activeSession || !tabId || markdown.length > MAX_MARKDOWN_LENGTH) {
      if (typeof data.pagesCount !== "number") {
        await setLocal({ pagesCount: currentCount });
      }
      return;
    }

    cache.push({ url, markdown, timestamp: Date.now() });
    const nextCache = trimCache(cache);
    await setLocal({ cache: nextCache, pagesCount: nextCache.length });
  });

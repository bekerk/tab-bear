import { MAX_MARKDOWN_LENGTH } from "../shared/session";
import { getLocal, setLocal, type StorageShape } from "../shared/storage";
import type { CacheEntry } from "../shared/types";
import {
  getCacheEntriesStore,
  setCacheEntriesStore,
} from "../shared/cacheStore";

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
    "cacheIndex",
    "pagesCount",
    "sessionStartTime",
  ]);

  const updates: Partial<StorageShape> = {};
  if (typeof data.activeSession !== "boolean") updates.activeSession = false;
  if (!Array.isArray(data.cacheIndex)) updates.cacheIndex = [];
  if (typeof data.pagesCount !== "number") updates.pagesCount = 0;
  if (typeof data.sessionStartTime !== "number")
    updates.sessionStartTime = null;

  if (Object.keys(updates).length) await setLocal(updates);
};

export const startSession = () =>
  runSerialized(() =>
    Promise.all([
      setCacheEntriesStore([]),
      setLocal({
        activeSession: true,
        sessionStartTime: Date.now(),
        cacheIndex: [],
        pagesCount: 0,
      }),
    ]).then(() => undefined),
  );

export const stopSession = () =>
  runSerialized(() =>
    setLocal({ activeSession: false, sessionStartTime: null }),
  );

export const cacheMarkdown = async (
  url: string,
  markdown: string,
  tabId?: number,
) =>
  runSerialized(async () => {
    const data = await getLocal(["activeSession", "pagesCount", "cacheIndex"]);

    const cache = await getCacheEntriesStore();
    const currentCount =
      typeof data.pagesCount === "number" ? data.pagesCount : cache.length;
    if (!Array.isArray(data.cacheIndex)) {
      await setLocal({
        cacheIndex: cache.map((e) => e.url),
        pagesCount: currentCount,
      });
    }

    if (
      !data.activeSession ||
      !tabId ||
      markdown.length > MAX_MARKDOWN_LENGTH
    ) {
      if (typeof data.pagesCount !== "number") {
        await setLocal({ pagesCount: currentCount });
      }
      return;
    }

    cache.push({ url, markdown, timestamp: Date.now() });
    const nextCache = trimCache(cache);
    await setCacheEntriesStore(nextCache);
    await setLocal({
      cacheIndex: nextCache.map((e) => e.url),
      pagesCount: nextCache.length,
    });
  });

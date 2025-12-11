import { normalizeCacheEntries } from "./session";
import { getLocal, setLocal } from "./storage";
import type { CacheEntry, SessionState } from "./types";
import { getCacheEntriesStore, setCacheEntriesStore } from "./cacheStore";

export const getActiveSession = async (): Promise<boolean> => {
  const { activeSession } = await getLocal("activeSession");
  return activeSession === true;
};

export const getCacheEntries = async (): Promise<CacheEntry[]> => {
  // Full cache lives in IndexedDB.
  return normalizeCacheEntries(await getCacheEntriesStore());
};

export const setCacheEntries = async (entries: CacheEntry[]): Promise<void> => {
  await setCacheEntriesStore(entries);
  const urls = entries.map((e) => e.url);
  // Keep indicator index small and deterministic.
  const unique: string[] = [];
  for (const u of urls) {
    if (!unique.includes(u)) unique.push(u);
  }
  const cacheIndex = unique.slice(-100);
  await setLocal({ cacheIndex, pagesCount: entries.length });
};

export const getCacheIndex = async (): Promise<string[]> => {
  const { cacheIndex } = await getLocal("cacheIndex");
  return Array.isArray(cacheIndex)
    ? cacheIndex.filter((v) => typeof v === "string")
    : [];
};

export const getSessionSnapshot = async (): Promise<SessionState> => {
  const { activeSession, pagesCount, sessionStartTime } = await getLocal([
    "activeSession",
    "pagesCount",
    "sessionStartTime",
  ]);

  return {
    active: activeSession === true,
    pagesCount: typeof pagesCount === "number" ? pagesCount : 0,
    startTime: typeof sessionStartTime === "number" ? sessionStartTime : null,
  };
};

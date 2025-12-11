import { normalizeCacheEntries } from "./session";
import { getLocal } from "./storage";
import type { CacheEntry, SessionState } from "./types";

export const getActiveSession = async (): Promise<boolean> => {
  const { activeSession } = await getLocal("activeSession");
  return activeSession === true;
};

export const getCacheEntries = async (): Promise<CacheEntry[]> => {
  const { cache } = await getLocal("cache");
  return normalizeCacheEntries(cache);
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

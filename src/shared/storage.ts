import type { CacheEntry } from "./types";

export type StorageShape = {
  activeSession?: boolean;
  cache?: CacheEntry[];
  pagesCount?: number;
  sessionStartTime?: number | null;
};

type StorageKey = keyof StorageShape;

export const getLocal = (keys: StorageKey | StorageKey[]) =>
  new Promise<Partial<StorageShape>>((resolve) => {
    chrome.storage.local.get(keys, (data) => resolve(data));
  });

export const setLocal = (items: Partial<StorageShape>) =>
  new Promise<void>((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });

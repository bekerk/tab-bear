export type StorageShape = {
  activeSession?: boolean;
  // Small index of cached URLs for the in-page indicator. Full markdown lives in IndexedDB.
  cacheIndex?: string[];
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

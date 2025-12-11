import type { CacheEntry } from "./types";
import { normalizeCacheEntries } from "./session";

const DB_NAME = "tab-bear";
const DB_VERSION = 1;
const STORE_NAME = "session";
const RECORD_KEY = "current";

type SessionRecord = {
  key: typeof RECORD_KEY;
  entries: CacheEntry[];
};

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () =>
      reject(req.error ?? new Error("Failed to open IndexedDB"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });

const withStore = async <T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const req = fn(store);

      req.onerror = () =>
        reject(req.error ?? new Error("IndexedDB request failed"));
      req.onsuccess = () => resolve(req.result);
    });
  } finally {
    db.close();
  }
};

export const getCacheEntriesStore = async (): Promise<CacheEntry[]> => {
  const record = await withStore<SessionRecord | undefined>("readonly", (s) => {
    const req = s.get(RECORD_KEY) as IDBRequest<SessionRecord | undefined>;
    return req;
  });
  return normalizeCacheEntries(record?.entries);
};

export const setCacheEntriesStore = async (
  entries: CacheEntry[],
): Promise<void> => {
  await withStore<IDBValidKey>("readwrite", (s) =>
    s.put({ key: RECORD_KEY, entries } satisfies SessionRecord),
  );
};

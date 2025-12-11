import sinonChrome from "sinon-chrome";

type StorageData = Record<string, unknown>;
type StorageChange = { oldValue: unknown; newValue: unknown };

const pickKeys = (data: StorageData, keys: string | string[]) => {
  if (typeof keys === "string") {
    return { [keys]: data[keys] };
  }

  const result: StorageData = {};
  for (const key of keys) {
    result[key] = data[key];
  }
  return result;
};

export const createChromeMock = (initial: StorageData = {}) => {
  const data: StorageData = { ...initial };
  const downloadCalls: Array<Record<string, unknown>> = [];

  const chrome = sinonChrome;
  chrome.runtime.lastError = undefined as { message: string } | undefined;
  chrome.runtime.getURL.callsFake((path: string) => path);
  chrome.runtime.sendMessage.returns(undefined);
  chrome.tabs.create.returns(undefined);

  chrome.storage.local.get.callsFake((keys: string | string[], callback: (items: StorageData) => void) => {
    callback(pickKeys(data, keys));
  });

  chrome.storage.local.set.callsFake((items: StorageData, callback?: () => void) => {
    chrome.runtime.lastError = undefined;
    const changes: Record<string, StorageChange> = {};
    for (const [key, value] of Object.entries(items)) {
      changes[key] = { oldValue: data[key], newValue: value };
      data[key] = value;
    }
    if (Object.keys(changes).length) {
      chrome.storage.onChanged.dispatch(changes, "local");
    }
    callback?.();
  });

  chrome.storage.local.clear.callsFake(() => {
    const changes: Record<string, StorageChange> = {};
    for (const [key, oldValue] of Object.entries(data)) {
      changes[key] = { oldValue, newValue: undefined };
    }
    for (const key of Object.keys(data)) {
      delete data[key];
    }
    chrome.storage.onChanged.dispatch(changes, "local");
  });

  chrome.downloads.download.callsFake(
    (options: Record<string, unknown>, callback?: (downloadId?: number) => void) => {
      downloadCalls.push(options);
      callback?.(1);
    },
  );

  return Object.assign(chrome, { __data: data, __downloads: downloadCalls });
};

export type ChromeMock = ReturnType<typeof createChromeMock>;

export const installChromeMock = (mock: ChromeMock) => {
  globalThis.chrome = mock as unknown as typeof chrome;
};

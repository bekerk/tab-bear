const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const isInjectableUrl = (url?: string): boolean => {
  if (!url) return false;
  try {
    return ALLOWED_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
};

const executeContentScript = async (tabId: number): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ["content/index.js"],
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      },
    );
  }).catch(() => {
    // Some tabs/frames won’t allow injection (e.g. restricted pages). Ignore.
  });
};

const sendDeactivate = async (tabId: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: "DEACTIVATE_CONTENT" }, () =>
      resolve(),
    );
  });
};

let enabled = false;

type TabChangeInfo = { status?: unknown };
type TabActiveInfo = { tabId?: unknown };

const onUpdated = (
  tabId: number,
  changeInfo: TabChangeInfo,
  tab: chrome.tabs.Tab,
) => {
  if (changeInfo.status !== "complete") return;
  if (!isInjectableUrl(tab.url)) return;
  void executeContentScript(tabId);
};

const onActivated = (activeInfo: TabActiveInfo) => {
  const tabId = activeInfo.tabId;
  if (typeof tabId !== "number") return;
  chrome.tabs.get(tabId, (tab) => {
    if (!isInjectableUrl(tab.url)) return;
    void executeContentScript(tabId);
  });
};

export const enableCapture = async (): Promise<void> => {
  if (enabled) return;
  enabled = true;

  chrome.tabs.onUpdated.addListener(onUpdated);
  chrome.tabs.onActivated.addListener(onActivated);

  const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
    chrome.tabs.query({}, (result) => resolve(result));
  });
  await Promise.all(
    tabs
      .filter((t) => isInjectableUrl(t.url) && typeof t.id === "number")
      .map((t) => executeContentScript(t.id!)),
  );
};

export const disableCapture = async (): Promise<void> => {
  if (!enabled) return;
  enabled = false;

  chrome.tabs.onUpdated.removeListener(onUpdated);
  chrome.tabs.onActivated.removeListener(onActivated);

  const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
    chrome.tabs.query({}, (result) => resolve(result));
  });
  await Promise.all(
    tabs
      .filter((t) => typeof t.id === "number")
      .map((t) => sendDeactivate(t.id!)),
  );
};

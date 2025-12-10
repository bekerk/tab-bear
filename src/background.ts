type CacheEntry = { url: string; markdown: string; timestamp: number };
type Message =
  | { type: "START_SESSION" }
  | { type: "STOP_SESSION" }
  | { type: "DOWNLOAD_SESSION" }
  | { type: "CACHE_MARKDOWN"; url: string; markdown: string };

const MAX_MARKDOWN_LENGTH = 1_000_000; // ~1MB guard to avoid runaway writes

const getLocal = <T extends Record<string, unknown>>(keys: string | string[]) =>
  new Promise<T>((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result as T));
  });

const setLocal = (items: Record<string, unknown>) =>
  new Promise<void>((resolve) => {
    chrome.storage.local.set(items, () => resolve());
  });

const ensureDefaults = async () => {
  const { activeSession, cache, pagesCount } = await getLocal<{
    activeSession?: unknown;
    cache?: unknown;
    pagesCount?: unknown;
  }>(["activeSession", "cache", "pagesCount"]);

  const updates: Record<string, unknown> = {};
  const cacheArray = Array.isArray(cache) ? (cache as CacheEntry[]) : [];

  if (typeof activeSession !== "boolean") {
    updates.activeSession = false;
  }
  if (!Array.isArray(cache)) {
    updates.cache = [] as CacheEntry[];
  }
  if (typeof pagesCount !== "number") {
    updates.pagesCount = cacheArray.length;
  }

  if (Object.keys(updates).length) {
    await setLocal(updates);
  }
};

// Serialize cache writes to avoid dropping entries when multiple tabs send data
let cacheUpdateQueue: Promise<void> = Promise.resolve();
const updateCache = (updater: (cache: CacheEntry[]) => CacheEntry[]) => {
  cacheUpdateQueue = cacheUpdateQueue
    .then(async () => {
      const { cache } = await getLocal<{ cache?: unknown }>("cache");
      const current = Array.isArray(cache) ? (cache as CacheEntry[]) : [];
      const next = updater(current);
      await setLocal({ cache: next, pagesCount: next.length });
    })
    .catch((err) => {
      console.error("Failed to update cache", err);
    });

  return cacheUpdateQueue;
};

const encodeBase64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

const downloadCache = async () => {
  const { cache } = await getLocal<{ cache?: unknown }>("cache");
  const entries = Array.isArray(cache) ? (cache as CacheEntry[]) : [];

  if (entries.length === 0) {
    console.log("No cached pages to download");
    return;
  }

  let file_buffer = "<session>\n\n";
  for (const entry of entries) {
    file_buffer += `<page url="${entry.url}">\n`;
    file_buffer += `${entry.markdown}\n`;
    file_buffer += `</page>\n\n`;
  }
  file_buffer += `</session>\n`;

  const base64 = encodeBase64(file_buffer);

  chrome.downloads.download({
    url: `data:text/plain;charset=utf-8;base64,${base64}`,
    filename: "tab-bear-session.txt",
    saveAs: true,
  });
};

const handleStartSession = async () => {
  await setLocal({ activeSession: true });
  console.log("Starting session");
};

const handleStopSession = async () => {
  await setLocal({ activeSession: false });
  console.log("Stopping session");
};

const handleDownloadSession = async () => {
  await downloadCache();
};

const handleClearSession = async () => {
  await setLocal({ cache: [], pagesCount: 0 });
};

const isCacheMarkdownMessage = (
  msg: unknown,
): msg is Extract<Message, { type: "CACHE_MARKDOWN" }> => {
  if (!msg || typeof msg !== "object") return false;
  const candidate = msg as Record<string, unknown>;
  return (
    candidate.type === "CACHE_MARKDOWN" &&
    typeof candidate.url === "string" &&
    typeof candidate.markdown === "string"
  );
};

const handleCacheMarkdown = async (
  msg: Extract<Message, { type: "CACHE_MARKDOWN" }>,
  sender: chrome.runtime.MessageSender,
) => {
  const { activeSession } = await getLocal<{ activeSession?: unknown }>(
    "activeSession",
  );

  if (activeSession !== true) {
    console.log("No active session");
    return;
  }

  const markdownTooLarge = msg.markdown.length > MAX_MARKDOWN_LENGTH;
  if (markdownTooLarge || !sender.tab?.id) {
    console.warn("Dropping markdown", {
      hasTab: Boolean(sender.tab?.id),
      markdownTooLarge,
    });
    return;
  }

  const entry: CacheEntry = {
    url: msg.url,
    markdown: msg.markdown,
    timestamp: Date.now(),
  };

  await updateCache((cache) => [...cache, entry]);
  console.log(`Cached markdown for tab ${sender.tab.id}: ${msg.url}`);
};

const handleUnknownMessage = (msg: { type?: unknown }) => {
  console.log("Unknown message type: ", msg);
};

// Initialize storage once (do not wipe existing data)
void ensureDefaults();
chrome.runtime.onInstalled.addListener(() => {
  void ensureDefaults();
});

// Show welcome page on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({
    url: "welcome.html",
  });
});

// Message handling
chrome.runtime.onMessage.addListener(
  (msg: unknown, sender: chrome.runtime.MessageSender) => {
    (async () => {
      const message = msg as Message;
      switch (message.type) {
        case "START_SESSION":
          await handleStartSession();
          break;

        case "STOP_SESSION":
          await handleStopSession();
          await handleDownloadSession();
          await handleClearSession();
          break;

        case "DOWNLOAD_SESSION":
          await handleDownloadSession();
          break;

        case "CACHE_MARKDOWN":
          if (isCacheMarkdownMessage(msg)) {
            await handleCacheMarkdown(message, sender);
          } else {
            console.warn("Invalid CACHE_MARKDOWN payload");
          }
          break;

        default:
          handleUnknownMessage(message);
          break;
      }
    })().catch((err) => console.error("Failed to handle message", err));
  },
);

import { extractMarkdown } from "./markdown";
import {
  checkAndShowIndicator,
  deactivateIndicator,
  subscribeToIndicatorUpdates,
} from "./indicator";
import { getActiveSession } from "../shared/chromeApi";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const CACHE_DELAY_MS = 5000;
const INDICATOR_DELAY_MS = 500;

declare global {
  var __TAB_BEAR_CONTENT_INITIALIZED: boolean | undefined;
}

const isValidPage = (): boolean => {
  return Boolean(document.body) && ALLOWED_PROTOCOLS.has(location.protocol);
};

const hasActiveSession = async (): Promise<boolean> => getActiveSession();

const cachePageContent = (): void => {
  const markdown = extractMarkdown();
  void chrome.runtime.sendMessage({
    type: "CACHE_MARKDOWN",
    markdown,
    url: location.href,
  });

  setTimeout(() => void checkAndShowIndicator(), INDICATOR_DELAY_MS);
};

const maybeSendMarkdown = async (): Promise<void> => {
  if (!isValidPage()) {
    return;
  }

  if (!(await hasActiveSession())) {
    return;
  }

  setTimeout(cachePageContent, CACHE_DELAY_MS);
};

const init = (): void => {
  if (globalThis.__TAB_BEAR_CONTENT_INITIALIZED) return;
  globalThis.__TAB_BEAR_CONTENT_INITIALIZED = true;

  void maybeSendMarkdown();
  void checkAndShowIndicator();

  const unsubscribe = subscribeToIndicatorUpdates();
  chrome.runtime.onMessage.addListener((msg: unknown) => {
    const type = (msg as { type?: unknown } | null)?.type;
    if (type === "DEACTIVATE_CONTENT") {
      unsubscribe();
      deactivateIndicator();
    }
  });
};

init();

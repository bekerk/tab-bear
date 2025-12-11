import { extractMarkdown } from "./markdown";
import { checkAndShowIndicator, subscribeToIndicatorUpdates } from "./indicator";
import { getActiveSession } from "../shared/chromeApi";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const CACHE_DELAY_MS = 5000;
const INDICATOR_DELAY_MS = 500;

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

void maybeSendMarkdown();
void checkAndShowIndicator();
void subscribeToIndicatorUpdates();

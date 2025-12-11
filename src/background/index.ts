import type { Message } from "../shared/types";
import { downloadSession } from "./download";
import { disableCapture, enableCapture } from "./capture";
import {
  cacheMarkdown,
  ensureDefaults,
  startSession,
  stopSession,
} from "./session";
import { getLocal } from "../shared/storage";

const handleAsync = <T>(fn: () => Promise<T>): void => {
  void fn().catch(console.error);
};

chrome.runtime.onInstalled.addListener(() => {
  handleAsync(ensureDefaults);
  handleAsync(() => chrome.tabs.create({ url: "welcome.html" }));
});

chrome.runtime.onStartup.addListener(() => {
  handleAsync(async () => {
    await ensureDefaults();
    const { activeSession } = await getLocal("activeSession");
    if (activeSession === true) {
      await enableCapture();
    }
  });
});

// Service worker can be restarted without onStartup; hydrate capture state on load.
handleAsync(async () => {
  await ensureDefaults();
  const { activeSession } = await getLocal("activeSession");
  if (activeSession === true) {
    await enableCapture();
  }
});

chrome.runtime.onMessage.addListener((msg: Message, sender) => {
  switch (msg.type) {
    case "START_SESSION":
      handleAsync(async () => {
        await startSession();
        await enableCapture();
      });
      break;
    case "STOP_SESSION":
      handleAsync(async () => {
        await stopSession();
        await disableCapture();
      });
      break;
    case "DOWNLOAD_SESSION":
      handleAsync(downloadSession);
      break;
    case "OPEN_EDITOR":
      handleAsync(() => chrome.tabs.create({ url: "editor.html" }));
      break;
    case "CACHE_MARKDOWN":
      handleAsync(() => cacheMarkdown(msg.url, msg.markdown, sender.tab?.id));
      break;
  }
});

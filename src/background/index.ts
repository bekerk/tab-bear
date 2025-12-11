import type { Message } from "../shared/types";
import { downloadSession } from "./download";
import {
  cacheMarkdown,
  ensureDefaults,
  startSession,
  stopSession,
} from "./session";

const handleAsync = <T>(fn: () => Promise<T>): void => {
  void fn().catch(console.error);
};

chrome.runtime.onInstalled.addListener(() => {
  handleAsync(ensureDefaults);
  handleAsync(() => chrome.tabs.create({ url: "welcome.html" }));
});

chrome.runtime.onMessage.addListener((msg: Message, sender) => {
  switch (msg.type) {
    case "START_SESSION":
      handleAsync(startSession);
      break;
    case "STOP_SESSION":
      handleAsync(stopSession);
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

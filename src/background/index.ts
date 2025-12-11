import type { Message } from "../shared/types";
import { downloadSession } from "./download";
import {
  cacheMarkdown,
  ensureDefaults,
  startSession,
  stopSession,
} from "./session";

chrome.runtime.onInstalled.addListener(() => {
  void ensureDefaults().catch(console.error);
  void chrome.tabs.create({ url: "welcome.html" });
});

chrome.runtime.onMessage.addListener((msg: Message, sender) => {
  switch (msg.type) {
    case "START_SESSION":
      void startSession().catch(console.error);
      break;
    case "STOP_SESSION":
      void stopSession().catch(console.error);
      break;
    case "DOWNLOAD_SESSION":
      void downloadSession();
      break;
    case "OPEN_EDITOR":
      void chrome.tabs.create({ url: "editor.html" });
      break;
    case "CACHE_MARKDOWN":
      void cacheMarkdown(msg.url, msg.markdown, sender.tab?.id).catch(
        console.error,
      );
      break;
  }
});

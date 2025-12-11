export type CacheEntry = {
  url: string;
  markdown: string;
  timestamp: number;
};

export type Message =
  | { type: "START_SESSION" }
  | { type: "STOP_SESSION" }
  | { type: "DOWNLOAD_SESSION" }
  | { type: "OPEN_EDITOR" }
  | { type: "CACHE_MARKDOWN"; url: string; markdown: string };

export type SessionState = {
  active: boolean;
  pagesCount: number;
  startTime: number | null;
};

import type { CacheEntry } from "./types";

export const MAX_MARKDOWN_LENGTH = 1_000_000;
export const SESSION_FILENAME = "tab-bear-session.txt";

export const estimateTokens = (text: string): number => {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.round(wordCount / 0.75);
};

export const formatTokenCount = (tokens: number): string => {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
};

const isCacheEntry = (value: unknown): value is CacheEntry => {
  if (!value || typeof value !== "object") return false;

  const entry = value as Partial<CacheEntry>;
  return (
    typeof entry.url === "string" &&
    typeof entry.markdown === "string" &&
    typeof entry.timestamp === "number" &&
    entry.markdown.length <= MAX_MARKDOWN_LENGTH
  );
};

export const normalizeCacheEntries = (value: unknown): CacheEntry[] => {
  return Array.isArray(value) ? value.filter(isCacheEntry) : [];
};

const formatMetadata = (entry: CacheEntry): string => {
  const url = new URL(entry.url);
  const source = url.hostname.replace(/^www\./, "");
  const date = new Date(entry.timestamp).toISOString().split("T")[0];
  const titleMatch = entry.markdown.match(/^#\s+(.+)/m);
  const title = titleMatch?.[1] || "Untitled";

  return `---
Source: ${source}
URL: ${entry.url}
Scraped Date: ${date}
Title: ${title}
---

`;
};

export const serializeSession = (entries: CacheEntry[]): string => {
  let content = "<session>\n\n";

  for (const entry of entries) {
    const metadata = formatMetadata(entry);
    content += `<page url="${entry.url}">\n${metadata}${entry.markdown}\n</page>\n\n`;
  }

  content += "</session>\n";
  return content;
};

export const shouldPreferDownload = (
  pageCount: number,
  contentLength: number,
): boolean => {
  return pageCount > 10 && contentLength > 50000;
};

export const downloadSession = (content: string): void => {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tab-bear-session-${new Date().toISOString().split("T")[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
};

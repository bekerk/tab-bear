import { useEffect, useRef, useState } from "preact/hooks";
import {
  serializeSession,
  estimateTokens,
  formatTokenCount,
} from "../shared/session";
import { getCacheEntries } from "../shared/chromeApi";
import type { CacheEntry } from "../shared/types";

export const Editor = () => {
  const [pages, setPages] = useState<CacheEntry[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void getCacheEntries().then(setPages);
  }, []);

  const updatePage = (index: number, markdown: string) => {
    setPages((prev) => {
      const updated = [...prev];
      const entry = updated[index]!;
      updated[index] = { url: entry.url, timestamp: entry.timestamp, markdown };
      return updated;
    });
  };

  const deletePage = (index: number) => {
    setPages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setActiveTab((current) => {
        if (next.length === 0) return 0;
        return Math.min(current, next.length - 1);
      });
      return next;
    });
  };

  const saveChanges = async () => {
    await chrome.storage.local.set({ cache: pages, pagesCount: pages.length });
    alert("Changes saved!");
  };

  // const downloadAll = () => {
  //   if (pages.length === 0) return;

  //   const blob = new Blob([serializeSession(pages)], { type: "text/plain" });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = SESSION_FILENAME;
  //   a.click();
  //   URL.revokeObjectURL(url);
  // };

  const copyToClipboard = async () => {
    const text = serializeSession(pages);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const syncScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.scrollTop = 0;
    if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = 0;
  }, [activeTab]);

  if (pages.length === 0) {
    return (
      <div class="editor-container">
        <div class="editor-header">
          <div class="editor-title">
            <img src="assets/tab-bear-munch.png" alt="Tab Bear" />
            <h1>Tab Bear Editor</h1>
          </div>
        </div>
        <div class="empty-state">
          <h2>No pages captured</h2>
          <p>Start a session and browse some pages to capture content.</p>
        </div>
      </div>
    );
  }

  const activePage = pages[activeTab]!;
  const lineCount = activePage.markdown.split("\n").length;
  const tokenCount = estimateTokens(serializeSession(pages));

  return (
    <div class="editor-container">
      <div class="editor-header">
        <div class="editor-title">
          <h1>Tab Bear</h1>
          <span class="editor-stats">
            {pages.length} pages • ~{formatTokenCount(tokenCount)} tokens
          </span>
        </div>
        <div class="editor-actions">
          <button
            type="button"
            class="btn btn-primary"
            style={{ minWidth: "120px" }}
            onClick={() => void copyToClipboard()}
          >
            {copied ? "✓ Copied!" : "Copy All"}
          </button>
          {/* <button type="button" class="btn btn-secondary" onClick={downloadAll}>
            Download All
          </button> */}
          <button
            type="button"
            class="btn btn-secondary"
            onClick={() => void saveChanges()}
          >
            Save Changes
          </button>
        </div>
      </div>

      <div class="tabs-bar">
        {pages.map((page, index) => (
          <button
            type="button"
            key={page.url + page.timestamp}
            class={`tab ${index === activeTab ? "tab-active" : ""}`}
            onClick={() => setActiveTab(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>

      <div class="page-card">
        <div class="page-header">
          <a
            class="page-url"
            href={activePage.url}
            target="_blank"
            rel="noopener"
          >
            {activePage.url}
          </a>
          <button
            type="button"
            class="btn btn-danger btn-icon"
            onClick={() => deletePage(activeTab)}
          >
            Delete Page
          </button>
        </div>
        <div class="editor-wrapper">
          <div class="line-numbers" ref={lineNumbersRef}>
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            class="page-textarea"
            value={activePage.markdown}
            onInput={(e) =>
              updatePage(activeTab, (e.target as HTMLTextAreaElement).value)
            }
            onScroll={syncScroll}
          />
        </div>
      </div>
    </div>
  );
};

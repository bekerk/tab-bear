import { useEffect, useRef, useState } from "preact/hooks";
import {
  serializeSession,
  estimateTokens,
  formatTokenCount,
} from "../shared/session";
import { getCacheEntries, setCacheEntries } from "../shared/chromeApi";
import type { CacheEntry } from "../shared/types";

export const Editor = () => {
  const [pages, setPages] = useState<CacheEntry[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  const saveSeqRef = useRef(0);
  const lastPersistedSnapshotRef = useRef<string>("");

  useEffect(() => {
    void getCacheEntries().then((entries) => {
      // Avoid immediately re-writing whatever we just read.
      lastPersistedSnapshotRef.current = JSON.stringify(entries);
      setPages(entries);
    });
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

  // Auto-save on every edit (debounced) so there's no need for manual saving.
  useEffect(() => {
    if (pages.length === 0) return;

    const snapshot = JSON.stringify(pages);
    if (snapshot === lastPersistedSnapshotRef.current) return;

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    const seq = ++saveSeqRef.current;
    setSaveStatus("saving");

    saveTimerRef.current = window.setTimeout(() => {
      void setCacheEntries(pages)
        .then(() => {
          // Ignore stale saves if newer edits happened since this was scheduled.
          if (seq !== saveSeqRef.current) return;
          lastPersistedSnapshotRef.current = snapshot;
          setSaveStatus("saved");
          window.setTimeout(() => {
            if (seq !== saveSeqRef.current) return;
            setSaveStatus("idle");
          }, 1200);
        })
        .catch((err) => {
          if (seq !== saveSeqRef.current) return;
          console.error("Failed to auto-save editor changes", err);
          setSaveStatus("error");
        });
    }, 400);

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [pages]);

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
            <h1>Tab Bear</h1>
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
          <span
            class={`save-status ${
              saveStatus === "error"
                ? "error"
                : saveStatus === "saving"
                  ? "saving"
                  : saveStatus === "saved"
                    ? "saved"
                    : ""
            }`}
            aria-live="polite"
          >
            {saveStatus === "saving"
              ? "Saving…"
              : saveStatus === "saved"
                ? "Saved"
                : saveStatus === "error"
                  ? "Save failed"
                  : ""}
          </span>
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

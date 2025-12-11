import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  serializeSession,
  estimateTokens,
  formatTokenCount,
  shouldPreferDownload,
  downloadSession,
} from "../shared/session";
import { getCacheEntries, setCacheEntries } from "../shared/chromeApi";
import type { CacheEntry } from "../shared/types";
import { CopyButton } from "../shared/CopyButton";

export const Editor = () => {
  const [pages, setPages] = useState<CacheEntry[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [showToast, setShowToast] = useState(false);
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

  const syncScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.scrollTop = 0;
    if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = 0;
  }, [activeTab]);

  const handleCopyShortcut = (event: KeyboardEvent) => {
    if (pages.length === 0) return;

    // Don't override copy if user has text selected
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    void (async () => {
      try {
        const text = serializeSession(pages);
        await navigator.clipboard.writeText(text);
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 2000);
      } catch (error) {
        console.error("Failed to copy to clipboard:", error);
      }
    })();
  };

  const handleSaveShortcut = (event: KeyboardEvent) => {
    if (pages.length === 0) return;

    event.preventDefault();
    event.stopPropagation();

    const content = serializeSession(pages);
    downloadSession(content);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      const isCopyShortcut =
        event.key === "c" && (event.metaKey || event.ctrlKey);
      const isSaveShortcut =
        event.key === "s" && (event.metaKey || event.ctrlKey);

      if (isCopyShortcut) {
        handleCopyShortcut(event);
      }

      if (isSaveShortcut) {
        handleSaveShortcut(event);
      }
    };

    document.addEventListener("keydown", handleKeyboardShortcut);
    return () =>
      document.removeEventListener("keydown", handleKeyboardShortcut);
  }, [pages]);

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

  const sessionContent = useMemo(() => serializeSession(pages), [pages]);
  const tokenCount = useMemo(
    () => estimateTokens(sessionContent),
    [sessionContent],
  );
  const preferDownload = shouldPreferDownload(
    pages.length,
    sessionContent.length,
  );

  return (
    <>
      {showToast && (
        <div class="toast-notification">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0 }}
          >
            <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.2" />
            <path
              d="M6 10L8.5 12.5L14 7"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>MUNCH! Copied everything to clipboard.</span>
        </div>
      )}
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
            <CopyButton
              content={sessionContent}
              label={preferDownload ? "Download Session" : "Copy to Clipboard"}
              copiedLabel={preferDownload ? "✓ Downloaded!" : "✓ Copied!"}
              onDownload={
                preferDownload
                  ? () => downloadSession(sessionContent)
                  : undefined
              }
              style={{ minWidth: "160px" }}
            />
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
    </>
  );
};

import { useEffect, useState } from "preact/hooks";
import { getSessionSnapshot, getCacheEntries } from "../shared/chromeApi";
import { serializeSession, estimateTokens, formatTokenCount } from "../shared/session";
import type { SessionState } from "../shared/types";

const formatDuration = (startTime: number | null): string => {
  if (!startTime) return "0:00";
  const seconds = Math.floor((Date.now() - startTime) / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const Popup = () => {
  const [state, setState] = useState<SessionState>({
    active: false,
    pagesCount: 0,
    startTime: null,
  });
  const [duration, setDuration] = useState("0:00");
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void getSessionSnapshot().then(setState);
    void updateTokenCount();

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
    ) => {
      setState((prev) => ({
        active: changes.activeSession
          ? changes.activeSession.newValue === true
          : prev.active,
        pagesCount: changes.pagesCount
          ? Number(changes.pagesCount.newValue) || 0
          : prev.pagesCount,
        startTime: changes.sessionStartTime
          ? typeof changes.sessionStartTime.newValue === "number"
            ? changes.sessionStartTime.newValue
            : null
          : prev.startTime,
      }));
      if (changes.cache) {
        void updateTokenCount();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  useEffect(() => {
    if (!state.active || !state.startTime) return;
    const interval = setInterval(() => {
      setDuration(formatDuration(state.startTime));
    }, 1000);
    setDuration(formatDuration(state.startTime));
    return () => clearInterval(interval);
  }, [state.active, state.startTime]);

  const startSession = () => {
    void chrome.runtime.sendMessage({ type: "START_SESSION" });
  };

  const stopSession = () => {
    void chrome.runtime.sendMessage({ type: "STOP_SESSION" });
  };

  // const downloadSession = () => {
  //   void chrome.runtime.sendMessage({ type: "DOWNLOAD_SESSION" });
  // };

  const openEditor = () => {
    void chrome.runtime.sendMessage({ type: "OPEN_EDITOR" });
  };

  const updateTokenCount = async () => {
    const entries = await getCacheEntries();
    const text = serializeSession(entries);
    setTokenCount(estimateTokens(text));
  };

  const copyToClipboard = async () => {
    const entries = await getCacheEntries();
    const text = serializeSession(entries);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (state.active) {
    return (
      <div>
        <div class="header">
          <span class="header-title">Tab Bear</span>
        </div>

        <div class="status">
          <span>Recording Session</span>
          <span class="recording-dot" />
        </div>

        <div class="session-box">
          <div class="session-header">
            <span class="session-label">Active Session</span>
            <span class="session-duration">Duration: {duration}</span>
          </div>
          <div class="session-list">
            <div class="session-item">
              <span class="session-item-icon">●</span>
              <span>Pages captured: {state.pagesCount}</span>
            </div>
          </div>
        </div>

        <div class="btn-container">
          <button type="button" class="btn btn-primary" onClick={stopSession}>
            Stop Session
          </button>
        </div>
      </div>
    );
  }

  const hasData = state.pagesCount > 0;

  return (
    <div class="center">
      <div class="header" style={{ justifyContent: "center", width: "100%" }}>
        <span class="header-title">Tab Bear</span>
      </div>

      {hasData && <h2 class="finished-title">Session Finished!</h2>}

      <img src="assets/tab-bear-munch.png" alt="Tab Bear" class="bear-icon" />

      <div class="stats">
        {hasData
          ? `Pages: ${state.pagesCount} • ~${formatTokenCount(tokenCount)} tokens`
          : "Ready to start recording"}
      </div>

      {hasData && (
        <div class="btn-container">
          <button
            type="button"
            class="btn btn-primary"
            style={{ minWidth: "180px" }}
            onClick={() => void copyToClipboard()}
          >
            {copied ? "✓ Copied!" : "Copy to Clipboard"}
          </button>
          <button type="button" class="btn btn-secondary" onClick={openEditor}>
            Preview Data
          </button>
          {/* <button
            type="button"
            class="btn btn-secondary"
            onClick={downloadSession}
          >
            Download TXT
          </button> */}
        </div>
      )}

      <div class="btn-container">
        <button type="button" class="btn btn-link" onClick={startSession}>
          Start New Session
        </button>
      </div>
    </div>
  );
};

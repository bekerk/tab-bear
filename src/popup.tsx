import { render } from "preact";
import { useEffect, useState } from "preact/hooks";

type SessionState = {
  active: boolean;
  pagesCount: number;
};

const Popup = () => {
  const [state, setState] = useState<SessionState>({
    active: false,
    pagesCount: 0,
  });

  useEffect(() => {
    chrome.storage.local.get(["activeSession", "pagesCount"], (stored) => {
      setState({
        active: stored.activeSession === true,
        pagesCount: Number(stored.pagesCount) || 0,
      });
    });

    type StorageChangeListener = Parameters<
      typeof chrome.storage.onChanged.addListener
    >[0];

    const handleStorageChange: StorageChangeListener = (changes, areaName) => {
      if (areaName !== "local") return;
      setState((prev) => ({
        active:
          "activeSession" in changes
            ? changes.activeSession?.newValue === true
            : prev.active,
        pagesCount:
          "pagesCount" in changes
            ? Number(changes.pagesCount?.newValue) || 0
            : prev.pagesCount,
      }));
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const startSession = () => {
    chrome.runtime.sendMessage({ type: "START_SESSION" });
    setState((prev) => ({ ...prev, active: true }));
  };

  const stopSession = () => {
    chrome.runtime.sendMessage({ type: "STOP_SESSION" });
    setState((prev) => ({ ...prev, active: false }));
  };

  const downloadSession = () => {
    chrome.runtime.sendMessage({ type: "DOWNLOAD_SESSION" });
  };

  return (
    <div
      style={{
        fontFamily: "monospace",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 10,
        width: 150,
        gap: 8,
      }}
    >
      <img src="assets/tab-bear.png" alt="Tab Bear" width={128} height={128} />

      <button
        type="button"
        className={state.active ? "is-active" : ""}
        style={{ width: "100%", padding: 8 }}
        aria-pressed={state.active}
        onClick={startSession}
      >
        {state.active ? "Session Active" : "Start Session"}
      </button>

      <button
        type="button"
        style={{ width: "100%", padding: 8 }}
        disabled={!state.active}
        onClick={stopSession}
      >
        Stop Session
      </button>

      <button
        type="button"
        style={{ width: "100%", padding: 8 }}
        onClick={downloadSession}
      >
        Download Session
      </button>

      <p>{state.pagesCount} pages</p>
      <p>{state.active ? "Session Active" : "Session Idle"}</p>
    </div>
  );
};

const root = document.getElementById("root");
if (root) {
  render(<Popup />, root);
}

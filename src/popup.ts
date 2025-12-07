const startSessionButton = document.getElementById(
  "start_session_btn",
) as HTMLButtonElement | null;
const stopSessionButton = document.getElementById(
  "stop_session_btn",
) as HTMLButtonElement | null;
const downloadSessionButton = document.getElementById(
  "download_session_btn",
) as HTMLButtonElement | null;
const sessionStatus = document.getElementById(
  "session_status",
) as HTMLParagraphElement | null;
const pagesCount = document.getElementById(
  "pages_count",
) as HTMLParagraphElement | null;

const updateStartButton = (isActive: boolean) => {
  if (!startSessionButton) return;
  startSessionButton.classList.toggle("is-active", isActive);
  startSessionButton.textContent = isActive
    ? "Session Active"
    : "Start Session";
};

const updateSessionStatus = (isActive: boolean) => {
  if (!sessionStatus) return;
  sessionStatus.textContent = isActive ? "Session Active" : "Session Idle";
};

const applySessionState = (isActive: boolean) => {
  updateStartButton(isActive);
  updateSessionStatus(isActive);
};

const updatePagesCount = (count: number) => {
  if (!pagesCount) return;
  pagesCount.textContent = `${count} pages`;
};

chrome.storage.local.get(["activeSession", "pagesCount"], (stored) => {
  const isActive = stored.activeSession === true;
  applySessionState(isActive);
  updatePagesCount(Number(stored.pagesCount) || 0);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if ("activeSession" in changes) {
    const isActive = changes.activeSession?.newValue === true;
    applySessionState(isActive);
  }
  if ("pagesCount" in changes) {
    updatePagesCount(Number(changes.pagesCount?.newValue) || 0);
  }
});

startSessionButton?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "START_SESSION" });
  applySessionState(true);
});

stopSessionButton?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "STOP_SESSION" });
  applySessionState(false);
});

downloadSessionButton?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "DOWNLOAD_SESSION" });
});

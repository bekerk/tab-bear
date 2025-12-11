import { getActiveSession, getCacheIndex } from "../shared/chromeApi";

const INDICATOR_ID = "tab-bear-indicator";
const INDICATOR_STYLES_ID = "tab-bear-indicator-styles";
type IndicatorState = "active" | "pending";
type StorageChangeMap = Record<string, chrome.storage.StorageChange>;
type Unsubscribe = () => void;

const createIndicatorElement = (state: IndicatorState): HTMLDivElement => {
  const container = document.createElement("div");
  container.id = INDICATOR_ID;
  container.dataset.state = state;

  const bearButton = document.createElement("button");
  bearButton.className = "tab-bear-button";
  bearButton.setAttribute("aria-label", "Open Tab Bear Editor");

  const img = document.createElement("img");
  img.src = chrome.runtime.getURL("assets/tab-bear-munch.png");
  img.alt = "Tab Bear";

  const indicator = document.createElement("div");
  indicator.className = "tab-bear-dot";
  indicator.setAttribute("aria-hidden", "true");

  bearButton.appendChild(img);
  bearButton.appendChild(indicator);
  container.appendChild(bearButton);

  bearButton.addEventListener("click", handleIndicatorClick);

  return container;
};

const handleIndicatorClick = (): void => {
  void chrome.runtime.sendMessage({ type: "OPEN_EDITOR" });
};

const injectIndicatorStyles = async (): Promise<void> => {
  if (document.getElementById(INDICATOR_STYLES_ID)) {
    return;
  }

  const styleUrl = chrome.runtime.getURL("content/indicator.css");
  const response = await fetch(styleUrl);
  const css = await response.text();

  const style = document.createElement("style");
  style.id = INDICATOR_STYLES_ID;
  style.textContent = css;

  document.head.appendChild(style);
};

const removeIndicator = (): void => {
  const existing = document.getElementById(INDICATOR_ID);
  if (existing) {
    existing.remove();
  }
};

export const showIndicator = async (
  state: IndicatorState = "active",
): Promise<void> => {
  removeIndicator();
  await injectIndicatorStyles();

  const indicator = createIndicatorElement(state);
  document.body.appendChild(indicator);
};

export const hideIndicator = (): void => {
  removeIndicator();
};

export const isUrlCached = (cacheIndex: string[], url: string): boolean =>
  cacheIndex.includes(url);

const handleStorageChange = (
  changes: StorageChangeMap,
  areaName: string,
): void => {
  if (areaName !== "local") return;

  if (changes.activeSession && changes.activeSession.newValue !== true) {
    hideIndicator();
    return;
  }

  if (changes.cacheIndex || changes.activeSession) {
    void checkAndShowIndicator();
  }
};

export const checkAndShowIndicator = async (): Promise<void> => {
  const [active, cacheIndex] = await Promise.all([
    getActiveSession(),
    getCacheIndex(),
  ]);

  if (!active) {
    hideIndicator();
    return;
  }

  const state: IndicatorState = isUrlCached(cacheIndex, location.href)
    ? "active"
    : "pending";

  if (document.body) {
    await showIndicator(state);
  } else {
    window.addEventListener(
      "DOMContentLoaded",
      () => {
        void showIndicator(state);
      },
      {
        once: true,
      },
    );
  }
};

export const subscribeToIndicatorUpdates = (): Unsubscribe => {
  chrome.storage.onChanged.addListener(handleStorageChange);
  return () => chrome.storage.onChanged.removeListener(handleStorageChange);
};

export const deactivateIndicator = (): void => {
  hideIndicator();
};

import { describe, test, expect, beforeEach } from "bun:test";
import {
  checkAndShowIndicator,
  isPageCached,
  subscribeToIndicatorUpdates,
} from "../../src/content/indicator";
import type { CacheEntry } from "../../src/shared/types";
import { createChromeMock, installChromeMock } from "../helpers/chromeMock";

class FakeElement {
  id = "";
  className = "";
  dataset: Record<string, string> = {};
  children: FakeElement[] = [];
  parent?: FakeElement;
  textContent = "";
  style: Record<string, string> = {};
  constructor(public tag: string) {}

  addEventListener(_event: string, _cb: () => void) {}

  appendChild(child: FakeElement) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (this.parent) {
      this.parent.children = this.parent.children.filter((c) => c !== this);
    }
  }

  setAttribute(name: string, value: string) {
    (this as any)[name] = value;
  }

  queryById(id: string): FakeElement | null {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.queryById(id);
      if (found) return found;
    }
    return null;
  }
}

class FakeDocument {
  body = new FakeElement("body");
  head = new FakeElement("head");

  createElement(tag: string) {
    return new FakeElement(tag);
  }

  getElementById(id: string) {
    return this.body.queryById(id) || this.head.queryById(id);
  }
}

const entry = (url: string): CacheEntry => ({
  url,
  markdown: "# title",
  timestamp: 123,
});

describe("isPageCached", () => {
  test("returns true when url is in cache", () => {
    const cached = [entry("https://example.com/a"), entry("https://example.com/b")];
    expect(isPageCached(cached, "https://example.com/b")).toBe(true);
  });

  test("returns false when url missing", () => {
    const cached = [entry("https://example.com/a")];
    expect(isPageCached(cached, "https://example.com/other")).toBe(false);
  });
});

describe("indicator state updates", () => {
  beforeEach(() => {
    const fakeDocument = new FakeDocument();
    (globalThis as unknown as { document: FakeDocument }).document = fakeDocument;
    (globalThis as unknown as { window: unknown }).window = {
      addEventListener: (_event: string, cb: () => void) => cb(),
    };
    (globalThis as unknown as { location: { href: string; protocol: string } }).location =
      { href: "https://example.com", protocol: "https:" };
    (globalThis.fetch as unknown) = async () => ({
      text: async () => "",
    });
  });

  test("hides indicator when session deactivates", async () => {
    const chromeMock = createChromeMock({
      activeSession: true,
      cache: [entry("https://example.com")],
    });
    installChromeMock(chromeMock);

    await checkAndShowIndicator();
    expect(document.getElementById("tab-bear-indicator")).not.toBeNull();

    await subscribeToIndicatorUpdates();
    chrome.storage.local.set({ activeSession: false });

    expect(document.getElementById("tab-bear-indicator")).toBeNull();
  });
});

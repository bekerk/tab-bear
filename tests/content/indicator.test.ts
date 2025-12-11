import { describe, test, expect, beforeEach } from "bun:test";
import {
  checkAndShowIndicator,
  isUrlCached,
  subscribeToIndicatorUpdates,
} from "../../src/content/indicator";
import { createChromeMock, installChromeMock } from "../helpers/chromeMock";

class FakeElement {
  id = "";
  className = "";
  dataset: Record<string, string> = {};
  attributes: Record<string, string> = {};
  children: FakeElement[] = [];
  parent?: FakeElement;
  textContent = "";
  style: Record<string, string> = {};
  constructor(public tag: string) {}

  addEventListener() {}

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
    this.attributes[name] = value;
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

describe("isUrlCached", () => {
  test("returns true when url is in cache", () => {
    const cached = ["https://example.com/a", "https://example.com/b"];
    expect(isUrlCached(cached, "https://example.com/b")).toBe(true);
  });

  test("returns false when url missing", () => {
    const cached = ["https://example.com/a"];
    expect(isUrlCached(cached, "https://example.com/other")).toBe(false);
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
    (globalThis.fetch as unknown) = () =>
      Promise.resolve({
        text: () => Promise.resolve(""),
      });
  });

  test("hides indicator when session deactivates", async () => {
    const chromeMock = createChromeMock({
      activeSession: true,
      cacheIndex: ["https://example.com"],
    });
    installChromeMock(chromeMock);

    await checkAndShowIndicator();
    expect(document.getElementById("tab-bear-indicator")).not.toBeNull();

    const unsubscribe = subscribeToIndicatorUpdates();
    void chrome.storage.local.set({ activeSession: false });
    unsubscribe();

    expect(document.getElementById("tab-bear-indicator")).toBeNull();
  });
});

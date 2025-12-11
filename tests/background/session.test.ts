import { describe, test, expect, beforeEach } from "bun:test";
import {
  cacheMarkdown,
  ensureDefaults,
  startSession,
  stopSession,
} from "../../src/background/session";
import { MAX_MARKDOWN_LENGTH } from "../../src/shared/session";
import { getCacheEntriesStore, setCacheEntriesStore } from "../../src/shared/cacheStore";
import { createChromeMock, installChromeMock } from "../helpers/chromeMock";

const setChrome = (initial?: Record<string, unknown>) => {
  const chromeMock = createChromeMock(initial);
  installChromeMock(chromeMock);
  return chromeMock;
};

describe("ensureDefaults", () => {
  test("hydrates missing defaults", async () => {
    const chromeMock = setChrome();

    await ensureDefaults();

    expect(chromeMock.__data.activeSession).toBe(false);
    expect(chromeMock.__data.cacheIndex).toEqual([]);
    expect(chromeMock.__data.pagesCount).toBe(0);
    expect(chromeMock.__data.sessionStartTime).toBeNull();
  });
});

describe("session lifecycle", () => {
  test("startSession seeds active state and counters", async () => {
    const chromeMock = setChrome();

    await startSession();

    expect(chromeMock.__data.activeSession).toBe(true);
    expect(chromeMock.__data.pagesCount).toBe(0);
    expect(chromeMock.__data.cacheIndex).toEqual([]);
    expect(typeof chromeMock.__data.sessionStartTime).toBe("number");
    expect(await getCacheEntriesStore()).toEqual([]);
  });

  test("stopSession only flips flags and preserves cache", async () => {
    const chromeMock = setChrome({
      activeSession: true,
      pagesCount: 1,
      sessionStartTime: Date.now(),
    });
    await setCacheEntriesStore([{ url: "x", markdown: "y", timestamp: 1 }]);

    await stopSession();

    expect(chromeMock.__data.activeSession).toBe(false);
    expect(chromeMock.__data.sessionStartTime).toBeNull();
    expect(chromeMock.__data.pagesCount).toBe(1);
    expect(await getCacheEntriesStore()).toHaveLength(1);
  });
});

describe("cacheMarkdown", () => {
  test("does nothing when inactive", async () => {
    const chromeMock = setChrome({ activeSession: false, cache: [] });

    await cacheMarkdown("https://example.com", "# title", 1);

    expect(await getCacheEntriesStore()).toEqual([]);
    expect(chromeMock.__data.pagesCount).toBe(0);
  });

  test("does nothing without tab id", async () => {
    const chromeMock = setChrome({ activeSession: true, cache: [] });

    await cacheMarkdown("https://example.com", "# title");

    expect(await getCacheEntriesStore()).toEqual([]);
  });

  test("backfills pagesCount when missing but cache exists", async () => {
    const chromeMock = setChrome({
      activeSession: false,
    });
    await setCacheEntriesStore([{ url: "a", markdown: "b", timestamp: 1 }]);

    await cacheMarkdown("https://example.com", "# title", 1);

    expect(chromeMock.__data.pagesCount).toBe(1);
  });

  test("caps markdown length", async () => {
    const chromeMock = setChrome({ activeSession: true, cache: [] });
    const tooLong = "x".repeat(MAX_MARKDOWN_LENGTH + 1);

    await cacheMarkdown("https://example.com", tooLong, 1);

    expect(await getCacheEntriesStore()).toEqual([]);
  });

  test("stores cache entry and updates count when active", async () => {
    const chromeMock = setChrome({ activeSession: true, cache: [] });

    await cacheMarkdown("https://example.com", "# title", 5);

    const cache = await getCacheEntriesStore();
    expect(cache).toHaveLength(1);
    expect(chromeMock.__data.pagesCount).toBe(1);
    expect(chromeMock.__data.cacheIndex).toEqual(["https://example.com"]);
  });

  test("serializes concurrent cache writes", async () => {
    const chromeMock = setChrome({ activeSession: true, cache: [] });

    await Promise.all([
      cacheMarkdown("https://one.com", "# one", 1),
      cacheMarkdown("https://two.com", "# two", 1),
    ]);

    const cache = (await getCacheEntriesStore()) as Array<{ url: string }>;
    expect(cache.map((c) => c.url).sort()).toEqual([
      "https://one.com",
      "https://two.com",
    ]);
    expect(chromeMock.__data.pagesCount).toBe(2);
  });

  test("caps cache size and drops oldest entries", async () => {
    const chromeMock = setChrome({
      activeSession: true,
      cacheIndex: [],
    });
    await setCacheEntriesStore(
      Array.from({ length: 105 }, (_, i) => ({
        url: `https://example.com/${i}`,
        markdown: `# ${i}`,
        timestamp: i,
      })),
    );

    await cacheMarkdown("https://new.com", "# new", 1);

    const cache = (await getCacheEntriesStore()) as Array<{ url: string }>;
    expect(cache.length).toBeLessThanOrEqual(100);
    expect(cache[0].url).toBe("https://example.com/6");
  });

  test("surfaces storage errors when persisting cache", async () => {
    const chromeMock = setChrome({ activeSession: true, cache: [] });
    chromeMock.storage.local.set.callsFake((_items, callback) => {
      chromeMock.runtime.lastError = { message: "Quota exceeded" } as any;
      callback?.();
    });

    await expect(
      cacheMarkdown("https://example.com", "# title", 1),
    ).rejects.toThrow("Quota exceeded");
  });
});

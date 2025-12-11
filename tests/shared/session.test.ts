import { describe, test, expect } from "bun:test";
import { MAX_MARKDOWN_LENGTH, normalizeCacheEntries, serializeSession, estimateTokens, formatTokenCount } from "../../src/shared/session";
import type { CacheEntry } from "../../src/shared/types";

const validEntry = (overrides: Partial<CacheEntry> = {}): CacheEntry => ({
  url: "https://example.com",
  markdown: "# title",
  timestamp: Date.now(),
  ...overrides,
});

describe("normalizeCacheEntries", () => {
  test("keeps only well-formed entries", () => {
    const result = normalizeCacheEntries([
      validEntry(),
      { url: "bad", markdown: "# missing timestamp" },
      validEntry({ markdown: "x".repeat(MAX_MARKDOWN_LENGTH + 1) }),
      42,
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]!.url).toBe("https://example.com");
  });

  test("returns empty array for non-array input", () => {
    expect(normalizeCacheEntries(undefined)).toEqual([]);
    expect(normalizeCacheEntries({})).toEqual([]);
  });
});

describe("serializeSession", () => {
  test("serializes pages in expected format", () => {
    const output = serializeSession([
      validEntry({ url: "https://a.com", markdown: "# A" }),
      validEntry({ url: "https://b.com", markdown: "# B" }),
    ]);

    expect(output).toContain("<session>");
    expect(output).toContain('<page url="https://a.com">');
    expect(output).toContain("# B");
    expect(output.trim().endsWith("</session>")).toBe(true);
  });

  test("includes metadata header for each page", () => {
    const timestamp = new Date("2025-12-11T10:30:00Z").getTime();
    const output = serializeSession([
      validEntry({
        url: "https://news.ycombinator.com/item?id=123",
        markdown: "# Hacker News Thread\n\nSome content here",
        timestamp,
      }),
    ]);

    expect(output).toContain("---");
    expect(output).toContain("Source: news.ycombinator.com");
    expect(output).toContain("URL: https://news.ycombinator.com/item?id=123");
    expect(output).toContain("Scraped Date: 2025-12-11");
    expect(output).toContain("Title: Hacker News Thread");
  });

  test("strips www from source hostname", () => {
    const output = serializeSession([
      validEntry({ url: "https://www.example.com", markdown: "# Test" }),
    ]);

    expect(output).toContain("Source: example.com");
    expect(output).not.toContain("Source: www.example.com");
  });

  test("handles pages without title", () => {
    const output = serializeSession([
      validEntry({ url: "https://example.com", markdown: "No title here" }),
    ]);

    expect(output).toContain("Title: Untitled");
  });
});

describe("estimateTokens", () => {
  test("estimates tokens from word count", () => {
    const text = "This is a simple test with ten words here.";
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(10);
    expect(tokens).toBeLessThan(20);
  });

  test("handles empty text", () => {
    expect(estimateTokens("")).toBe(0);
  });
});

describe("formatTokenCount", () => {
  test("formats small numbers as-is", () => {
    expect(formatTokenCount(42)).toBe("42");
    expect(formatTokenCount(999)).toBe("999");
  });

  test("formats thousands with k suffix", () => {
    expect(formatTokenCount(1000)).toBe("1.0k");
    expect(formatTokenCount(4567)).toBe("4.6k");
    expect(formatTokenCount(999999)).toBe("1000.0k");
  });

  test("formats millions with M suffix", () => {
    expect(formatTokenCount(1000000)).toBe("1.0M");
    expect(formatTokenCount(2500000)).toBe("2.5M");
  });
});

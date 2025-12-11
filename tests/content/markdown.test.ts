import { describe, test, expect } from "bun:test";
import { isValidMarkdownLine } from "../../src/content/markdown";

describe("isValidMarkdownLine", () => {
  test("allows empty and normal content", () => {
    expect(isValidMarkdownLine("")).toBe(true);
    expect(isValidMarkdownLine("Hello world")).toBe(true);
  });

  test("filters LinkedIn telemetry blobs", () => {
    expect(isValidMarkdownLine('{"$type":"com.linkedin","entityUrn":"urn:li:abc"}')).toBe(false);
    expect(isValidMarkdownLine('{"$recipeTypes":[],"lixTracking":{}}')).toBe(false);
    expect(isValidMarkdownLine("voyager.dash.activityFeed")).toBe(false);
  });

  test("filters very long json-like lines", () => {
    const jsonPairs = Array.from({ length: 15 }, (_, i) => `"field${i}":"${i}"`).join(",");
    const longJson = `"wrapper":{${jsonPairs}}`.padEnd(850, "x");

    expect(isValidMarkdownLine(longJson)).toBe(false);
  });
});

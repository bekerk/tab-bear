import { describe, test, expect } from "bun:test";
import { downloadSession } from "../../src/background/download";
import { SESSION_FILENAME } from "../../src/shared/session";
import { setCacheEntriesStore } from "../../src/shared/cacheStore";
import { createChromeMock, installChromeMock } from "../helpers/chromeMock";

const installUrlStubs = () => {
  const created: string[] = [];
  const revoked: string[] = [];
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  const createObjectURL = (blob: Blob) => {
    created.push(blob.type);
    return `blob:${created.length}`;
  };

  const revokeObjectURL = (url: string) => {
    revoked.push(url);
  };

  Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });

  const restore = () => {
    Object.defineProperty(URL, "createObjectURL", { value: originalCreate, configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: originalRevoke, configurable: true });
  };

  return { created, revoked, restore };
};

describe("downloadSession", () => {
  test("no-ops when cache is empty", async () => {
    const chromeMock = createChromeMock({ cache: [] });
    installChromeMock(chromeMock);

    await downloadSession();

    expect(chromeMock.__downloads).toHaveLength(0);
  });

  test("downloads serialized session when cache exists", async () => {
    const chromeMock = createChromeMock();
    installChromeMock(chromeMock);
    await setCacheEntriesStore([
      { url: "https://example.com", markdown: "# title", timestamp: 123 },
    ]);
    const urlStubs = installUrlStubs();

    await downloadSession();
    urlStubs.restore();

    expect(chromeMock.__downloads).toHaveLength(1);
    expect(chromeMock.__downloads[0].filename).toBe(SESSION_FILENAME);
    expect(chromeMock.__downloads[0].url).toContain("blob:");
    expect(urlStubs.created[0]).toContain("text/plain");
    expect(urlStubs.revoked).toContain(chromeMock.__downloads[0].url as string);
  });
});

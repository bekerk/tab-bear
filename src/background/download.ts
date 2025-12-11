import { SESSION_FILENAME, serializeSession } from "../shared/session";
import { getCacheEntriesStore } from "../shared/cacheStore";

export const downloadSession = async () => {
  const cache = await getCacheEntriesStore();

  if (cache.length === 0) return;

  const blob = new Blob([serializeSession(cache)], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download(
    {
      url,
      filename: SESSION_FILENAME,
      saveAs: true,
    },
    () => URL.revokeObjectURL(url),
  );
};

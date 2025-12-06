import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

turndown.remove([
  "script",
  "style",
  "noscript",
  "nav",
  "footer",
  "header",
  "aside",
]);

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const extractMarkdown = (): string => {
  const title = document.title;
  const markdown = turndown.turndown(document.body);
  return `# ${title}\n\n${markdown}`;
};

const maybeSendMarkdown = async () => {
  if (!document.body) return;
  if (!ALLOWED_PROTOCOLS.has(location.protocol)) return;

  const { activeSession } = await chrome.storage.local.get("activeSession");
  if (activeSession !== true) return;

  try {
    const markdown = extractMarkdown();
    chrome.runtime.sendMessage({
      type: "CACHE_MARKDOWN",
      markdown,
      url: location.href,
    });
  } catch (err) {
    console.error("Failed to capture markdown", err);
  }
};

void maybeSendMarkdown();

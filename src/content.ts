import TurndownService from "turndown";

const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced"
});

turndown.remove(["script", "style", "noscript", "nav", "footer", "header", "aside"]);

function extractMarkdown(): string {
    const title = document.title;
    const markdown = turndown.turndown(document.body);
    return `# ${title}\n\n${markdown}`;
}

const markdown = extractMarkdown();
chrome.runtime.sendMessage({ type: "CACHE_MARKDOWN", markdown, url: location.href });

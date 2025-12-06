type CacheEntry = { url: string; markdown: string; timestamp: number };

chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.type !== "CACHE_MARKDOWN" || !sender.tab?.id) return;

    const entry: CacheEntry = {
        url: msg.url,
        markdown: msg.markdown,
        timestamp: Date.now()
    };

    // Store by tab ID
    chrome.storage.local.set({ [`tab_${sender.tab.id}`]: entry });
    console.log(`Cached markdown for tab ${sender.tab.id}: ${msg.url}`);
});

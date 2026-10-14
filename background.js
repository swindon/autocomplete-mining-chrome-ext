/**
 * Autocomplete Mining - Background Service Worker (Manifest V3)
 */

// Enable side panel to open on toolbar action click
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn("Could not set panel behavior:", err);
    });
  }
});

/**
 * Determine supported platform from URL
 * @param {string} url
 * @returns {"google"|"etsy"|"youtube"|"unsupported"}
 */
function identifyPlatform(url) {
  if (!url) return "unsupported";
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("google.")) return "google";
    if (host.includes("etsy.com")) return "etsy";
    if (host.includes("youtube.com")) return "youtube";
  } catch (e) {
    // invalid URL (e.g. chrome:// or about:blank)
  }
  return "unsupported";
}

// Track active tab and broadcast platform changes to side panel
async function broadcastCurrentTabPlatform() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    const platform = identifyPlatform(tab.url);
    chrome.runtime.sendMessage({
      type: "TAB_CHANGED",
      tabId: tab.id,
      url: tab.url,
      title: tab.title,
      platform
    }).catch(() => {
      // Side panel might not be open, which is normal
    });
  } catch (err) {
    console.debug("broadcastCurrentTabPlatform error:", err);
  }
}

chrome.tabs.onActivated.addListener(() => {
  broadcastCurrentTabPlatform();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    broadcastCurrentTabPlatform();
  }
});

// Handle incoming messages from side panel or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_ACTIVE_PLATFORM") {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab) {
        sendResponse({ platform: "unsupported", tabId: null, url: null });
        return;
      }
      const platform = identifyPlatform(tab.url);
      sendResponse({ platform, tabId: tab.id, url: tab.url, title: tab.title });
    });
    return true; // async sendResponse
  }

  if (message.type === "NAVIGATE_TAB") {
    const { tabId, url } = message;
    if (tabId && url) {
      chrome.tabs.update(tabId, { url }).then((tab) => {
        sendResponse({ success: true, tab });
      }).catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }
  }

  if (message.type === "ENSURE_CONTENT_SCRIPT") {
    const { tabId } = message;
    if (!tabId) {
      sendResponse({ success: false, error: "No tabId provided" });
      return;
    }

    // Ping content script first
    chrome.tabs.sendMessage(tabId, { type: "PING" }, (resp) => {
      if (chrome.runtime.lastError || !resp || !resp.pong) {
        // Content script not yet injected; inject dynamically
        chrome.scripting.executeScript({
          target: { tabId },
          files: ["content/content.js"]
        }).then(() => {
          sendResponse({ success: true, injected: true });
        }).catch((err) => {
          sendResponse({ success: false, error: err.message });
        });
      } else {
        sendResponse({ success: true, alreadyInjected: true });
      }
    });
    return true;
  }

  // Direct fetch fallback handler for Google / YouTube / Etsy
  if (message.type === "FETCH_DIRECT_SUGGESTIONS") {
    const { platform, query } = message;
    fetchDirectSuggestions(platform, query)
      .then((suggestions) => sendResponse({ success: true, suggestions }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

/**
 * Direct suggestion fetcher fallback (for API / background mode or DOM fallback)
 */
async function fetchDirectSuggestions(platform, query) {
  if (!query || !query.trim()) return [];
  const q = encodeURIComponent(query.trim());

  if (platform === "google") {
    const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${q}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google API returned status ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1].map(item => String(item).trim()).filter(Boolean);
    }
    return [];
  }

  if (platform === "youtube") {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${q}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API returned status ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1].map(item => String(item).trim()).filter(Boolean);
    }
    return [];
  }

  if (platform === "etsy") {
    const url = `https://www.etsy.com/api/v3/ajax/public/search/suggestions?query=${q}`;
    try {
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.results || json.suggestions || [];
        if (Array.isArray(list)) {
          return list.map(item => {
            if (typeof item === "string") return item.trim();
            return (item.query || item.display_name || item.name || "").trim();
          }).filter(Boolean);
        }
      }
    } catch (e) {
      console.warn("Etsy fetchDirectSuggestions error:", e);
    }
    return [];
  }

  return [];
}

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
 * @returns {"google"|"etsy"|"youtube"|"amazon"|"unsupported"}
 */
function identifyPlatform(url) {
  if (!url) return "unsupported";
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("google.")) return "google";
    if (host.includes("etsy.com")) return "etsy";
    if (host.includes("youtube.com")) return "youtube";
    if (host.includes("amazon.")) return "amazon";
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

  if (message.type === "OPEN_TAB") {
    const { url } = message;
    if (url) {
      chrome.tabs.create({ url }).then((tab) => {
        sendResponse({ success: true, tabId: tab.id });
      }).catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }
  }

  if (message.type === "OPEN_AI_TAB") {
    const { url, prompt, serviceId, needsInjection, selectors } = message;
    if (url) {
      chrome.tabs.create({ url }).then((tab) => {
        sendResponse({ success: true, tabId: tab.id });
        if (needsInjection && prompt) {
          setupChatInjection(tab.id, prompt, serviceId, selectors || []);
        }
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
      return data[1].map(item => {
        let text = String(item).trim();
        const ellipsisRegex = /^\s*(?:\.{3,}|…)\s*/;
        if (ellipsisRegex.test(text)) {
          const remainder = text.replace(ellipsisRegex, "").trim();
          const cleanQuery = (query || "").trim();
          return cleanQuery ? (remainder ? `${cleanQuery} ${remainder}` : cleanQuery) : remainder;
        }
        return text;
      }).filter(Boolean);
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

  if (platform === "amazon") {
    const url = `https://completion.amazon.com/api/2017/suggestions?mid=ATVPDKIKX0DER&alias=aps&prefix=${q}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.suggestions)) {
          return json.suggestions.map(item => {
            if (typeof item === "string") return item.trim();
            return (item.value || "").trim();
          }).filter(Boolean);
        }
      }
    } catch (e) {
      console.warn("Amazon fetchDirectSuggestions error:", e);
    }
    return [];
  }

  return [];
}

/**
 * Monitor newly opened AI tab and inject prompt directly into chat input
 * when the document and its SPA input components mount.
 */
function setupChatInjection(targetTabId, prompt, serviceId, selectors = []) {
  let attempts = 0;
  const maxAttempts = 3;
  let timeoutId = null;

  function cleanup() {
    chrome.tabs.onUpdated.removeListener(tabListener);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  // Safety cleanup timeout (45s)
  timeoutId = setTimeout(cleanup, 45000);

  function executeInjection() {
    chrome.scripting.executeScript({
      target: { tabId: targetTabId },
      func: injectPromptIntoPage,
      args: [prompt, serviceId, selectors]
    }).catch((err) => {
      console.debug("Chat prompt injection note:", err.message);
    });
  }

  function tabListener(tabId, changeInfo, tab) {
    if (tabId !== targetTabId) return;

    if (changeInfo.status === "complete") {
      attempts++;
      if (attempts >= maxAttempts) {
        cleanup();
      }
      executeInjection();
    }
  }

  chrome.tabs.onUpdated.addListener(tabListener);

  // Check if tab is already complete
  chrome.tabs.get(targetTabId).then((tab) => {
    if (tab && tab.status === "complete") {
      executeInjection();
    }
  }).catch(() => {});
}

/**
 * Injected into the AI chat web page to detect the input element and paste/insert the prompt.
 * Runs in the target tab's context.
 */
function injectPromptIntoPage(prompt, serviceId, selectors) {
  if (window.__acMiningPromptInjected) return;

  const defaultSelectors = [
    "#prompt-textarea",
    "div#prompt-textarea",
    "div[contenteditable='true'].ProseMirror",
    "div.ProseMirror[contenteditable='true']",
    "rich-textarea div[contenteditable='true']",
    "div.ql-editor[contenteditable='true']",
    "textarea#chat-input",
    "textarea#userInput",
    "textarea[placeholder*='Ask' i]",
    "textarea[placeholder*='prompt' i]",
    "textarea[placeholder*='Message' i]",
    "div[contenteditable='true']",
    "textarea"
  ];

  const targetSelectors = (Array.isArray(selectors) && selectors.length > 0)
    ? [...selectors, ...defaultSelectors]
    : defaultSelectors;

  function findInputElement() {
    for (const sel of targetSelectors) {
      try {
        const elements = document.querySelectorAll(sel);
        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          if (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            parseFloat(style.opacity || "1") > 0.05 &&
            (rect.width > 20 || rect.height > 10 || el.offsetParent !== null)
          ) {
            return el;
          }
        }
      } catch (e) {
        // Ignore invalid selector queries
      }
    }
    return null;
  }

  function insertText(el, text) {
    if (!el || window.__acMiningPromptInjected) return;

    el.focus();

    const isContentEditable = el.isContentEditable || el.getAttribute("contenteditable") === "true";

    if (isContentEditable) {
      // Modern ProseMirror, Lexical, or Quill contenteditable
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);

      let success = false;
      try {
        success = document.execCommand("insertText", false, text);
      } catch (err) {
        success = false;
      }

      if (!success || !el.textContent.includes(text.slice(0, 30))) {
        el.textContent = text;
        el.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: text
        }));
      }

      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      // Textarea / text input (React, Vue, or standard)
      el.focus();
      el.select?.();

      let success = false;
      try {
        success = document.execCommand("insertText", false, text);
      } catch (err) {
        success = false;
      }

      if (!success || el.value !== text) {
        const proto = Object.getPrototypeOf(el);
        const valueSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set
          || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;

        if (valueSetter) {
          valueSetter.call(el, text);
        } else {
          el.value = text;
        }

        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    // Scroll input into view
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {}

    window.__acMiningPromptInjected = true;
    console.log("Autocomplete Mining: Successfully pasted prompt into chat input.");
  }

  // Check if input element is already rendered
  const immediateEl = findInputElement();
  if (immediateEl) {
    insertText(immediateEl, prompt);
    return;
  }

  // Poll with interval and MutationObserver for SPAs still rendering
  let attempts = 0;
  const maxAttempts = 50; // 50 * 250ms = 12.5 seconds
  let observer = null;

  const intervalId = setInterval(() => {
    attempts++;
    if (window.__acMiningPromptInjected || attempts >= maxAttempts) {
      clearInterval(intervalId);
      if (observer) observer.disconnect();
      return;
    }

    const el = findInputElement();
    if (el) {
      clearInterval(intervalId);
      if (observer) observer.disconnect();
      insertText(el, prompt);
    }
  }, 250);

  if (typeof MutationObserver !== "undefined") {
    observer = new MutationObserver(() => {
      if (window.__acMiningPromptInjected) {
        if (observer) observer.disconnect();
        clearInterval(intervalId);
        return;
      }
      const el = findInputElement();
      if (el) {
        if (observer) observer.disconnect();
        clearInterval(intervalId);
        insertText(el, prompt);
      }
    });

    const targetNode = document.body || document.documentElement;
    if (targetNode) {
      observer.observe(targetNode, { childList: true, subtree: true });
    }
  }
}

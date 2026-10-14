/**
 * Autocomplete Mining - Content Script
 * Handles real-time searchbar typing simulation and DOM autocomplete extraction
 * across Google, Etsy, and YouTube.
 */

(() => {
  // Prevent duplicate injection
  if (window.__AUTOCOMPLETE_MINING_INJECTED__) {
    return;
  }
  window.__AUTOCOMPLETE_MINING_INJECTED__ = true;

  console.log("[Autocomplete Mining] Content script loaded on:", window.location.hostname);

  /**
   * Detect current platform
   */
  function getPlatform() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes("google.")) return "google";
    if (host.includes("etsy.com")) return "etsy";
    if (host.includes("youtube.com")) return "youtube";
    return "unsupported";
  }

  /**
   * Selectors configuration for search input and autocomplete suggestions
   */
  const PLATFORM_CONFIG = {
    google: {
      inputSelectors: [
        'textarea[name="q"]',
        'input[name="q"]',
        'textarea.gLFyf',
        '[role="combobox"][name="q"]',
        'textarea[aria-label="Search"]',
        'input[aria-label="Search"]',
        'input[title="Search"]'
      ],
      suggestionSelectors: [
        '.wM6W7d',
        'div[role="option"] .wM6W7d',
        'ul.G43f7e li div[role="option"]',
        'div.sbct',
        '[role="listbox"] [role="option"]'
      ],
      ignoreTexts: [
        'delete', 'remove', 'report inappropriate predictions', 'see more', 'feedback'
      ]
    },
    youtube: {
      inputSelectors: [
        'input#search',
        'input.ytSearchboxComponentInput',
        'input[name="search_query"]',
        'yt-searchbox input',
        '#search-input input',
        'input[aria-label="Search"]'
      ],
      suggestionSelectors: [
        '.ytSearchboxComponentSuggestionsContainer .ytSearchboxComponentSuggestion',
        'ul.sbsb_b li.sbsb_c div.sbqs_c',
        'ul.sbsb_b li.sbsb_c',
        '[role="listbox"] [role="option"]',
        '.ytSearchboxComponentSuggestion'
      ],
      ignoreTexts: [
        'remove', 'delete', 'report search predictions'
      ]
    },
    etsy: {
      inputSelectors: [
        'input#global-enhancements-search-query',
        'input[name="search_query"]',
        'input[data-id="search-query"]',
        'header form input[type="text"]',
        'input[placeholder*="Search"]'
      ],
      suggestionSelectors: [
        'li[data-suggestion-type="keyword"]',
        '#global-enhancements-search-suggestions li[data-suggestion-type="keyword"]',
        '#search-suggestions li[data-suggestion-type="keyword"]',
        '#global-enhancements-search-suggestions ul:first-of-type li',
        '#search-suggestions ul:first-of-type li',
        '[data-ui="search-suggestions"] li',
        'ul[role="listbox"] li',
        '.wt-menu__item'
      ],
      ignoreTexts: [
        'top searches this week', 'top searches', 'popular right now', 'popular searches',
        'recent searches', 'clear recent searches', 'trending now', 'trending searches',
        'find shop names', 'find shop names containing', 'see all results', 'in this shop',
        'all categories'
      ]
    }
  };

  /**
   * Locate the search input on the current page
   */
  function findSearchInput(platform) {
    const config = PLATFORM_CONFIG[platform];
    if (!config) return null;

    for (const selector of config.inputSelectors) {
      const el = document.querySelector(selector);
      if (el && el.offsetParent !== null) { // Ensure visible
        return el;
      }
    }

    // Generic fallback: any text input in header/nav or named search
    return document.querySelector('header input[type="search"], header input[type="text"], input[name*="search" i], textarea[name*="search" i]');
  }

  /**
   * Set input value using native prototype setter so frameworks (React/Polymer/etc) recognize change
   */
  function setNativeValue(element, value) {
    const proto = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
  }

  /**
   * Simulate realistic typing into the searchbar
   */
  async function typeIntoSearchbar(input, query) {
    if (!input) return;

    // Bring input into focus and select
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Set value
    setNativeValue(input, query);

    const lastChar = query.slice(-1) || ' ';

    // Dispatch full input sequence
    try {
      input.dispatchEvent(new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: lastChar,
        bubbles: true,
        cancelable: true
      }));
    } catch (e) {
      // InputEvent might have constructor restrictions on older environments
    }

    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    // Keydown/keyup
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: lastChar,
      code: `Key${lastChar.toUpperCase()}`,
      bubbles: true,
      composed: true
    }));
    input.dispatchEvent(new KeyboardEvent('keyup', {
      key: lastChar,
      code: `Key${lastChar.toUpperCase()}`,
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Extract clean, full text from an element without SVGs, buttons, thumbnails, or screen-reader text
   */
  function getCleanElementText(el) {
    if (!el) return '';
    try {
      const clone = el.cloneNode(true);
      // Remove visual clutter, thumbnail images, icons, and hidden accessibility elements
      clone.querySelectorAll('svg, img, button, [aria-hidden="true"], .wt-screen-reader-only, .screen-reader-only, [style*="display: none"]').forEach(n => n.remove());
      const raw = clone.innerText || clone.textContent || '';
      return raw.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    } catch (e) {
      return (el.textContent || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  /**
   * Extract suggestion texts from DOM
   */
  function extractSuggestionsFromDOM(platform, query = '') {
    const config = PLATFORM_CONFIG[platform];
    if (!config) return [];

    const suggestions = new Set();
    const ignores = config.ignoreTexts || [];
    const queryLower = (query || '').toLowerCase().trim();
    // Words of length >= 3 from the query for relevance filtering
    const queryTokens = queryLower.split(/\s+/).filter(w => w.length >= 3);

    for (const selector of config.suggestionSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        elements.forEach((el) => {
          // On Etsy: skip items with images/thumbnails (these are trending product cards, not query autocomplete)
          if (platform === 'etsy' && el.querySelector('img, .wt-image, .wt-thumbnail')) {
            return;
          }

          // On Etsy: check data-suggestion-type attribute if present
          if (platform === 'etsy') {
            const type = el.getAttribute('data-suggestion-type');
            if (type && type !== 'keyword') {
              return; // Skip find_shops, popular, etc.
            }
          }

          // Extract complete text (concatenating all sibling spans/strong tags properly)
          const text = getCleanElementText(el);
          if (!text || text.length < 2) return;

          const lower = text.toLowerCase();

          // Check against ignore list
          const shouldIgnore = ignores.some(ig => lower === ig || lower.startsWith(ig) || lower.includes(`"${queryLower}"`));
          if (shouldIgnore) return;

          // Skip shop search action items
          if (lower.startsWith('find shop names') || lower.includes('find shop names containing')) {
            return;
          }

          // On Etsy: relevance check against query
          // If query has significant words, make sure the suggestion contains at least one or starts with query
          if (platform === 'etsy' && queryTokens.length > 0) {
            const matchesQuery = lower.startsWith(queryLower) || queryTokens.some(tok => lower.includes(tok));
            if (!matchesQuery) {
              return; // Discard unrelated trending searches like "christmas cards" or "halloween costume"
            }
          }

          suggestions.add(text);
        });

        if (suggestions.size > 0) {
          break; // Found suggestions with higher-priority selector
        }
      }
    }

    return Array.from(suggestions);
  }

  /**
   * In-page fetch fallback in case DOM dropdown is obstructed or slow
   */
  async function inPageFetchSuggestions(platform, query) {
    if (!query || !query.trim()) return [];
    const q = encodeURIComponent(query.trim());

    if (platform === "google") {
      try {
        const res = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${q}`);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && Array.isArray(json[1])) {
            return json[1].map(s => String(s).trim()).filter(Boolean);
          }
        }
      } catch (e) {}
    } else if (platform === "youtube") {
      try {
        const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${q}`);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && Array.isArray(json[1])) {
            return json[1].map(s => String(s).trim()).filter(Boolean);
          }
        }
      } catch (e) {}
    } else if (platform === "etsy") {
      try {
        // Use verified Etsy suggestions endpoint
        const res = await fetch(`/api/v3/ajax/public/search/suggestions?query=${q}`, {
          headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" }
        });
        if (res.ok) {
          const json = await res.json();
          const list = json.results || json.suggestions || [];
          return list.map(item => (typeof item === "string" ? item : item.query || item.display_name || "")).filter(Boolean);
        }
      } catch (e) {}
    }

    return [];
  }

  /**
   * Execute single query mining step
   */
  async function mineQueryStep(query, letter, delayMs = 600) {
    const platform = getPlatform();
    const input = findSearchInput(platform);

    if (input) {
      await typeIntoSearchbar(input, query);
    }

    // Wait for dropdown to render
    const waitTime = Math.max(350, delayMs);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Extract suggestions from DOM
    let results = extractSuggestionsFromDOM(platform, query);

    // If DOM yielded no results (e.g. background tab or obstructed dropdown), trigger in-page fetch fallback
    if (!results || results.length === 0) {
      const fallbackResults = await inPageFetchSuggestions(platform, query);
      if (fallbackResults && fallbackResults.length > 0) {
        results = fallbackResults;
      }
    }

    return {
      success: true,
      query,
      letter,
      platform,
      suggestions: results
    };
  }

  // Listen for messages from background / side panel
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "PING") {
      sendResponse({ pong: true, platform: getPlatform(), url: window.location.href });
      return true;
    }

    if (message.type === "MINE_QUERY_STEP") {
      mineQueryStep(message.query, message.letter, message.delayMs)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ success: false, error: err.message, query: message.query, letter: message.letter, suggestions: [] }));
      return true; // Keep message channel open for async response
    }

    if (message.type === "CLEAR_SEARCHBAR") {
      const platform = getPlatform();
      const input = findSearchInput(platform);
      if (input) {
        setNativeValue(input, "");
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      sendResponse({ success: true });
      return true;
    }
  });

})();

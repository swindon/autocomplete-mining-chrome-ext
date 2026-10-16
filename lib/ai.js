/**
 * Autocomplete Mining - AI Services & Niche Prompt Engine
 * Provides configuration, prompt generation, and URL creation for popular AI services.
 */

export const AI_SERVICES = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    provider: "OpenAI",
    icon: "🤖",
    baseUrl: "https://chatgpt.com/?q=",
    supportsQueryParam: true,
    maxUrlLength: 4000,
    hint: "Pre-fills prompt in ChatGPT chat input.",
    selectors: [
      "#prompt-textarea",
      "div#prompt-textarea",
      "div[contenteditable='true']",
      "textarea[data-id='root']",
      "textarea"
    ]
  },
  {
    id: "claude",
    name: "Claude",
    provider: "Anthropic",
    icon: "🎭",
    baseUrl: "https://claude.ai/new?q=",
    supportsQueryParam: true,
    maxUrlLength: 4000,
    hint: "Pre-loads prompt in a fresh Claude conversation.",
    selectors: [
      "div[contenteditable='true'].ProseMirror",
      "div.ProseMirror[contenteditable='true']",
      "div[contenteditable='true']",
      "fieldset div[contenteditable='true']"
    ]
  },
  {
    id: "gemini",
    name: "Google Gemini",
    provider: "Google",
    icon: "✨",
    baseUrl: "https://gemini.google.com/app",
    supportsQueryParam: false,
    maxUrlLength: 4000,
    hint: "Auto-pastes prompt into Gemini chat input (and copies to clipboard).",
    selectors: [
      "rich-textarea div[contenteditable='true']",
      "div.ql-editor[contenteditable='true']",
      "div[contenteditable='true']",
      "textarea[aria-label*='prompt' i]",
      "textarea"
    ]
  },
  {
    id: "perplexity",
    name: "Perplexity",
    provider: "Perplexity AI",
    icon: "🔍",
    baseUrl: "https://www.perplexity.ai/search?q=",
    supportsQueryParam: true,
    maxUrlLength: 3500,
    hint: "Searches & analyzes niche directly on Perplexity.",
    selectors: [
      "textarea[placeholder*='Ask' i]",
      "textarea",
      "div[contenteditable='true']"
    ]
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    provider: "DeepSeek",
    icon: "🐋",
    baseUrl: "https://chat.deepseek.com/?q=",
    supportsQueryParam: true,
    maxUrlLength: 4000,
    hint: "Pre-fills prompt in DeepSeek chat.",
    selectors: [
      "textarea#chat-input",
      "textarea[placeholder*='DeepSeek' i]",
      "textarea"
    ]
  },
  {
    id: "copilot",
    name: "Microsoft Copilot",
    provider: "Microsoft",
    icon: "💠",
    baseUrl: "https://copilot.microsoft.com/?q=",
    supportsQueryParam: true,
    maxUrlLength: 3500,
    hint: "Pre-fills prompt in Copilot chat.",
    selectors: [
      "textarea#userInput",
      "textarea[placeholder*='Ask' i]",
      "textarea",
      "div[contenteditable='true']"
    ]
  },
  {
    id: "grok",
    name: "Grok",
    provider: "xAI",
    icon: "⚡",
    baseUrl: "https://grok.com/?q=",
    supportsQueryParam: true,
    maxUrlLength: 3500,
    hint: "Pre-fills prompt in Grok chat.",
    selectors: [
      "textarea[placeholder*='Ask' i]",
      "textarea",
      "div[contenteditable='true']"
    ]
  }
];

export const AIServiceManager = {
  /**
   * Return list of available AI services
   */
  getServices() {
    return AI_SERVICES;
  },

  /**
   * Find service by ID
   * @param {string} serviceId
   * @returns {Object|null}
   */
  getService(serviceId) {
    return AI_SERVICES.find((s) => s.id === serviceId) || AI_SERVICES[0];
  },

  /**
   * Format platform-specific instructions for niche analysis
   * @param {string} platform
   * @returns {string}
   */
  getPlatformSpecificAdvice(platform = "google") {
    const p = String(platform).toLowerCase();
    if (p.includes("amazon")) {
      return [
        "- **Product & Merchandising Opportunities**: High-demand product variations, bundles, multipacks, and accessory pairings matching buyer search patterns.",
        "- **Amazon SEO & Listing Optimization**: Backend search terms (250 bytes), high-converting title structures, bullet point features, and A+ Content focus areas.",
        "- **PPC & Advertising Targets**: High-relevance exact match keywords, negative keyword candidates, and long-tail Sponsored Product targeting opportunities."
      ].join("\n");
    }

    if (p.includes("etsy")) {
      return [
        "- **Physical & Digital Product Angles**: What specific products, bundles, or variations (materials, styles, occasions) should be created to capture this demand?",
        "- **Listing Optimization**: High-converting listing title formulas, 13 search tags, and description hooks based on the extracted buyer queries.",
        "- **Gifting & Personalization**: Opportunities for customized/personalized items, seasonal angles, and target gift recipients."
      ].join("\n");
    }

    if (p.includes("youtube")) {
      return [
        "- **High-Performing Video Ideas**: Top 5-10 video topics, series concepts, or tutorial walkthroughs addressing exact viewer search queries.",
        "- **Click-Worthy Titles & Thumbnails**: High-CTR title variations and thumbnail visual concepts for these keywords.",
        "- **Audience Retention Hooks**: Core questions and pain points to answer in the first 30 seconds of the video."
      ].join("\n");
    }

    // Default to Google / Web SEO
    return [
      "- **Content Strategy & Topic Clusters**: Pillar article recommendations, supporting cluster articles, and internal linking structure.",
      "- **Search Intent Mapping**: Breakdown of informational vs. commercial vs. transactional search queries.",
      "- **SERP & Snippet Opportunities**: Specific questions to answer directly to target Featured Snippets and 'People Also Ask' boxes."
    ].join("\n");
  },

  /**
   * Generate comprehensive niche analysis prompt from mined data
   * @param {Object} data - Mined results data
   * @param {string} data.keyword - Seed keyword
   * @param {string} data.platform - Search platform (google, amazon, etsy, youtube)
   * @param {string[]} [data.allUnique] - All unique suggestions
   * @param {Object.<string, string[]>} [data.resultsByLetter] - Grouped suggestions by letter
   * @param {string} [data.mode] - 'suffix' or 'prefix'
   * @returns {string} Complete formatted AI prompt
   */
  generateNichePrompt(data = {}) {
    const {
      keyword = "",
      platform = "Search",
      allUnique = [],
      resultsByLetter = {},
      mode = "suffix"
    } = data;

    const platformDisplay = platform.charAt(0).toUpperCase() + platform.slice(1);
    const modeDisplay = mode === "prefix" ? "Prefix ([a-z] + Keyword)" : "Suffix (Keyword + [a-z])";
    const totalCount = allUnique.length;

    // Build structured suggestions breakdown
    let suggestionsSection = "";
    const letters = Object.keys(resultsByLetter).sort((a, b) => {
      if (a === "base") return -1;
      if (b === "base") return 1;
      return a.localeCompare(b);
    });

    const parts = [];
    if (letters.length > 0) {
      parts.push("#### Suggestions Grouped by Letter:");
      for (const letter of letters) {
        const items = resultsByLetter[letter] || [];
        if (items.length === 0) continue;
        const label = letter === "base" ? "Base" : letter.toUpperCase();
        parts.push(`[${label}]: ${items.join(", ")}`);
      }
      parts.push("");
    }

    if (allUnique.length > 0) {
      parts.push(`#### All Mined Terms (${allUnique.length} unique):`);
      parts.push(allUnique.map((item, idx) => `${idx + 1}. ${item}`).join("\n"));
    } else {
      parts.push("(No suggestions were recorded.)");
    }

    suggestionsSection = parts.join("\n");

    const platformGuidance = this.getPlatformSpecificAdvice(platform);

    return [
      `You are an expert market researcher, SEO strategist, e-commerce specialist, and niche analyst.`,
      ``,
      `I have systematically mined real-time autocomplete search suggestions for the seed keyword "${keyword}" on ${platformDisplay}.`,
      `Mining Details:`,
      `- Platform: ${platformDisplay}`,
      `- Seed Keyword: "${keyword}"`,
      `- Mining Mode: ${modeDisplay}`,
      `- Total Unique Suggestions: ${totalCount}`,
      ``,
      `### Extracted Search Autocomplete Data:`,
      `---`,
      suggestionsSection,
      `---`,
      ``,
      `Please conduct an exhaustive analysis of this niche based on these autocomplete findings and report back with a detailed Niche Intelligence Report covering:`,
      ``,
      `1. **Executive Summary & Niche Demand**:`,
      `   - What are real users actively searching for around "${keyword}"?`,
      `   - Current trends, user intent patterns, and overall niche viability.`,
      ``,
      `2. **Thematic Clusters & Sub-Niches**:`,
      `   - Group the suggestions into 4–6 clear thematic clusters (e.g. use-cases, materials/variations, audience types, pain points, pricing).`,
      `   - Describe the underlying intent for each cluster.`,
      ``,
      `3. **High-Value Long-Tail Opportunities**:`,
      `   - Which long-tail queries represent high-intent, low-hanging fruit with low competition?`,
      `   - Highlight any unexpected, surprising, or underserved micro-niches found in this data.`,
      ``,
      `4. **Actionable Platform Recommendations (${platformDisplay})**:`,
      platformGuidance,
      ``,
      `5. **Commercial & Monetization Potential**:`,
      `   - Where is the commercial / buyer intent highest in this dataset?`,
      `   - What are the most profitable monetization models for this niche (e.g. products, affiliate, content, courses, services)?`,
      ``,
      `6. **Prioritized Action Plan**:`,
      `   - Top 5 immediate steps to capture traffic, rank, or launch winning offerings in this niche.`,
      ``,
      `Please format your analysis with clear headings, bullet points, and actionable takeaways.`
    ].join("\n");
  },

  buildServicePayload(serviceId, data = {}) {
    const service = this.getService(serviceId);
    const fullPrompt = this.generateNichePrompt(data);

    if (!service.supportsQueryParam) {
      return {
        url: service.baseUrl,
        fullPrompt,
        service,
        isTruncatedUrl: false,
        needsInjection: true
      };
    }

    // Attempt encoding full prompt
    const encodedFull = encodeURIComponent(fullPrompt);
    const fullUrl = `${service.baseUrl}${encodedFull}`;
    const maxSafeUrlLength = service.maxUrlLength || 8000;

    if (fullUrl.length <= maxSafeUrlLength) {
      return {
        url: fullUrl,
        fullPrompt,
        service,
        isTruncatedUrl: false,
        needsInjection: false
      };
    }

    // If full URL exceeds safe limit, fallback to clean base URL
    // without query param, and rely on direct chat input injection & clipboard paste
    const cleanUrl = service.baseUrl.replace(/\?q=$/, "").replace(/\?.*$/, "");
    
    return {
      url: cleanUrl || service.baseUrl,
      fullPrompt,
      service,
      isTruncatedUrl: true,
      needsInjection: true
    };
  }
};

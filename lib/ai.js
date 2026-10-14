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
    hint: "Pre-fills prompt in ChatGPT chat input."
  },
  {
    id: "claude",
    name: "Claude",
    provider: "Anthropic",
    icon: "🎭",
    baseUrl: "https://claude.ai/new?q=",
    supportsQueryParam: true,
    maxUrlLength: 4000,
    hint: "Pre-loads prompt in a fresh Claude conversation."
  },
  {
    id: "gemini",
    name: "Google Gemini",
    provider: "Google",
    icon: "✨",
    baseUrl: "https://gemini.google.com/app",
    supportsQueryParam: false,
    maxUrlLength: 4000,
    hint: "Full prompt copied to clipboard — press Cmd+V (Ctrl+V) in Gemini."
  },
  {
    id: "perplexity",
    name: "Perplexity",
    provider: "Perplexity AI",
    icon: "🔍",
    baseUrl: "https://www.perplexity.ai/search?q=",
    supportsQueryParam: true,
    maxUrlLength: 3500,
    hint: "Searches & analyzes niche directly on Perplexity."
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    provider: "DeepSeek",
    icon: "🐋",
    baseUrl: "https://chat.deepseek.com/?q=",
    supportsQueryParam: true,
    maxUrlLength: 4000,
    hint: "Pre-fills prompt in DeepSeek chat."
  },
  {
    id: "copilot",
    name: "Microsoft Copilot",
    provider: "Microsoft",
    icon: "💠",
    baseUrl: "https://copilot.microsoft.com/?q=",
    supportsQueryParam: true,
    maxUrlLength: 3500,
    hint: "Pre-fills prompt in Copilot chat."
  },
  {
    id: "grok",
    name: "Grok",
    provider: "xAI",
    icon: "⚡",
    baseUrl: "https://grok.com/?q=",
    supportsQueryParam: true,
    maxUrlLength: 3500,
    hint: "Pre-fills prompt in Grok chat."
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
   * @param {string} data.platform - Search platform (google, etsy, youtube)
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

  /**
   * Build a concise prompt version suitable for URL query parameter when full prompt exceeds URL safety limits
   * @param {Object} data
   * @param {number} [maxChars=1500]
   * @returns {string}
   */
  generateConcisePrompt(data = {}, maxChars = 1500) {
    const {
      keyword = "",
      platform = "Search",
      allUnique = []
    } = data;

    const platformDisplay = platform.charAt(0).toUpperCase() + platform.slice(1);
    const header = `Analyze these autocomplete search suggestions mined from ${platformDisplay} for the seed keyword "${keyword}" (${allUnique.length} total unique terms).\n\nSample suggestions: `;
    const footer = `\n\n(Note: Full dataset of all ${allUnique.length} terms & detailed prompt is on clipboard - press Cmd+V / Ctrl+V to paste).\n\nPlease report back on this niche:\n1. Search intent & main thematic sub-niches.\n2. High-opportunity, low-competition long-tail angles.\n3. Content, video, or product recommendations for ${platformDisplay}.\n4. Commercial viability & monetization roadmap.\n5. Prioritized action plan.`;

    let sampleTerms = [];
    let currentLength = encodeURIComponent(header + footer).length;

    for (const term of allUnique) {
      const addition = sampleTerms.length === 0 ? term : `, ${term}`;
      const encodedAdditionLength = encodeURIComponent(addition).length;
      if (currentLength + encodedAdditionLength > maxChars) {
        break;
      }
      sampleTerms.push(term);
      currentLength += encodedAdditionLength;
    }

    const sampleText = sampleTerms.join(", ");
    const remainingCount = allUnique.length - sampleTerms.length;
    const remainder = remainingCount > 0 ? ` (and ${remainingCount} more)` : "";

    return `${header}${sampleText}${remainder}${footer}`;
  },

  /**
   * Build target URL to launch new chat with prefilled prompt
   * @param {string} serviceId
   * @param {Object} data - Mined data
   * @returns {{ url: string, fullPrompt: string, service: Object, isTruncatedUrl: boolean }}
   */
  buildServicePayload(serviceId, data = {}) {
    const service = this.getService(serviceId);
    const fullPrompt = this.generateNichePrompt(data);

    if (!service.supportsQueryParam) {
      return {
        url: service.baseUrl,
        fullPrompt,
        service,
        isTruncatedUrl: false
      };
    }

    // Attempt encoding full prompt
    const encodedFull = encodeURIComponent(fullPrompt);
    const fullUrl = `${service.baseUrl}${encodedFull}`;

    if (fullUrl.length <= service.maxUrlLength) {
      return {
        url: fullUrl,
        fullPrompt,
        service,
        isTruncatedUrl: false
      };
    }

    // If full URL exceeds safe limit, generate safe concise prompt strictly budgeted
    // for the service's maxUrlLength minus baseUrl length
    const allowedEncodedChars = Math.max(500, service.maxUrlLength - service.baseUrl.length - 20);
    const concisePrompt = this.generateConcisePrompt(data, allowedEncodedChars);
    const safeUrl = `${service.baseUrl}${encodeURIComponent(concisePrompt)}`;

    return {
      url: safeUrl,
      fullPrompt,
      service,
      isTruncatedUrl: true
    };
  }
};

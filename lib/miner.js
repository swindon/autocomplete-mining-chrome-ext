/**
 * Autocomplete Mining - Miner Engine
 * Orchestrates step-by-step alphabet mining across search bar and background API.
 */

export class MinerEngine {
  constructor(options = {}) {
    this.keyword = (options.keyword || "").trim();
    this.platform = options.platform || "google";
    this.tabId = options.tabId || null;
    this.delayMs = options.delayMs || 600;
    this.mode = options.mode || "suffix"; // 'suffix' (keyword + letter) or 'prefix' (letter + keyword)
    this.includeNumbers = Boolean(options.includeNumbers);
    this.method = options.method || "dom"; // 'dom', 'api', or 'hybrid'

    // Callbacks
    this.onStart = options.onStart || (() => {});
    this.onStepStart = options.onStepStart || (() => {});
    this.onStepComplete = options.onStepComplete || (() => {});
    this.onProgress = options.onProgress || (() => {});
    this.onPause = options.onPause || (() => {});
    this.onResume = options.onResume || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onStop = options.onStop || (() => {});
    this.onError = options.onError || (() => {});

    // State
    this.status = "idle"; // 'idle' | 'running' | 'paused' | 'stopped' | 'completed'
    this.steps = [];
    this.currentStepIndex = 0;
    this.resultsByLetter = {};
    this.allUniqueSuggestions = new Set();
    this.pausePromiseResolve = null;
  }

  /**
   * Build the array of queries to execute
   */
  buildSteps() {
    const letters = "abcdefghijklmnopqrstuvwxyz".split("");
    if (this.includeNumbers) {
      letters.push(..."0123456789".split(""));
    }

    const steps = [];

    // Step 0: Base keyword alone
    steps.push({
      letter: "base",
      query: this.keyword
    });

    // Step 1..N: Each letter of the alphabet
    for (const char of letters) {
      let queryText = "";
      if (this.mode === "prefix") {
        queryText = `${char} ${this.keyword}`;
      } else {
        queryText = `${this.keyword} ${char}`;
      }

      steps.push({
        letter: char,
        query: queryText
      });
    }

    return steps;
  }

  /**
   * Start mining execution
   */
  async start() {
    if (!this.keyword) {
      this.onError(new Error("Keyword is required to begin mining."));
      return;
    }

    this.steps = this.buildSteps();
    this.currentStepIndex = 0;
    this.resultsByLetter = {};
    this.allUniqueSuggestions.clear();
    this.status = "running";

    this.onStart({
      totalSteps: this.steps.length,
      steps: this.steps,
      platform: this.platform,
      keyword: this.keyword
    });

    try {
      while (this.currentStepIndex < this.steps.length) {
        if (this.status === "stopped") {
          break;
        }

        if (this.status === "paused") {
          await new Promise(resolve => {
            this.pausePromiseResolve = resolve;
          });
          if (this.status === "stopped") break;
        }

        const step = this.steps[this.currentStepIndex];
        this.onStepStart({
          stepIndex: this.currentStepIndex,
          totalSteps: this.steps.length,
          letter: step.letter,
          query: step.query
        });

        // Execute step
        const suggestions = await this.executeStep(step);

        // Store results
        this.resultsByLetter[step.letter] = suggestions;
        const prevCount = this.allUniqueSuggestions.size;
        suggestions.forEach(s => this.allUniqueSuggestions.add(s));
        const newItemsAdded = this.allUniqueSuggestions.size - prevCount;

        const progressPercent = Math.round(((this.currentStepIndex + 1) / this.steps.length) * 100);
        this.onProgress(progressPercent);

        this.onStepComplete({
          stepIndex: this.currentStepIndex,
          totalSteps: this.steps.length,
          letter: step.letter,
          query: step.query,
          suggestions,
          newItemsAdded,
          totalUnique: this.allUniqueSuggestions.size
        });

        this.currentStepIndex++;

        // Delay between steps
        if (this.currentStepIndex < this.steps.length && this.status === "running") {
          await new Promise(r => setTimeout(r, this.delayMs));
        }
      }

      if (this.status === "running") {
        this.status = "completed";
        this.onComplete({
          keyword: this.keyword,
          platform: this.platform,
          totalUnique: this.allUniqueSuggestions.size,
          resultsByLetter: this.resultsByLetter,
          allUnique: Array.from(this.allUniqueSuggestions)
        });
      }
    } catch (err) {
      this.status = "error";
      this.onError(err);
    }
  }

  /**
   * Pause the mining process
   */
  pause() {
    if (this.status === "running") {
      this.status = "paused";
      this.onPause();
    }
  }

  /**
   * Resume paused mining
   */
  resume() {
    if (this.status === "paused") {
      this.status = "running";
      this.onResume();
      if (this.pausePromiseResolve) {
        this.pausePromiseResolve();
        this.pausePromiseResolve = null;
      }
    }
  }

  /**
   * Stop mining
   */
  stop() {
    this.status = "stopped";
    if (this.pausePromiseResolve) {
      this.pausePromiseResolve();
      this.pausePromiseResolve = null;
    }
    this.onStop({
      keyword: this.keyword,
      platform: this.platform,
      totalUnique: this.allUniqueSuggestions.size,
      resultsByLetter: this.resultsByLetter,
      allUnique: Array.from(this.allUniqueSuggestions),
      completedSteps: this.currentStepIndex,
      totalSteps: this.steps.length
    });
  }

  /**
   * Execute single step via Content Script (DOM) or Background fetch
   */
  async executeStep(step) {
    if (this.method === "api" || !this.tabId) {
      return this.fetchViaAPI(step.query);
    }

    // Try DOM execution via content script
    try {
      const response = await this.sendContentMessage(this.tabId, {
        type: "MINE_QUERY_STEP",
        query: step.query,
        letter: step.letter,
        delayMs: this.delayMs
      });

      if (response && response.success && Array.isArray(response.suggestions)) {
        // If DOM found suggestions, return them
        if (response.suggestions.length > 0) {
          return response.suggestions;
        }
      }

      // If DOM returned empty and hybrid mode is enabled, fetch via background API
      if (this.method === "hybrid" || (response && response.suggestions && response.suggestions.length === 0)) {
        return await this.fetchViaAPI(step.query);
      }

      return response?.suggestions || [];
    } catch (err) {
      console.warn(`[MinerEngine] Content script error on step '${step.query}':`, err);
      // Fallback to API
      return await this.fetchViaAPI(step.query);
    }
  }

  /**
   * Send message to tab with timeout
   */
  sendContentMessage(tabId, message, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error("Timeout communicating with page"));
        }
      }, timeoutMs);

      chrome.tabs.sendMessage(tabId, message, (res) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(res);
        }
      });
    });
  }

  /**
   * Fetch suggestions directly via background worker
   */
  fetchViaAPI(query) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: "FETCH_DIRECT_SUGGESTIONS",
        platform: this.platform,
        query
      }, (res) => {
        if (chrome.runtime.lastError || !res || !res.success) {
          resolve([]);
        } else {
          resolve(res.suggestions || []);
        }
      });
    });
  }
}

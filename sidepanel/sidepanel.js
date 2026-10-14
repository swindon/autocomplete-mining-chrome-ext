/**
 * Autocomplete Mining - Side Panel Script
 */

import { MinerEngine } from "../lib/miner.js";
import { MarkdownExporter } from "../lib/markdown.js";
import { AI_SERVICES, AIServiceManager } from "../lib/ai.js";

// DOM Elements
const platformBadge = document.getElementById("platform-badge");
const platformName = document.getElementById("platform-name");
const helperBanner = document.getElementById("platform-helper-banner");

const keywordInput = document.getElementById("keyword-input");
const btnClearKeyword = document.getElementById("btn-clear-keyword");
const miningModeSelect = document.getElementById("mining-mode");
const miningMethodSelect = document.getElementById("mining-method");
const delaySlider = document.getElementById("delay-slider");
const delayValText = document.getElementById("delay-val");
const checkNumbers = document.getElementById("check-numbers");
const checkClearSearchbar = document.getElementById("check-clear-searchbar");

const btnMine = document.getElementById("btn-mine");
const btnMineText = document.getElementById("btn-mine-text");
const runningControls = document.getElementById("running-controls");
const btnPause = document.getElementById("btn-pause");
const btnPauseText = document.getElementById("btn-pause-text");
const btnStop = document.getElementById("btn-stop");

const progressSection = document.getElementById("progress-section");
const progressStatusText = document.getElementById("progress-status-text");
const progressPercentText = document.getElementById("progress-percent-text");
const progressBar = document.getElementById("progress-bar");
const statUniqueCount = document.getElementById("stat-unique-count");
const statStepCount = document.getElementById("stat-step-count");
const statCurrentQuery = document.getElementById("stat-current-query");
const alphabetGrid = document.getElementById("alphabet-grid");

const resultsSection = document.getElementById("results-section");
const resultsBadge = document.getElementById("results-badge");
const resultsFilter = document.getElementById("results-filter");
const tabBtns = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

// AI Intelligence Elements
const btnAnalyseAi = document.getElementById("btn-analyse-ai");
const btnAnalyseAiLabel = document.getElementById("btn-analyse-ai-label");
const btnAiMenuToggle = document.getElementById("btn-ai-menu-toggle");
const aiServiceSelect = document.getElementById("ai-service-select");
const aiServicesDropdown = document.getElementById("ai-services-dropdown");
const aiDropdownList = document.getElementById("ai-dropdown-list");
const btnCopyAiPrompt = document.getElementById("btn-copy-ai-prompt");

const markdownOutput = document.getElementById("markdown-output");
const groupedContainer = document.getElementById("grouped-container");
const plainListContainer = document.getElementById("plain-list-container");

const btnCopyMarkdown = document.getElementById("btn-copy-markdown");
const btnDownloadMd = document.getElementById("btn-download-md");
const btnCopyPlain = document.getElementById("btn-copy-plain");
const btnDownloadCsv = document.getElementById("btn-download-csv");

const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toast-message");

// State
let currentTab = null;
let currentPlatform = "unsupported";
let currentMiner = null;
let lastMinedData = null;
let lastGeneratedMarkdown = "";
let selectedAiService = "chatgpt";

/**
 * Initialize application
 */
async function init() {
  renderAiServicesMenu();
  setupEventListeners();
  loadSavedSettings();
  await refreshActiveTab();
}

/**
 * Set up UI Event Listeners
 */
function setupEventListeners() {
  // Input clear button
  keywordInput.addEventListener("input", () => {
    btnClearKeyword.classList.toggle("hidden", !keywordInput.value);
  });

  btnClearKeyword.addEventListener("click", () => {
    keywordInput.value = "";
    btnClearKeyword.classList.add("hidden");
    keywordInput.focus();
  });

  keywordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !btnMine.disabled) {
      startMining();
    }
  });

  // Delay slider
  delaySlider.addEventListener("input", () => {
    delayValText.textContent = `${delaySlider.value}ms`;
    saveSettings();
  });

  miningModeSelect.addEventListener("change", saveSettings);
  miningMethodSelect.addEventListener("change", saveSettings);
  checkNumbers.addEventListener("change", saveSettings);
  checkClearSearchbar.addEventListener("change", saveSettings);

  // Quick nav buttons in helper banner
  document.querySelectorAll(".btn-quick-nav").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const url = btn.dataset.url;
      if (currentTab?.id && url) {
        chrome.runtime.sendMessage({
          type: "NAVIGATE_TAB",
          tabId: currentTab.id,
          url
        });
      }
    });
  });

  // Mining action buttons
  btnMine.addEventListener("click", startMining);

  btnPause.addEventListener("click", () => {
    if (!currentMiner) return;
    if (currentMiner.status === "running") {
      currentMiner.pause();
      btnPauseText.textContent = "Resume";
      progressStatusText.textContent = "Mining paused...";
    } else if (currentMiner.status === "paused") {
      currentMiner.resume();
      btnPauseText.textContent = "Pause";
      progressStatusText.textContent = "Resuming mining...";
    }
  });

  btnStop.addEventListener("click", () => {
    if (currentMiner) {
      currentMiner.stop();
    }
  });

  // Results Tab Navigation
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;
      tabBtns.forEach((b) => b.classList.toggle("active", b === btn));
      tabPanels.forEach((panel) => {
        panel.classList.toggle("active", panel.id === `tab-content-${targetTab}`);
      });
    });
  });

  // Real-time results filter
  resultsFilter.addEventListener("input", filterResultsView);

  // AI Intelligence Actions
  btnAnalyseAi.addEventListener("click", () => {
    launchAiAnalysis(selectedAiService);
  });

  btnAiMenuToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleAiMenu();
  });

  aiServiceSelect.addEventListener("change", () => {
    selectAiService(aiServiceSelect.value);
  });

  btnCopyAiPrompt.addEventListener("click", copyAiPromptToClipboard);

  // Close AI dropdown on outside click
  document.addEventListener("click", (e) => {
    if (aiServicesDropdown && !aiServicesDropdown.contains(e.target) && !btnAiMenuToggle.contains(e.target)) {
      toggleAiMenu(false);
    }
  });

  // Export buttons
  btnCopyMarkdown.addEventListener("click", copyMarkdownToClipboard);
  btnCopyPlain.addEventListener("click", copyPlainKeywordsToClipboard);
  btnDownloadMd.addEventListener("click", downloadMarkdownFile);
  btnDownloadCsv.addEventListener("click", downloadCsvFile);

  // Listen for background notifications (e.g. tab switches)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "TAB_CHANGED") {
      updatePlatformUI(message.platform, message.url);
      currentTab = { id: message.tabId, url: message.url, title: message.title };
    }
  });
}

/**
 * Fetch and update active tab information
 */
async function refreshActiveTab() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_ACTIVE_PLATFORM" }, (res) => {
      if (res) {
        currentTab = { id: res.tabId, url: res.url, title: res.title };
        updatePlatformUI(res.platform, res.url);
      }
      resolve();
    });
  });
}

/**
 * Update UI platform badge and banner based on detected site
 */
function updatePlatformUI(platform, url) {
  currentPlatform = platform || "unsupported";

  platformBadge.className = "platform-badge";
  helperBanner.classList.add("hidden");

  if (currentPlatform === "google") {
    platformBadge.classList.add("platform-google");
    platformName.textContent = "Google";
    platformBadge.title = `Active on Google (${url || ""})`;
  } else if (currentPlatform === "etsy") {
    platformBadge.classList.add("platform-etsy");
    platformName.textContent = "Etsy";
    platformBadge.title = `Active on Etsy (${url || ""})`;
  } else if (currentPlatform === "youtube") {
    platformBadge.classList.add("platform-youtube");
    platformName.textContent = "YouTube";
    platformBadge.title = `Active on YouTube (${url || ""})`;
  } else {
    platformBadge.classList.add("platform-unknown");
    platformName.textContent = "Other Site";
    platformBadge.title = "Current page is not Google, Etsy, or YouTube";
    helperBanner.classList.remove("hidden");
  }
}

/**
 * Ensure content script is ready in active tab
 */
async function ensureContentScriptReady(tabId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "ENSURE_CONTENT_SCRIPT", tabId }, (res) => {
      resolve(res?.success || false);
    });
  });
}

/**
 * Render alphabet chips grid
 */
function renderAlphabetGrid(steps) {
  alphabetGrid.innerHTML = "";
  steps.forEach((step) => {
    const chip = document.createElement("div");
    chip.className = `chip pending ${step.letter === "base" ? "chip-base" : ""}`;
    chip.id = `chip-${step.letter}`;
    chip.dataset.letter = step.letter;

    const label = step.letter === "base" ? "Base" : step.letter;
    chip.innerHTML = `<span>${label}</span><span class="chip-count"></span>`;
    alphabetGrid.appendChild(chip);
  });
}

/**
 * Update a specific chip's appearance
 */
function updateChipStatus(letter, status, count = 0) {
  const chip = document.getElementById(`chip-${letter}`);
  if (!chip) return;

  chip.classList.remove("pending", "active", "done", "has-items");
  chip.classList.add(status);

  if (status === "done" && count > 0) {
    chip.classList.add("has-items");
    const countSpan = chip.querySelector(".chip-count");
    if (countSpan) countSpan.textContent = count;
  }
}

/**
 * Start the mining process
 */
async function startMining() {
  const keyword = keywordInput.value.trim();
  if (!keyword) {
    showToast("Please enter a keyword or phrase.", "warning");
    keywordInput.focus();
    return;
  }

  // Refresh tab status
  await refreshActiveTab();

  const method = miningMethodSelect.value;
  let targetPlatform = currentPlatform;

  // If user is not on a supported platform, but method is not direct API, ask or auto-switch to direct fetch
  if (targetPlatform === "unsupported") {
    if (method === "dom") {
      showToast("Navigate to Google, Etsy, or YouTube to use searchbar mining.", "warning");
      helperBanner.classList.remove("hidden");
      return;
    }
    // Default to Google for direct API when outside supported sites
    targetPlatform = "google";
  }

  // Prepare UI
  setMiningRunningUI(true);
  progressSection.classList.remove("hidden");
  resultsSection.classList.add("hidden");

  // Ensure content script injected if using DOM
  if (currentTab?.id && targetPlatform !== "unsupported" && method !== "api") {
    await ensureContentScriptReady(currentTab.id);
  }

  const delayMs = parseInt(delaySlider.value, 10) || 600;
  const mode = miningModeSelect.value;
  const includeNumbers = checkNumbers.checked;

  // Instantiate Miner Engine
  currentMiner = new MinerEngine({
    keyword,
    platform: targetPlatform,
    tabId: currentTab?.id,
    delayMs,
    mode,
    includeNumbers,
    method,

    onStart: (info) => {
      renderAlphabetGrid(info.steps);
      progressBar.style.width = "0%";
      progressPercentText.textContent = "0%";
      statUniqueCount.textContent = "0";
      statStepCount.textContent = `0 / ${info.totalSteps}`;
      statCurrentQuery.textContent = keyword;
      progressStatusText.textContent = `Starting mining on ${info.platform}...`;
    },

    onStepStart: (step) => {
      updateChipStatus(step.letter, "active");
      statCurrentQuery.textContent = step.query;
      progressStatusText.textContent = `Mining "${step.query}" (${step.stepIndex + 1}/${step.totalSteps})...`;
    },

    onStepComplete: (step) => {
      updateChipStatus(step.letter, "done", step.suggestions.length);
      statUniqueCount.textContent = step.totalUnique;
      statStepCount.textContent = `${step.stepIndex + 1} / ${step.totalSteps}`;
    },

    onProgress: (percent) => {
      progressBar.style.width = `${percent}%`;
      progressPercentText.textContent = `${percent}%`;
    },

    onComplete: (summary) => {
      setMiningRunningUI(false);
      progressStatusText.textContent = `Completed! Mined ${summary.totalUnique} unique suggestions.`;
      progressBar.style.width = "100%";
      progressPercentText.textContent = "100%";
      displayResults(summary, mode);

      if (checkClearSearchbar.checked && currentTab?.id) {
        chrome.tabs.sendMessage(currentTab.id, { type: "CLEAR_SEARCHBAR" }).catch(() => {});
      }
      showToast(`Mined ${summary.totalUnique} suggestions!`);
    },

    onStop: (summary) => {
      setMiningRunningUI(false);
      progressStatusText.textContent = `Mining stopped at step ${summary.completedSteps}/${summary.totalSteps}.`;
      displayResults(summary, mode);
      showToast("Mining stopped by user.");
    },

    onError: (err) => {
      setMiningRunningUI(false);
      progressStatusText.textContent = `Error: ${err.message}`;
      showToast(`Error: ${err.message}`, "error");
    }
  });

  currentMiner.start();
}

/**
 * Toggle UI state between Idle and Running
 */
function setMiningRunningUI(isRunning) {
  btnMine.classList.toggle("hidden", isRunning);
  runningControls.classList.toggle("hidden", !isRunning);
  keywordInput.disabled = isRunning;
  miningModeSelect.disabled = isRunning;
  miningMethodSelect.disabled = isRunning;
  checkNumbers.disabled = isRunning;
  delaySlider.disabled = isRunning;
  btnPauseText.textContent = "Pause";
}

/**
 * Render results in all views (Markdown, Grouped, Plain List)
 */
function displayResults(data, mode) {
  lastMinedData = data;
  resultsSection.classList.remove("hidden");
  resultsBadge.textContent = `${data.allUnique.length} unique terms`;

  // 1. Generate and display Markdown
  lastGeneratedMarkdown = MarkdownExporter.generateMarkdown({
    keyword: data.keyword,
    platform: data.platform,
    resultsByLetter: data.resultsByLetter,
    allUnique: data.allUnique,
    mode
  });
  markdownOutput.textContent = lastGeneratedMarkdown;

  // 2. Render Grouped View
  renderGroupedView(data.resultsByLetter);

  // 3. Render Plain List View
  renderPlainListView(data.allUnique);

  // 4. Update AI action button label for active service
  const activeService = AIServiceManager.getService(selectedAiService);
  if (btnAnalyseAiLabel) {
    btnAnalyseAiLabel.textContent = `Analyse with ${activeService.name}`;
  }

  // Auto-scroll to results
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Render grouped cards by letter
 */
function renderGroupedView(resultsByLetter, filterQuery = "") {
  groupedContainer.innerHTML = "";
  const query = filterQuery.toLowerCase().trim();

  const sortedLetters = Object.keys(resultsByLetter).sort((a, b) => {
    if (a === "base") return -1;
    if (b === "base") return 1;
    return a.localeCompare(b);
  });

  let totalVisible = 0;

  for (const letter of sortedLetters) {
    let items = resultsByLetter[letter] || [];
    if (query) {
      items = items.filter(item => item.toLowerCase().includes(query));
    }

    if (items.length === 0 && query) continue;

    totalVisible += items.length;
    const card = document.createElement("div");
    card.className = "grouped-letter-card";

    const label = letter === "base" ? "Base Query" : letter.toUpperCase();
    card.innerHTML = `
      <div class="grouped-letter-header">
        <span>${label}</span>
        <span class="grouped-letter-count">${items.length} suggestions</span>
      </div>
      <ul class="grouped-items-list">
        ${items.map(it => `<li class="grouped-item">${escapeHtml(it)}</li>`).join("")}
      </ul>
    `;
    groupedContainer.appendChild(card);
  }

  if (totalVisible === 0) {
    groupedContainer.innerHTML = `<p style="padding: 12px; color: var(--text-dim); text-align: center;">No matching suggestions found.</p>`;
  }
}

/**
 * Render plain list view
 */
function renderPlainListView(allUnique, filterQuery = "") {
  plainListContainer.innerHTML = "";
  const query = filterQuery.toLowerCase().trim();

  let list = [...allUnique].sort((a, b) => a.localeCompare(b));
  if (query) {
    list = list.filter(item => item.toLowerCase().includes(query));
  }

  if (list.length === 0) {
    plainListContainer.innerHTML = `<li style="list-style:none; color: var(--text-dim); text-align: center;">No matching suggestions.</li>`;
    return;
  }

  for (const item of list) {
    const li = document.createElement("li");
    li.textContent = item;
    plainListContainer.appendChild(li);
  }
}

/**
 * Filter suggestions across tabs
 */
function filterResultsView() {
  const query = resultsFilter.value;
  if (!lastMinedData) return;
  renderGroupedView(lastMinedData.resultsByLetter, query);
  renderPlainListView(lastMinedData.allUnique, query);
}

/**
 * Copy formatted Markdown to clipboard
 */
async function copyMarkdownToClipboard() {
  if (!lastGeneratedMarkdown) {
    showToast("No markdown content to copy.", "warning");
    return;
  }

  try {
    await navigator.clipboard.writeText(lastGeneratedMarkdown);
    showToast("✓ Markdown copied to clipboard!");
  } catch (err) {
    // Fallback
    const textarea = document.createElement("textarea");
    textarea.value = lastGeneratedMarkdown;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    showToast("✓ Markdown copied to clipboard!");
  }
}

/**
 * Copy plain keywords list to clipboard
 */
async function copyPlainKeywordsToClipboard() {
  if (!lastMinedData || !lastMinedData.allUnique) {
    showToast("No keywords to copy.", "warning");
    return;
  }

  const plainText = MarkdownExporter.generatePlainText(lastMinedData.allUnique);
  try {
    await navigator.clipboard.writeText(plainText);
    showToast(`✓ Copied ${lastMinedData.allUnique.length} keywords!`);
  } catch (err) {
    showToast("Failed to copy keywords.", "error");
  }
}

/**
 * Trigger download of Markdown file
 */
function downloadMarkdownFile() {
  if (!lastGeneratedMarkdown || !lastMinedData) {
    showToast("No markdown to download.", "warning");
    return;
  }

  const sanitizedKeyword = (lastMinedData.keyword || "keywords").replace(/[^a-z0-9_-]/gi, "_");
  const filename = `autocomplete_${lastMinedData.platform}_${sanitizedKeyword}.md`;
  downloadBlob(lastGeneratedMarkdown, filename, "text/markdown;charset=utf-8");
  showToast(`Downloaded ${filename}`);
}

/**
 * Trigger download of CSV file
 */
function downloadCsvFile() {
  if (!lastMinedData) {
    showToast("No data to export.", "warning");
    return;
  }

  const csv = MarkdownExporter.generateCSV({
    keyword: lastMinedData.keyword,
    platform: lastMinedData.platform,
    resultsByLetter: lastMinedData.resultsByLetter,
    allUnique: lastMinedData.allUnique
  });

  const sanitizedKeyword = (lastMinedData.keyword || "keywords").replace(/[^a-z0-9_-]/gi, "_");
  const filename = `autocomplete_${lastMinedData.platform}_${sanitizedKeyword}.csv`;
  downloadBlob(csv, filename, "text/csv;charset=utf-8");
  showToast(`Downloaded ${filename}`);
}

/**
 * Helper to download content as a file
 */
function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Render the dropdown list of available AI services
 */
function renderAiServicesMenu() {
  if (!aiDropdownList) return;
  aiDropdownList.innerHTML = "";
  AI_SERVICES.forEach((service) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `ai-service-option-item ${service.id === selectedAiService ? "selected" : ""}`;
    item.dataset.service = service.id;
    item.innerHTML = `
      <div class="ai-service-item-main">
        <span class="ai-service-item-icon">${service.icon}</span>
        <span>${escapeHtml(service.name)}</span>
      </div>
      <span class="ai-service-item-provider">${escapeHtml(service.provider)}</span>
    `;
    item.addEventListener("click", () => {
      selectAiService(service.id);
      toggleAiMenu(false);
      launchAiAnalysis(service.id);
    });
    aiDropdownList.appendChild(item);
  });
}

/**
 * Select active AI service
 */
function selectAiService(serviceId) {
  selectedAiService = serviceId || "chatgpt";
  const service = AIServiceManager.getService(selectedAiService);

  if (aiServiceSelect && aiServiceSelect.value !== selectedAiService) {
    aiServiceSelect.value = selectedAiService;
  }

  if (btnAnalyseAiLabel) {
    btnAnalyseAiLabel.textContent = `Analyse with ${service.name}`;
  }

  if (aiDropdownList) {
    aiDropdownList.querySelectorAll(".ai-service-option-item").forEach((el) => {
      el.classList.toggle("selected", el.dataset.service === selectedAiService);
    });
  }

  saveSettings();
}

/**
 * Toggle visibility of AI services dropdown menu
 */
function toggleAiMenu(show) {
  if (!aiServicesDropdown) return;
  const isHidden = aiServicesDropdown.classList.contains("hidden");
  const willShow = typeof show === "boolean" ? show : isHidden;
  aiServicesDropdown.classList.toggle("hidden", !willShow);
  if (btnAiMenuToggle) {
    btnAiMenuToggle.setAttribute("aria-expanded", String(willShow));
  }
}

/**
 * Launch AI service in a new chat tab with prefilled prompt & clipboard fallback
 */
async function launchAiAnalysis(serviceId) {
  if (!lastMinedData || !lastMinedData.keyword) {
    showToast("Please mine keywords first to analyze.", "warning");
    return;
  }

  const targetId = serviceId || selectedAiService || "chatgpt";
  const payload = AIServiceManager.buildServicePayload(targetId, {
    keyword: lastMinedData.keyword,
    platform: lastMinedData.platform,
    resultsByLetter: lastMinedData.resultsByLetter,
    allUnique: lastMinedData.allUnique,
    mode: lastMinedData.mode || miningModeSelect.value
  });

  // 1. Copy complete, un-truncated prompt to clipboard
  try {
    await navigator.clipboard.writeText(payload.fullPrompt);
  } catch (err) {
    const textarea = document.createElement("textarea");
    textarea.value = payload.fullPrompt;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  // 2. Open new chat in a new tab
  if (chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: payload.url });
  } else {
    chrome.runtime.sendMessage({ type: "OPEN_TAB", url: payload.url });
  }

  // 3. User feedback toast
  let notice = `Opened ${payload.service.name}!`;
  if (payload.service.id === "gemini") {
    notice = "Opened Gemini! Prompt in clipboard (Cmd+V to paste).";
  } else if (payload.isTruncatedUrl) {
    notice = `Opened ${payload.service.name}! Full prompt in clipboard.`;
  } else {
    notice = `Opened ${payload.service.name} with pre-filled prompt!`;
  }
  showToast(notice, "success");
}

/**
 * Copy full AI niche analysis prompt to clipboard only
 */
async function copyAiPromptToClipboard() {
  if (!lastMinedData || !lastMinedData.keyword) {
    showToast("No mined data available to create prompt.", "warning");
    return;
  }

  const prompt = AIServiceManager.generateNichePrompt({
    keyword: lastMinedData.keyword,
    platform: lastMinedData.platform,
    resultsByLetter: lastMinedData.resultsByLetter,
    allUnique: lastMinedData.allUnique,
    mode: lastMinedData.mode || miningModeSelect.value
  });

  try {
    await navigator.clipboard.writeText(prompt);
    showToast("✓ Niche analysis prompt copied to clipboard!");
  } catch (err) {
    const textarea = document.createElement("textarea");
    textarea.value = prompt;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    showToast("✓ Niche analysis prompt copied to clipboard!");
  }
}

/**
 * Display toast notification
 */
let toastTimeout = null;
function showToast(message, type = "success") {
  if (toastTimeout) clearTimeout(toastTimeout);
  toastMessage.textContent = message;

  toast.style.backgroundColor = type === "error"
    ? "var(--color-danger)"
    : type === "warning"
    ? "var(--color-warning)"
    : "var(--color-success)";

  toast.classList.remove("hidden");
  toastTimeout = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2600);
}

/**
 * Save user settings to storage
 */
function saveSettings() {
  const settings = {
    mode: miningModeSelect.value,
    method: miningMethodSelect.value,
    delay: delaySlider.value,
    includeNumbers: checkNumbers.checked,
    clearSearchbar: checkClearSearchbar.checked,
    selectedAiService
  };
  chrome.storage.local.set({ autocompleteMiningSettings: settings }).catch(() => {});
}

/**
 * Load saved settings from storage
 */
function loadSavedSettings() {
  chrome.storage.local.get(["autocompleteMiningSettings"]).then((data) => {
    const s = data.autocompleteMiningSettings;
    if (s) {
      if (s.mode) miningModeSelect.value = s.mode;
      if (s.method) miningMethodSelect.value = s.method;
      if (s.delay) {
        delaySlider.value = s.delay;
        delayValText.textContent = `${s.delay}ms`;
      }
      if (typeof s.includeNumbers === "boolean") checkNumbers.checked = s.includeNumbers;
      if (typeof s.clearSearchbar === "boolean") checkClearSearchbar.checked = s.clearSearchbar;
      if (s.selectedAiService) {
        selectAiService(s.selectedAiService);
      } else {
        selectAiService("chatgpt");
      }
    }
  }).catch(() => {});
}

/**
 * Escape HTML utility
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Start application
document.addEventListener("DOMContentLoaded", init);

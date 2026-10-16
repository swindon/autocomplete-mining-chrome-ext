# Autocomplete Mining ⛏️

A high-performance Google Chrome Extension (Manifest V3) that automates keyword autocomplete mining across **Google**, **Amazon**, **Etsy**, and **YouTube**, systematically querying from A to Z directly in the search bar and returning full, organized results formatted in Markdown with one-click clipboard copying.

---

## 🌟 Key Features

- **Chrome Side Panel UI**: Opens neatly docked on the side of your browser without obstructing web pages.
- **Real-Time Searchbar Simulation**: Types the base keyword plus each letter of the alphabet (`a` through `z`) directly into the site's search input, triggering live suggestions on screen.
- **Multi-Platform Support**:
  - 🌐 **Google Search** (`google.com`, regional domains)
  - 📦 **Amazon** (`amazon.com`, regional domains)
  - 🛍️ **Etsy** (`etsy.com`)
  - 📺 **YouTube** (`youtube.com`)
- **Dual / Hybrid Mining Engine**:
  - **DOM Searchbar Mode**: Real-time visual interaction with the page's search bar and dropdown.
  - **Hybrid Auto-Fallback**: Automatically uses direct in-page/background suggestion queries if dropdown rendering is obstructed or delayed.
  - **Direct Background Mode**: High-speed mining without interacting with the active page DOM.
- **Alphabet & Numeric Mining**:
  - Full alphabet **A–Z** + **Base query**.
  - Optional **0–9 numeric** sequence toggle.
  - **Suffix mode** (`[Keyword] [a-z]`) or **Prefix mode** (`[a-z] [Keyword]`).
- **Live Progress & Visual Analytics**:
  - Real-time animated progress bar and query counter.
  - Alphabet chips grid lighting up as letters complete (Pending, Active, Done with suggestion count).
  - Unique suggestion deduplication counter.
  - Full **Pause**, **Resume**, and **Stop** controls.
- **Markdown & Multi-Format Export**:
  - **Copy Markdown**: One-click copy formatted Markdown document directly to clipboard with instant confirmation toast.
  - **Copy Keywords**: Plain list of unique keywords (newline-separated).
  - **Download .MD**: Saves `autocomplete_[platform]_[keyword].md`.
  - **Download .CSV**: Saves `autocomplete_[platform]_[keyword].csv`.
- **In-Result Filtering**: Instant search bar to filter mined suggestions in real time.
- **✨ Instant "Analyse with AI" Niche Intelligence**:
  - One-click launch into your preferred AI chat service with all extracted autocomplete terms and a structured niche analysis prompt.
  - **7 Supported AI Platforms**:
    - 🤖 **ChatGPT** (`chatgpt.com`)
    - 🎭 **Claude** (`claude.ai`)
    - ✨ **Google Gemini** (`gemini.google.com`)
    - 🔍 **Perplexity** (`perplexity.ai`)
    - 🐋 **DeepSeek** (`chat.deepseek.com`)
    - 💠 **Microsoft Copilot** (`copilot.microsoft.com`)
    - ⚡ **Grok** (`grok.com`)
  - **Comprehensive Prompt Directives**: Directs the AI to report on search intent, thematic sub-niche clusters, high-value long-tail opportunities, commercial/monetization potential, platform-tailored suggestions (Amazon product & PPC angles, Etsy product ideas, YouTube video concepts, Google topic clusters), and an action roadmap.
  - **Automatic Clipboard Synchronization**: Copies the complete, un-truncated prompt and all suggestions to your clipboard so you can paste (`Cmd+V` / `Ctrl+V`) directly into any model.
  - **"Copy Prompt" Utility**: Instant one-click button to copy the prompt without opening an external tab.

---

## 📁 Project Structure

```
autocomplete-mining/
├── manifest.json            # Chrome Extension Manifest V3 configuration
├── background.js            # Background service worker (SidePanel setup & API proxy)
├── content/
│   └── content.js           # Content script for typing simulation & DOM extraction
├── sidepanel/
│   ├── sidepanel.html       # Side panel interface (including AI Niche Intelligence)
│   ├── sidepanel.css        # Responsive dark slate design system (Vanilla CSS)
│   └── sidepanel.js         # Side panel state management and event coordination
├── lib/
│   ├── miner.js             # Reusable step-by-step mining orchestrator engine
│   ├── markdown.js          # Markdown, CSV, and plain-text export generators
│   └── ai.js                # AI service profiles, prompt generation & URL launcher
├── icons/                   # Custom generated icons (16px, 32px, 48px, 128px)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── tests/
│   ├── miner.test.mjs       # Mining engine, export formatters & integration tests
│   └── ai.test.mjs          # AI prompt generation, service URLs & safety tests
└── README.md
```

---

## 🚀 Installation Instructions

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` in the address bar.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click **Load unpacked** in the top-left toolbar.
5. Select the `autocomplete-mining` directory.
6. The **Autocomplete Mining** icon will now appear in your Chrome toolbar.

---

## 💡 How to Use

1. Navigate to **Google**, **Amazon**, **Etsy**, or **YouTube**.
2. Click the **Autocomplete Mining** icon in your toolbar (or click the Side Panel icon in Chrome and choose Autocomplete Mining).
3. The side panel will automatically detect the active site (showing an active badge).
4. Enter your seed keyword or phrase (e.g., `leather wallet`, `vintage camera`, `asmr`).
5. (Optional) Adjust **Mining Options** in the accordion (speed delay, prefix/suffix, 0–9 digits).
6. Click **Mine Now** (or press Enter).
7. Watch the extension type into the search bar, cycle through the alphabet, and harvest suggestions live.
8. Once finished:
   - Click **Analyse with AI** to immediately open a new chat (ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Copilot, Grok) with all extracted terms and a prompt requesting a full niche report!
   - Use the dropdown to choose your preferred AI service or click **Copy Prompt** to copy the prompt to your clipboard.
   - Or click **Copy to Clipboard** to grab your clean, formatted report!

---

## 🧪 Testing

Run the automated test suites locally:

```bash
node tests/miner.test.mjs
node tests/ai.test.mjs
```

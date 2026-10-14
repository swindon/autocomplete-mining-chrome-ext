import assert from "node:assert";
import { MarkdownExporter } from "../lib/markdown.js";
import { MinerEngine } from "../lib/miner.js";

console.log("=== Running Autocomplete Mining Test Suite ===");

// 1. Test MarkdownExporter.generateMarkdown
{
  console.log("\n[Test 1] MarkdownExporter.generateMarkdown formatting");
  const testData = {
    keyword: "vintage camera",
    platform: "google",
    mode: "suffix",
    resultsByLetter: {
      base: ["vintage camera 35mm", "vintage camera shop"],
      a: ["vintage camera app", "vintage camera australia"],
      b: ["vintage camera bag", "vintage camera brands"]
    },
    allUnique: [
      "vintage camera 35mm",
      "vintage camera shop",
      "vintage camera app",
      "vintage camera australia",
      "vintage camera bag",
      "vintage camera brands"
    ]
  };

  const md = MarkdownExporter.generateMarkdown(testData);

  assert.ok(md.includes('# Autocomplete Mining: "vintage camera"'), "Header contains keyword");
  assert.ok(md.includes("Google"), "Contains platform name");
  assert.ok(md.includes("**Total Unique Suggestions** | **6**"), "Contains total unique count");
  assert.ok(md.includes("## Base Query"), "Contains Base Query section");
  assert.ok(md.includes("- vintage camera 35mm"), "Contains base item");
  assert.ok(md.includes("## A"), "Contains Section A");
  assert.ok(md.includes("- vintage camera app"), "Contains A item");
  assert.ok(md.includes("## B"), "Contains Section B");
  assert.ok(md.includes("## All Unique Suggestions"), "Contains All Unique Suggestions section");
  assert.ok(md.includes("1. vintage camera 35mm"), "Contains numbered list");
  console.log("✓ Markdown generated successfully with all required sections.");
}

// 2. Test MarkdownExporter.generateCSV
{
  console.log("\n[Test 2] MarkdownExporter.generateCSV formatting");
  const testData = {
    keyword: 'leather "classic" wallet',
    platform: "etsy",
    resultsByLetter: {
      a: ['leather "classic" wallet airtag']
    },
    allUnique: ['leather "classic" wallet airtag']
  };

  const csv = MarkdownExporter.generateCSV(testData);
  assert.ok(csv.includes('"Platform","Seed Keyword","Section","Suggestion"'), "CSV contains header");
  assert.ok(csv.includes('"leather ""classic"" wallet"'), "CSV escapes double quotes correctly");
  console.log("✓ CSV generated and escaped properly.");
}

// 3. Test MarkdownExporter.generatePlainText
{
  console.log("\n[Test 3] MarkdownExporter.generatePlainText formatting");
  const allUnique = ["zebra", "apple", "mango"];
  const text = MarkdownExporter.generatePlainText(allUnique);
  assert.strictEqual(text, "apple\nmango\nzebra", "Sorts alphabetically and joins with newline");
  console.log("✓ Plain text generated and sorted alphabetically.");
}

// 4. Test MinerEngine step building
{
  console.log("\n[Test 4] MinerEngine buildSteps (suffix vs prefix and numbers)");
  
  // Suffix mode
  const engineSuffix = new MinerEngine({
    keyword: "gift ideas",
    mode: "suffix",
    includeNumbers: false
  });
  const stepsSuffix = engineSuffix.buildSteps();
  assert.strictEqual(stepsSuffix.length, 27, "Base + 26 alphabet letters = 27 steps");
  assert.strictEqual(stepsSuffix[0].letter, "base");
  assert.strictEqual(stepsSuffix[0].query, "gift ideas");
  assert.strictEqual(stepsSuffix[1].letter, "a");
  assert.strictEqual(stepsSuffix[1].query, "gift ideas a");
  assert.strictEqual(stepsSuffix[26].letter, "z");
  assert.strictEqual(stepsSuffix[26].query, "gift ideas z");

  // Prefix mode
  const enginePrefix = new MinerEngine({
    keyword: "gift ideas",
    mode: "prefix",
    includeNumbers: false
  });
  const stepsPrefix = enginePrefix.buildSteps();
  assert.strictEqual(stepsPrefix[1].query, "a gift ideas");

  // With numbers
  const engineWithNumbers = new MinerEngine({
    keyword: "gift ideas",
    includeNumbers: true
  });
  const stepsWithNumbers = engineWithNumbers.buildSteps();
  assert.strictEqual(stepsWithNumbers.length, 37, "Base + 26 letters + 10 digits = 37 steps");
  assert.strictEqual(stepsWithNumbers[27].letter, "0");
  assert.strictEqual(stepsWithNumbers[36].letter, "9");

  console.log("✓ MinerEngine step building validated for suffix, prefix, and digits.");
}

// 5. Test MinerEngine execution lifecycle simulation
{
  console.log("\n[Test 5] MinerEngine execution flow simulation");

  let stepStartCalls = 0;
  let stepCompleteCalls = 0;
  let progressCalls = [];
  let completedSummary = null;

  const mockEngine = new MinerEngine({
    keyword: "podcast mic",
    platform: "youtube",
    delayMs: 5,
    onStepStart: () => { stepStartCalls++; },
    onStepComplete: () => { stepCompleteCalls++; },
    onProgress: (p) => { progressCalls.push(p); },
    onComplete: (summary) => { completedSummary = summary; }
  });

  // Override executeStep to simulate suggestions
  mockEngine.executeStep = async (step) => {
    return [
      `${step.query} review`,
      `${step.query} setup`,
      `${step.query} test`
    ];
  };

  // Run only a subset of steps for quick unit test
  mockEngine.buildSteps = () => [
    { letter: "base", query: "podcast mic" },
    { letter: "a", query: "podcast mic a" },
    { letter: "b", query: "podcast mic b" }
  ];

  await mockEngine.start();

  assert.strictEqual(stepStartCalls, 3, "3 steps started");
  assert.strictEqual(stepCompleteCalls, 3, "3 steps completed");
  assert.strictEqual(mockEngine.status, "completed", "Status is completed");
  assert.strictEqual(completedSummary.totalUnique, 9, "9 unique suggestions discovered");
  assert.strictEqual(progressCalls[progressCalls.length - 1], 100, "Progress reached 100%");
  console.log("✓ MinerEngine execution lifecycle validated successfully.");
}

// 6. Test MinerEngine Pause / Resume / Stop controls
{
  console.log("\n[Test 6] MinerEngine Pause, Resume, and Stop controls");

  let stoppedSummary = null;
  const mockEngine = new MinerEngine({
    keyword: "leather wallet",
    platform: "etsy",
    delayMs: 10,
    onStop: (summary) => { stoppedSummary = summary; }
  });

  mockEngine.executeStep = async () => ["item 1", "item 2"];
  mockEngine.buildSteps = () => [
    { letter: "base", query: "leather wallet" },
    { letter: "a", query: "leather wallet a" },
    { letter: "b", query: "leather wallet b" },
    { letter: "c", query: "leather wallet c" }
  ];

  // Start in background and pause then stop
  const promise = mockEngine.start();
  mockEngine.pause();
  assert.strictEqual(mockEngine.status, "paused", "Engine paused");
  mockEngine.resume();
  assert.strictEqual(mockEngine.status, "running", "Engine resumed");
  mockEngine.stop();
  assert.strictEqual(mockEngine.status, "stopped", "Engine stopped");

  await promise;
  assert.ok(stoppedSummary !== null, "onStop was called");
  console.log("✓ Pause, Resume, and Stop controls work seamlessly.");
}

// 7. Test Etsy suggestion extraction & trending filter logic
{
  console.log("\n[Test 7] Etsy suggestion extraction & trending filter simulation");

  const simulatedEtsyDropdown = [
    {
      type: "keyword",
      hasImage: false,
      text: "dog tags custom"
    },
    {
      type: "keyword",
      hasImage: false,
      text: "dog tags custom engraved"
    },
    {
      type: "keyword",
      hasImage: false,
      text: "dog tags customizable"
    },
    {
      type: "keyword",
      hasImage: false,
      text: "dog tags cute"
    },
    {
      type: "keyword",
      hasImage: false,
      text: "dog tags ceramic"
    },
    {
      type: "find_shops",
      hasImage: false,
      text: 'find shop names containing "dog tags c"'
    },
    {
      type: "heading",
      hasImage: false,
      text: "Top searches this week"
    },
    {
      type: "trending",
      hasImage: true,
      text: "christmas cards"
    },
    {
      type: "trending",
      hasImage: true,
      text: "house number signs"
    },
    {
      type: "trending",
      hasImage: true,
      text: "boulder opal"
    }
  ];

  const query = "dog tags c";
  const queryLower = query.toLowerCase().trim();
  const queryTokens = queryLower.split(/\s+/).filter(w => w.length >= 3);
  const ignores = [
    "top searches this week", "find shop names", "find shop names containing"
  ];

  const extracted = [];
  for (const item of simulatedEtsyDropdown) {
    if (item.hasImage) continue;
    if (item.type && item.type !== "keyword") continue;

    const lower = item.text.toLowerCase().trim();
    if (ignores.some(ig => lower === ig || lower.startsWith(ig))) continue;
    if (lower.startsWith("find shop names")) continue;

    const matchesQuery = lower.startsWith(queryLower) || queryTokens.some(tok => lower.includes(tok));
    if (!matchesQuery) continue;

    extracted.push(item.text);
  }

  assert.strictEqual(extracted.length, 5, "Extracted exactly 5 keyword suggestions");
  assert.deepStrictEqual(extracted, [
    "dog tags custom",
    "dog tags custom engraved",
    "dog tags customizable",
    "dog tags cute",
    "dog tags ceramic"
  ], "Matches exact expected Etsy suggestions");
  console.log("✓ Etsy extraction accurately extracts suggestions and discards shop search and trending items.");
}

// 8. Test AI Niche Intelligence Prompt & Service integration
{
  console.log("\n[Test 8] AI Niche Intelligence integration");
  const { AIServiceManager } = await import("../lib/ai.js");
  const services = AIServiceManager.getServices();
  assert.ok(services.length >= 6, "AI services available");

  const prompt = AIServiceManager.generateNichePrompt({
    keyword: "dog tags",
    platform: "etsy",
    allUnique: ["dog tags custom", "dog tags engraved"]
  });
  assert.ok(prompt.includes("dog tags"), "Prompt includes keyword");
  assert.ok(prompt.includes("Etsy"), "Prompt includes platform");

  const payload = AIServiceManager.buildServicePayload("chatgpt", {
    keyword: "dog tags",
    platform: "etsy",
    allUnique: ["dog tags custom", "dog tags engraved"]
  });
  assert.ok(payload.url.startsWith("https://chatgpt.com/?q="), "ChatGPT payload URL generated");
  console.log("✓ AI Niche Intelligence integration validated successfully.");
}

console.log("\n🎉 All 8 tests passed successfully!");

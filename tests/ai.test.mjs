import assert from "node:assert";
import { AI_SERVICES, AIServiceManager } from "../lib/ai.js";

console.log("=== Running AI Niche Analysis Test Suite ===");

// 1. Test AI Services list and metadata
{
  console.log("\n[Test 1] AI Services configuration");
  const services = AIServiceManager.getServices();
  assert.ok(services.length >= 6, "At least 6 AI services configured");

  const serviceIds = services.map(s => s.id);
  assert.ok(serviceIds.includes("chatgpt"), "Includes ChatGPT");
  assert.ok(serviceIds.includes("claude"), "Includes Claude");
  assert.ok(serviceIds.includes("gemini"), "Includes Google Gemini");
  assert.ok(serviceIds.includes("perplexity"), "Includes Perplexity");
  assert.ok(serviceIds.includes("deepseek"), "Includes DeepSeek");
  assert.ok(serviceIds.includes("copilot"), "Includes Microsoft Copilot");
  assert.ok(serviceIds.includes("grok"), "Includes Grok");

  for (const s of services) {
    assert.ok(s.name, `Service ${s.id} has name`);
    assert.ok(s.provider, `Service ${s.id} has provider`);
    assert.ok(s.baseUrl, `Service ${s.id} has baseUrl`);
    assert.ok(typeof s.supportsQueryParam === "boolean", `Service ${s.id} has boolean supportsQueryParam`);
  }
  console.log("✓ All AI services correctly configured.");
}

// 2. Test prompt generation with extracted details
{
  console.log("\n[Test 2] Niche analysis prompt generation");
  const testData = {
    keyword: "custom leather wallet",
    platform: "etsy",
    mode: "suffix",
    allUnique: [
      "custom leather wallet men",
      "custom leather wallet bifold",
      "custom leather wallet engraved"
    ],
    resultsByLetter: {
      base: ["custom leather wallet men"],
      b: ["custom leather wallet bifold"],
      e: ["custom leather wallet engraved"]
    }
  };

  const prompt = AIServiceManager.generateNichePrompt(testData);

  assert.ok(prompt.includes('seed keyword "custom leather wallet"'), "Includes seed keyword");
  assert.ok(prompt.includes("Etsy"), "Includes platform name");
  assert.ok(prompt.includes("Total Unique Suggestions: 3"), "Includes total unique count");
  assert.ok(prompt.includes("[Base]: custom leather wallet men"), "Includes Base section");
  assert.ok(prompt.includes("[B]: custom leather wallet bifold"), "Includes B section");
  assert.ok(prompt.includes("Niche Intelligence Report"), "Includes Niche Intelligence Report header");
  assert.ok(prompt.includes("Physical & Digital Product Angles"), "Includes Etsy-specific product guidance");
  assert.ok(prompt.includes("Listing Optimization"), "Includes Etsy listing optimization guidance");
  assert.ok(prompt.includes("Thematic Clusters & Sub-Niches"), "Directs reporting on sub-niches");
  assert.ok(prompt.includes("Commercial & Monetization Potential"), "Directs reporting on commercial potential");

  console.log("✓ Niche prompt includes all extracted details and reporting directives.");
}

// 3. Test platform-specific advice for Amazon, YouTube, and Google
{
  console.log("\n[Test 3] Platform-specific advice variations");
  const amazonAdvice = AIServiceManager.getPlatformSpecificAdvice("amazon");
  assert.ok(amazonAdvice.includes("Product & Merchandising Opportunities"), "Amazon includes product/merchandising advice");
  assert.ok(amazonAdvice.includes("Amazon SEO & Listing Optimization"), "Amazon includes SEO/backend search terms advice");
  assert.ok(amazonAdvice.includes("PPC & Advertising Targets"), "Amazon includes PPC targets advice");

  const youtubeAdvice = AIServiceManager.getPlatformSpecificAdvice("youtube");
  assert.ok(youtubeAdvice.includes("Video Ideas"), "YouTube includes video ideas");
  assert.ok(youtubeAdvice.includes("Click-Worthy Titles & Thumbnails"), "YouTube includes title/thumbnail advice");

  const googleAdvice = AIServiceManager.getPlatformSpecificAdvice("google");
  assert.ok(googleAdvice.includes("Topic Clusters"), "Google includes topic clusters");
  assert.ok(googleAdvice.includes("Search Intent Mapping"), "Google includes search intent");
  console.log("✓ Platform-specific advice differentiates Amazon, Etsy, YouTube, and Google.");
}

// 4. Test URL payload creation for various services
{
  console.log("\n[Test 4] Service URL payload generation");
  const sampleData = {
    keyword: "woodworking gifts",
    platform: "google",
    allUnique: ["woodworking gifts for dad", "woodworking gifts to sell"],
    resultsByLetter: {
      d: ["woodworking gifts for dad"],
      s: ["woodworking gifts to sell"]
    }
  };

  // ChatGPT
  const chatgptPayload = AIServiceManager.buildServicePayload("chatgpt", sampleData);
  assert.ok(chatgptPayload.url.startsWith("https://chatgpt.com/?q="), "ChatGPT URL has query param");
  assert.ok(chatgptPayload.url.includes(encodeURIComponent("woodworking gifts")), "ChatGPT URL contains keyword");
  assert.strictEqual(chatgptPayload.isTruncatedUrl, false, "Small dataset is not truncated");

  // Claude
  const claudePayload = AIServiceManager.buildServicePayload("claude", sampleData);
  assert.ok(claudePayload.url.startsWith("https://claude.ai/new?q="), "Claude URL has query param");

  // Gemini (no query param natively, URL is base and full prompt is in fullPrompt for clipboard)
  const geminiPayload = AIServiceManager.buildServicePayload("gemini", sampleData);
  assert.strictEqual(geminiPayload.url, "https://gemini.google.com/app", "Gemini URL is clean app URL");
  assert.ok(geminiPayload.fullPrompt.length > 100, "Gemini has fullPrompt ready for clipboard");

  // Perplexity
  const perplexityPayload = AIServiceManager.buildServicePayload("perplexity", sampleData);
  assert.ok(perplexityPayload.url.startsWith("https://www.perplexity.ai/search?q="), "Perplexity URL has query param");

  // DeepSeek
  const deepseekPayload = AIServiceManager.buildServicePayload("deepseek", sampleData);
  assert.ok(deepseekPayload.url.startsWith("https://chat.deepseek.com/?q="), "DeepSeek URL has query param");

  console.log("✓ URL payloads generated accurately for all services.");
}

// 5. Test URL safety length protection on massive datasets
{
  console.log("\n[Test 5] URL length safety and fallback on large datasets");
  // Generate 250 suggestions
  const largeSuggestions = [];
  const largeResults = {};
  for (let i = 0; i < 200; i++) {
    const s = `woodworking gift idea number ${i} for advanced woodworkers and beginners`;
    largeSuggestions.push(s);
  }

  const largeData = {
    keyword: "woodworking gifts",
    platform: "google",
    allUnique: largeSuggestions,
    resultsByLetter: { base: largeSuggestions.slice(0, 50) }
  };

  const payload = AIServiceManager.buildServicePayload("chatgpt", largeData);
  assert.ok(payload.url.length <= payload.service.maxUrlLength, `URL length (${payload.url.length}) is safely bounded under maxUrlLength (${payload.service.maxUrlLength})`);
  assert.strictEqual(payload.isTruncatedUrl, true, "Flagged as truncated URL to prevent HTTP 414 error");
  assert.ok(payload.fullPrompt.includes("woodworking gift idea number 199"), "Full prompt still contains complete dataset for clipboard");
  console.log("✓ Large datasets safely bound URL length while preserving full prompt for clipboard.");
}

console.log("\n🎉 All 5 AI tests passed successfully!");

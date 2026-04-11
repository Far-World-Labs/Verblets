/**
 * Integration test: Browse Hacker News, screenshot top 5 articles + discussions,
 * analyze screenshots using the analyze-image chain.
 *
 * Run: source .env && npx vitest run src/chains/analyze-image/index.examples.js --config vitest.config.examples.js
 */
import { describe, it, expect } from 'vitest';
import { ChainEvent, TelemetryEvent } from '../../lib/progress/constants.js';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  // playwright not installed — tests will be skipped
}

import init from '../../init.js';
import analyzeImage from './index.js';
import { imageToBase64 } from '../../lib/image-utils/index.js';
import callLlm, { buildVisionPrompt } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';

// Initialize verblets with image processing
init({ imageProcessing: true });

// Accumulate ALL progress events across ALL calls for final audit
const allEvents = [];
const onProgress = (event) => {
  allEvents.push(event);
  const tag = `[${event.kind}:${event.event}]`;
  const op = event.operation || '';
  const extra = event.duration !== undefined ? ` (${event.duration}ms)` : '';
  console.error(`  ${tag} op=${op}${extra}`);
};

describe.skipIf(!chromium)('HN Vision Integration', { timeout: 300_000 }, () => {
  let screenshotDir;
  let browser;
  let page;
  let frontPageShot;
  let topLinks;
  const commentShots = [];
  const summaries = [];

  it('sets up browser and screenshots HN front page', async () => {
    screenshotDir = await mkdtemp(join(tmpdir(), 'hn-vision-'));
    console.error(`\nScreenshots → ${screenshotDir}\n`);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    page = await context.newPage();

    await page.goto('https://news.ycombinator.com/', { waitUntil: 'networkidle' });
    frontPageShot = join(screenshotDir, 'hn-frontpage.png');
    await page.screenshot({ path: frontPageShot, fullPage: true });
    console.error(`  Saved front page: ${frontPageShot}`);

    expect(frontPageShot).toBeTruthy();
  });

  it('analyzes front page screenshot — verifies operation path composition', async () => {
    const eventsBefore = allEvents.length;
    console.error('\n--- Analyzing front page screenshot ---');

    const analysis = await analyzeImage(
      frontPageShot,
      'This is a screenshot of the Hacker News front page. List the top 5 article titles exactly as shown, along with their point counts and comment counts if visible. Return them numbered 1-5.',
      { onProgress }
    );

    console.error('\n=== FRONT PAGE ANALYSIS ===');
    console.error(analysis);

    // Verify events accumulated (not cleared)
    const newEvents = allEvents.slice(eventsBefore);
    console.error(`\n  New events this call: ${newEvents.length}`);
    for (const e of newEvents) {
      console.error(`    ${e.kind}:${e.event} step=${e.step} op=${e.operation}`);
    }

    // Chain-level events: operation = 'analyze-image'
    const chainStart = newEvents.find((e) => e.event === ChainEvent.start);
    expect(chainStart.step).toBe('analyze-image');
    expect(chainStart.operation).toBe('analyze-image');

    const chainComplete = newEvents.find((e) => e.event === ChainEvent.complete);
    expect(chainComplete.operation).toBe('analyze-image');
    expect(chainComplete.imageCount).toBe(1);
    expect(chainComplete.tiled).toBe(false);

    // LLM-level events: operation = 'analyze-image/llm' (composed!)
    const llmModel = newEvents.find((e) => e.event === TelemetryEvent.llmModel);
    expect(llmModel.step).toBe('llm');
    expect(llmModel.operation).toBe('analyze-image/llm');

    const llmCall = newEvents.find((e) => e.event === TelemetryEvent.llmCall);
    expect(llmCall.operation).toBe('analyze-image/llm');
    expect(llmCall.status).toBe('success');
    expect(llmCall.tokens).toBeDefined();
    expect(llmCall.duration).toBeGreaterThan(0);

    expect(analysis).toBeTruthy();
    expect(typeof analysis).toBe('string');
  });

  it('extracts top 5 comment page links from DOM', async () => {
    topLinks = await page.$$eval('tr.athing .titleline > a', (anchors) =>
      anchors.slice(0, 5).map((a) => ({ title: a.textContent, url: a.href }))
    );

    const commentLinks = await page.$$eval('.subtext', (rows) =>
      rows.slice(0, 5).map((row) => {
        const links = row.querySelectorAll('a');
        const last = links[links.length - 1];
        return last?.href?.includes('item?id=') ? last.href : undefined;
      })
    );

    console.error('\n--- Top 5 articles with comment links ---');
    for (const [i, link] of topLinks.entries()) {
      topLinks[i].commentUrl = commentLinks[i];
      console.error(`  ${i + 1}. ${link.title}`);
      console.error(`     Comments: ${commentLinks[i] || 'none'}`);
    }

    expect(topLinks.length).toBe(5);
  });

  it('screenshots each comment page', async () => {
    for (const [i, link] of topLinks.entries()) {
      if (!link.commentUrl) {
        console.error(`  Skipping ${i + 1} — no comments link`);
        continue;
      }

      console.error(`\n  Navigating to comments for: "${link.title.slice(0, 60)}"`);
      await page.goto(link.commentUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const shotPath = join(screenshotDir, `hn-comments-${i + 1}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      commentShots.push({ index: i, title: link.title, path: shotPath });
      console.error(`  Saved: ${shotPath}`);
    }

    await browser.close();
    expect(commentShots.length).toBeGreaterThan(0);
  });

  it('analyzes comment screenshots and summarizes discussions', async () => {
    for (const shot of commentShots) {
      const eventsBefore = allEvents.length;
      console.error(`\n--- Analyzing comments for: "${shot.title.slice(0, 60)}" ---`);

      const summary = await analyzeImage(
        shot.path,
        'This is a screenshot of a Hacker News discussion page. Summarize what the top visible comments are discussing. Include the main themes, any notable arguments or insights, and the general sentiment. Be specific about the content — reference actual points being made.',
        { onProgress }
      );

      summaries.push({ title: shot.title, summary });

      // Verify per-call events
      const newEvents = allEvents.slice(eventsBefore);
      const starts = newEvents.filter((e) => e.event === ChainEvent.start);
      const completes = newEvents.filter((e) => e.event === ChainEvent.complete);
      const llmCalls = newEvents.filter((e) => e.event === TelemetryEvent.llmCall);
      console.error(
        `  Events: ${starts.length} start, ${completes.length} complete, ${llmCalls.length} llm:call`
      );
      expect(starts.length).toBe(1);
      expect(completes.length).toBe(1);
      expect(llmCalls.length).toBe(1);
      expect(llmCalls[0].operation).toBe('analyze-image/llm');
    }

    // Print final summaries
    console.error('\n\n========================================');
    console.error('  HACKER NEWS TOP 5 — DISCUSSION SUMMARIES');
    console.error('========================================\n');

    for (const [i, s] of summaries.entries()) {
      console.error(`${i + 1}. ${s.title}`);
      console.error(`   ${s.summary}\n`);
    }

    expect(summaries.length).toBe(commentShots.length);
    for (const s of summaries) {
      expect(s.summary).toBeTruthy();
      expect(typeof s.summary).toBe('string');
    }
  });

  it('tests tiled mode with multiple comment screenshots', async () => {
    // Use tile: true to composite multiple screenshots into one image
    const eventsBefore = allEvents.length;
    const paths = commentShots.slice(0, 2).map((s) => ({
      path: s.path,
      label: s.title.slice(0, 40),
    }));

    console.error(`\n--- Tiled analysis of ${paths.length} screenshots ---`);

    const tiledAnalysis = await analyzeImage(
      paths,
      'This is a tiled image showing screenshots of two Hacker News discussion pages side by side. Compare the tone and topics of the two discussions. Which discussion is more heated? Which has more technical depth?',
      { tile: true, onProgress }
    );

    console.error('\n=== TILED ANALYSIS ===');
    console.error(tiledAnalysis);

    const newEvents = allEvents.slice(eventsBefore);
    const complete = newEvents.find((e) => e.event === ChainEvent.complete);
    expect(complete.imageCount).toBe(2);
    expect(complete.tiled).toBe(true);

    // Even in tile mode, only one LLM call
    const llmCalls = newEvents.filter((e) => e.event === TelemetryEvent.llmCall);
    expect(llmCalls.length).toBe(1);

    expect(tiledAnalysis).toBeTruthy();
  });

  it('tests direct callLlm with vision content array', async () => {
    const eventsBefore = allEvents.length;
    console.error('\n--- Direct callLlm vision test (front page) ---');

    const imageData = await imageToBase64(frontPageShot);
    console.error(
      `  Image: ${imageData.mediaType}, ${(imageData.data.length / 1024).toFixed(0)}KB base64`
    );

    const contentArray = buildVisionPrompt(
      'What color is the Hacker News header bar? Answer in one word.',
      [imageData]
    );

    console.error(
      `  Content array: ${contentArray.length} blocks (${contentArray.map((b) => b.type).join(', ')})`
    );

    const answer = await retry(() => callLlm(contentArray, { onProgress }));
    console.error(`  Answer: ${answer}`);

    // Direct callLlm (no parent chain) — operation is just 'llm'
    const newEvents = allEvents.slice(eventsBefore);
    const llmModel = newEvents.find((e) => e.event === TelemetryEvent.llmModel);
    expect(llmModel.operation).toBe('llm');

    expect(answer.toLowerCase()).toMatch(/orange/);
  });

  it('tests nested operation path — analyze-image inside a named parent', async () => {
    // Simulate a parent chain calling analyze-image
    const eventsBefore = allEvents.length;
    console.error('\n--- Nested operation path test ---');

    const result = await analyzeImage(
      frontPageShot,
      'How many articles are visible on this Hacker News page? Answer with just a number.',
      { operation: 'web-scrape', onProgress }
    );

    console.error(`  Result: ${result}`);

    const newEvents = allEvents.slice(eventsBefore);

    // Chain-level: operation = 'web-scrape/analyze-image'
    const chainStart = newEvents.find((e) => e.event === ChainEvent.start);
    expect(chainStart.operation).toBe('web-scrape/analyze-image');

    // LLM-level: operation = 'web-scrape/analyze-image/llm'
    const llmCall = newEvents.find((e) => e.event === TelemetryEvent.llmCall);
    expect(llmCall.operation).toBe('web-scrape/analyze-image/llm');

    expect(result).toBeTruthy();
  });

  it('reports complete cumulative progress event audit', () => {
    console.error('\n--- Cumulative Progress Event Audit ---');
    console.error(`Total events across ALL calls: ${allEvents.length}`);

    const byEvent = {};
    const byOperation = {};
    for (const e of allEvents) {
      const eventKey = `${e.kind}:${e.event}`;
      byEvent[eventKey] = (byEvent[eventKey] || 0) + 1;
      const opKey = e.operation || '(none)';
      byOperation[opKey] = (byOperation[opKey] || 0) + 1;
    }

    console.error('\n  By event type:');
    for (const [key, count] of Object.entries(byEvent).sort()) {
      console.error(`    ${key}: ${count}`);
    }

    console.error('\n  By operation path:');
    for (const [key, count] of Object.entries(byOperation).sort()) {
      console.error(`    ${key}: ${count}`);
    }

    // Verify all events have required fields
    for (const e of allEvents) {
      expect(e.timestamp).toBeTruthy();
      expect(e.kind).toMatch(/^(telemetry|operation)$/);
      expect(e.step).toBeTruthy();
    }

    // Verify we have a meaningful number of events
    // 7 analyzeImage calls (5 comments + 1 front page + 1 tiled + 1 nested) + 1 direct callLlm = 8 LLM calls minimum
    const llmCalls = allEvents.filter((e) => e.event === TelemetryEvent.llmCall);
    console.error(`\n  Total LLM calls: ${llmCalls.length}`);
    expect(llmCalls.length).toBeGreaterThanOrEqual(8);

    // Verify operation path hierarchy exists
    const operations = new Set(allEvents.map((e) => e.operation).filter(Boolean));
    console.error(`  Unique operation paths: ${Array.from(operations).toSorted().join(', ')}`);
    expect(operations.has('analyze-image')).toBe(true);
    expect(operations.has('analyze-image/llm')).toBe(true);
    expect(operations.has('web-scrape/analyze-image')).toBe(true);
    expect(operations.has('web-scrape/analyze-image/llm')).toBe(true);

    // Token totals
    const totalTokens = llmCalls.reduce((sum, e) => sum + (e.tokens?.total || 0), 0);
    console.error(`  Total tokens consumed: ${totalTokens}`);

    console.error(`\n  Screenshots in: ${allEvents[0]?.timestamp ? 'verified' : 'missing'}`);
  });
});

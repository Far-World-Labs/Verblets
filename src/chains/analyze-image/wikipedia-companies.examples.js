import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium } from 'playwright';
import path from 'node:path';

import { existsSync } from 'node:fs';
import init from '../../init.js';
import { createScreenshotDir } from '../../lib/screenshot-cleanup/index.js';
import analyzeImage from './index.js';
import callLlm, { buildVisionPrompt, jsonSchema } from '../../lib/llm/index.js';
import { imageToBase64 } from '../../lib/image-utils/index.js';
import map from '../map/index.js';
import filter from '../filter/index.js';
import score from '../score/index.js';
import sort from '../sort/index.js';

init({ imageProcessing: true });

// ─── Shared state ────────────────────────────────────────────────────────────

let browser;
let screenshotHandle;
const screenshots = {};
const allEvents = [];
const captureProgress = (e) => allEvents.push(e);

// ─── Browser setup ───────────────────────────────────────────────────────────

beforeAll(async () => {
  screenshotHandle = await createScreenshotDir('verblets-wiki-');
  browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  // Main page: List of largest companies by revenue
  const page = await ctx.newPage();
  await page.goto('https://en.wikipedia.org/wiki/List_of_largest_companies_by_revenue', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  // Screenshot the top of the page (intro + first part of table)
  const topShot = path.join(screenshotHandle.dir, 'wiki-top.png');
  await page.screenshot({ path: topShot, fullPage: false });
  screenshotHandle.track(topShot);
  screenshots.top = topShot;

  // Scroll to the main table and screenshot
  /* eslint-disable no-undef */
  await page.evaluate(() => {
    const table = document.querySelector('table.wikitable.sortable');
    if (table) table.scrollIntoView({ block: 'start' });
  });
  /* eslint-enable no-undef */
  await page.waitForTimeout(500);
  const tableShot = path.join(screenshotHandle.dir, 'wiki-table.png');
  await page.screenshot({ path: tableShot, fullPage: false });
  screenshotHandle.track(tableShot);
  screenshots.table = tableShot;

  // Scroll further down for more rows
  await page.evaluate(() => window.scrollBy(0, 800)); // eslint-disable-line no-undef
  await page.waitForTimeout(300);
  const tableShot2 = path.join(screenshotHandle.dir, 'wiki-table2.png');
  await page.screenshot({ path: tableShot2, fullPage: false });
  screenshotHandle.track(tableShot2);
  screenshots.table2 = tableShot2;

  // Navigate to "List of largest companies by number of employees" for comparison
  await page.goto('https://en.wikipedia.org/wiki/List_of_largest_employers', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  const employersShot = path.join(screenshotHandle.dir, 'wiki-employers.png');
  await page.screenshot({ path: employersShot, fullPage: false });
  screenshotHandle.track(employersShot);
  screenshots.employers = employersShot;

  // Navigate to "List of public corporations by market capitalization"
  await page.goto(
    'https://en.wikipedia.org/wiki/List_of_public_corporations_by_market_capitalization',
    { waitUntil: 'networkidle', timeout: 30000 }
  );
  const marketCapShot = path.join(screenshotHandle.dir, 'wiki-marketcap.png');
  await page.screenshot({ path: marketCapShot, fullPage: false });
  screenshotHandle.track(marketCapShot);
  screenshots.marketCap = marketCapShot;

  await page.close();
  await ctx.close();
}, 60000);

afterAll(async () => {
  if (browser) await browser.close();
  if (screenshotHandle) await screenshotHandle.cleanup();
});

// ─── Schemas ─────────────────────────────────────────────────────────────────

const companyListSchema = jsonSchema('company_list', {
  type: 'object',
  properties: {
    companies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          revenue_usd_billions: { type: 'number' },
          industry: { type: 'string' },
          headquarters_country: { type: 'string' },
        },
        required: ['name', 'revenue_usd_billions', 'industry', 'headquarters_country'],
      },
    },
  },
  required: ['companies'],
});

const comparisonSchema = jsonSchema('page_comparison', {
  type: 'object',
  properties: {
    similarities: { type: 'array', items: { type: 'string' } },
    differences: { type: 'array', items: { type: 'string' } },
    overlapping_companies: { type: 'array', items: { type: 'string' } },
    insight: { type: 'string' },
  },
  required: ['similarities', 'differences', 'overlapping_companies', 'insight'],
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Wikipedia Companies Vision Integration', () => {
  // ── 1. Structured extraction from table screenshot ──

  let extractedCompanies = [];

  it('extracts company table data as structured JSON via vision', async () => {
    const result = await analyzeImage(
      [
        { path: screenshots.table, label: 'Revenue table top' },
        { path: screenshots.table2, label: 'Revenue table continued' },
      ],
      'Extract all companies visible in the table. For each company, provide: name, revenue in USD billions, industry, and headquarters country. Be precise with numbers.',
      {
        onProgress: captureProgress,
        response_format: companyListSchema,
        temperature: 0,
      }
    );

    expect(result).toBeDefined();
    expect(result.companies).toBeDefined();
    expect(result.companies.length).toBeGreaterThanOrEqual(5);

    extractedCompanies = result.companies;

    // Log full extraction for debugging
    console.error(`\n  Extracted ${extractedCompanies.length} companies from table:`);
    for (const c of extractedCompanies) {
      console.error(
        `    ${c.name} | $${c.revenue_usd_billions}B | ${c.industry} | ${c.headquarters_country}`
      );
    }

    // Every company must have a name and numeric revenue; industry and country should mostly be present
    for (const c of extractedCompanies) {
      expect(c.name).toBeTruthy();
      expect(typeof c.revenue_usd_billions).toBe('number');
    }
    const withIndustry = extractedCompanies.filter((c) => c.industry);
    const withCountry = extractedCompanies.filter((c) => c.headquarters_country);
    expect(withIndustry.length).toBeGreaterThanOrEqual(extractedCompanies.length * 0.8);
    expect(withCountry.length).toBeGreaterThanOrEqual(extractedCompanies.length * 0.5);
  }, 45000);

  // ── 2. Map chain: transform company names to descriptions ──

  let companyDescriptions = [];

  it('uses map chain to generate one-line descriptions of each company', async () => {
    const names = extractedCompanies.slice(0, 8).map((c) => c.name);
    expect(names.length).toBeGreaterThanOrEqual(5);

    companyDescriptions = await map(
      names,
      'For each company name, write a single concise sentence describing what the company does and why it matters globally. Do not include revenue figures.',
      {
        onProgress: captureProgress,
        operation: 'describe-companies',
        maxParallel: 2,
        temperature: 0.3,
      }
    );

    expect(companyDescriptions).toHaveLength(names.length);
    for (let i = 0; i < names.length; i++) {
      expect(companyDescriptions[i]).toBeTruthy();
      expect(typeof companyDescriptions[i]).toBe('string');
      expect(companyDescriptions[i].length).toBeGreaterThan(20);
    }

    console.error(`\n  Map chain produced ${companyDescriptions.length} descriptions`);
    console.error('  Sample:', `${names[0]} → "${companyDescriptions[0]?.slice(0, 80)}..."`);
  }, 60000);

  // ── 3. Score with effort:'low' vs effort:'high' ──

  it('compares score results at effort:low vs effort:high', async () => {
    const items = extractedCompanies
      .slice(0, 6)
      .map((c) => `${c.name} (${c.industry}, ${c.headquarters_country})`);

    const lowScores = await score(items, 'technological innovation and R&D investment', {
      onProgress: captureProgress,
      operation: 'score-low',
      effort: 'low',
      temperature: 0,
    });

    const highScores = await score(items, 'technological innovation and R&D investment', {
      onProgress: captureProgress,
      operation: 'score-high',
      effort: 'high',
      temperature: 0,
    });

    expect(lowScores).toHaveLength(items.length);
    expect(highScores).toHaveLength(items.length);

    // Both should produce numeric scores
    const lowDefined = lowScores.filter((s) => s !== undefined);
    const highDefined = highScores.filter((s) => s !== undefined);
    expect(lowDefined.length).toBeGreaterThanOrEqual(items.length - 1);
    expect(highDefined.length).toBeGreaterThanOrEqual(items.length - 1);

    console.error('\n  Score comparison (innovation potential):');
    for (let i = 0; i < items.length; i++) {
      console.error(
        `    ${items[i].padEnd(55)} low=${lowScores[i]?.toFixed?.(1) ?? '?'}  high=${highScores[i]?.toFixed?.(1) ?? '?'}`
      );
    }

    // High effort uses more iterations/larger extreme windows, so scores may differ
    // but both should have similar ordering for clear cases
  }, 90000);

  // ── 4. Filter with strictness levels ──

  it('filters companies by criterion at different strictness levels', async () => {
    const items = extractedCompanies.map(
      (c) =>
        `${c.name} — ${c.industry}, ${c.headquarters_country}, $${c.revenue_usd_billions}B revenue`
    );

    const loosely = await filter(
      items,
      'Keep only companies that are primarily technology or digital services companies',
      {
        onProgress: captureProgress,
        operation: 'filter-loose',
        strictness: 'low',
      }
    );

    const strictly = await filter(
      items,
      'Keep only companies that are primarily technology or digital services companies',
      {
        onProgress: captureProgress,
        operation: 'filter-strict',
        strictness: 'high',
      }
    );

    // Loose filter should keep at least as many as strict
    expect(loosely.length).toBeGreaterThanOrEqual(strictly.length);

    console.error('\n  Filter comparison (tech companies):');
    console.error(
      `    strictness:low  → ${loosely.length} kept: ${loosely.map((s) => s.split(' — ')[0]).join(', ')}`
    );
    console.error(
      `    strictness:high → ${strictly.length} kept: ${strictly.map((s) => s.split(' — ')[0]).join(', ')}`
    );
  }, 60000);

  // ── 5. Sort with custom criteria ──

  it('sorts companies by geopolitical influence', async () => {
    const items = extractedCompanies
      .slice(0, 8)
      .map(
        (c) => `${c.name} (${c.industry}, ${c.headquarters_country}, $${c.revenue_usd_billions}B)`
      );

    const sorted = await sort(
      items,
      'geopolitical influence and strategic importance to their home country',
      {
        onProgress: captureProgress,
        operation: 'geopolitical-sort',
        effort: 'med',
      }
    );

    expect(sorted).toHaveLength(items.length);

    // Should contain exactly the same items, just reordered
    const inputSet = new Set(items);
    const outputSet = new Set(sorted);
    expect(outputSet.size).toBe(inputSet.size);
    for (const item of sorted) {
      expect(inputSet.has(item)).toBe(true);
    }

    console.error('\n  Sort by geopolitical influence:');
    sorted.forEach((item, i) => console.error(`    ${i + 1}. ${item}`));
  }, 60000);

  // ── 6. Map chain with errorPosture:'strict' and maxParallel:1 ──

  it('map chain with strict errorPosture and sequential processing', async () => {
    const items = extractedCompanies.slice(0, 4).map((c) => c.name);

    const results = await map(
      items,
      'Classify this company into exactly one of: Energy, Technology, Retail, Finance, Healthcare, Automotive, Conglomerate, Other',
      {
        onProgress: captureProgress,
        operation: 'classify-companies',
        maxParallel: 1,
        errorPosture: 'strict',
        temperature: 0,
      }
    );

    expect(results).toHaveLength(items.length);
    for (const r of results) {
      expect(r).toBeTruthy();
    }

    console.error('\n  Map (classify, sequential, strict):');
    items.forEach((name, i) => console.error(`    ${name} → ${results[i]}`));
  }, 45000);

  // ── 7. Tiled cross-page comparison via vision ──

  it('compares revenue vs employer rankings via tiled vision', async () => {
    const result = await analyzeImage(
      [
        { path: screenshots.table, label: 'Largest by Revenue' },
        { path: screenshots.employers, label: 'Largest Employers' },
      ],
      'Compare these two Wikipedia ranking lists. What companies appear in both? What are the key differences in what these lists measure? What surprising insights emerge from comparing revenue size vs employee count?',
      {
        onProgress: captureProgress,
        operation: 'revenue-vs-employers',
        tile: true,
        response_format: comparisonSchema,
        temperature: 0.2,
      }
    );

    expect(result.similarities).toBeDefined();
    expect(result.differences).toBeDefined();
    expect(result.overlapping_companies).toBeDefined();
    expect(result.insight).toBeTruthy();

    console.error('\n  Revenue vs Employers comparison:');
    console.error(`    Overlapping: ${result.overlapping_companies.join(', ')}`);
    console.error(`    Key differences: ${result.differences.slice(0, 2).join('; ')}`);
    console.error(`    Insight: ${result.insight.slice(0, 120)}...`);
  }, 45000);

  // ── 8. Vision with systemPrompt persona ──

  it('analyzes market cap page with financial analyst persona', async () => {
    const result = await analyzeImage(
      screenshots.marketCap,
      'Analyze this Wikipedia page. What are the top companies by market capitalization? What sectors dominate? Are there any notable absences or surprises?',
      {
        onProgress: captureProgress,
        operation: 'analyst-marketcap',
        systemPrompt:
          'You are a senior equity analyst at a global investment bank. Provide precise, data-driven observations. Focus on sector concentration, geographic distribution, and valuation implications.',
        temperature: 0.1,
      }
    );

    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(100);

    console.error('\n  Financial analyst on market cap:');
    console.error(`    ${result.slice(0, 200)}...`);
  }, 45000);

  // ── 9. Temperature experiment: creative vs analytical on same image ──

  it('compares creative vs analytical temperature on the same screenshot', async () => {
    const imageData = await imageToBase64(screenshots.top);
    const prompt = buildVisionPrompt(
      'What story does this Wikipedia page tell about the global economy? What patterns or tensions does it reveal?',
      [imageData]
    );

    const analytical = await callLlm(prompt, {
      onProgress: captureProgress,
      operation: 'temp-analytical',
      temperature: 0,
      systemPrompt: 'You are a data analyst. Be precise and factual.',
    });

    const creative = await callLlm(prompt, {
      onProgress: captureProgress,
      operation: 'temp-creative',
      temperature: 1.0,
      systemPrompt: 'You are a storyteller who finds narratives in data. Be vivid and insightful.',
    });

    expect(analytical).toBeTruthy();
    expect(creative).toBeTruthy();
    // Both should be substantive
    expect(analytical.length).toBeGreaterThan(50);
    expect(creative.length).toBeGreaterThan(50);

    console.error('\n  Temperature comparison on economy page:');
    console.error(`    Analytical (t=0): "${analytical.slice(0, 150)}..."`);
    console.error(`    Creative (t=1):   "${creative.slice(0, 150)}..."`);
  }, 45000);

  // ── 10. Three-page tiled overview with labels ──

  it('provides holistic overview from three different ranking pages tiled', async () => {
    const result = await analyzeImage(
      [
        { path: screenshots.table, label: 'Revenue Rankings' },
        { path: screenshots.employers, label: 'Employee Rankings' },
        { path: screenshots.marketCap, label: 'Market Cap Rankings' },
      ],
      "These three images show different ways of ranking the world's largest companies: by revenue, by employee count, and by market capitalization. Synthesize a brief analysis of what these three lenses together reveal about corporate power in the modern economy.",
      {
        onProgress: captureProgress,
        operation: 'three-lens',
        tile: true,
        temperature: 0.4,
      }
    );

    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(100);

    console.error('\n  Three-lens corporate power analysis:');
    console.error(`    ${result.slice(0, 250)}...`);
  }, 45000);

  // ── 11. Tiled analysis emits tile event with composite path ──

  it('emits tile event with composite file path for consumer capture', async () => {
    const events = [];

    const analysis = await analyzeImage(
      [
        {
          path: screenshots.table,
          label: 'Revenue Table',
          url: 'https://en.wikipedia.org/wiki/List_of_largest_companies_by_revenue',
        },
        {
          path: screenshots.employers,
          label: 'Largest Employers',
          url: 'https://en.wikipedia.org/wiki/List_of_largest_employers',
        },
      ],
      'Compare these two Wikipedia pages briefly.',
      {
        onProgress: (e) => {
          captureProgress(e);
          events.push(e);
        },
        operation: 'tile-demo',
        tile: true,
      }
    );

    const tileEvents = events.filter((e) => e.event === 'tile');
    expect(tileEvents).toHaveLength(1);

    const tile = tileEvents[0];
    expect(tile.path).toBeDefined();
    expect(tile.width).toBeGreaterThan(0);
    expect(tile.height).toBeGreaterThan(0);
    expect(existsSync(tile.path)).toBe(true);

    console.error('\n  Tile event:');
    console.error(`    path: ${path.basename(tile.path)} (${tile.width}x${tile.height})`);

    expect(analysis).toBeDefined();
  }, 30000);

  // ── 12. Cumulative telemetry audit ──

  it('performs cumulative telemetry audit', () => {
    console.error('\n\n════════════════════════════════════════');
    console.error('  CUMULATIVE TELEMETRY AUDIT');
    console.error('════════════════════════════════════════\n');

    const byEvent = {};
    const byOperation = {};
    const byStep = {};
    for (const e of allEvents) {
      const ek = `${e.kind}:${e.event}`;
      byEvent[ek] = (byEvent[ek] || 0) + 1;
      const ok = e.operation || '(none)';
      byOperation[ok] = (byOperation[ok] || 0) + 1;
      byStep[e.step] = (byStep[e.step] || 0) + 1;
    }

    console.error(`  Total events: ${allEvents.length}`);

    console.error('\n  By event type:');
    for (const [k, v] of Object.entries(byEvent).sort()) console.error(`    ${k}: ${v}`);

    console.error('\n  By operation path:');
    for (const [k, v] of Object.entries(byOperation).sort()) console.error(`    ${k}: ${v}`);

    console.error('\n  By step:');
    for (const [k, v] of Object.entries(byStep).sort()) console.error(`    ${k}: ${v}`);

    // Token accounting
    const llmCalls = allEvents.filter((e) => e.event === 'llm:call' && e.status === 'success');
    const totalTokens = llmCalls.reduce((s, e) => s + (e.tokens?.total || 0), 0);
    const totalInput = llmCalls.reduce((s, e) => s + (e.tokens?.input || 0), 0);
    const totalOutput = llmCalls.reduce((s, e) => s + (e.tokens?.output || 0), 0);
    const totalDuration = llmCalls.reduce((s, e) => s + (e.duration || 0), 0);

    console.error(`\n  LLM calls: ${llmCalls.length}`);
    console.error(`  Tokens: ${totalInput} in + ${totalOutput} out = ${totalTokens} total`);
    console.error(`  Total LLM duration: ${(totalDuration / 1000).toFixed(1)}s`);

    // Duration breakdown by operation
    console.error('\n  Duration by operation:');
    const durByOp = {};
    for (const e of llmCalls) {
      const op = e.operation || '(none)';
      durByOp[op] = (durByOp[op] || 0) + e.duration;
    }
    for (const [k, v] of Object.entries(durByOp).sort((a, b) => b[1] - a[1])) {
      console.error(`    ${k}: ${(v / 1000).toFixed(1)}s`);
    }

    // Check for malformed events
    const malformed = allEvents.filter((e) => !e.timestamp || !e.kind || !e.step);
    if (malformed.length > 0) {
      console.error('\n  WARNING: Malformed events:');
      for (const e of malformed) console.error(`    ${JSON.stringify(e)}`);
    }
    expect(malformed).toHaveLength(0);

    // Check for events with empty operation
    const emptyOp = allEvents.filter((e) => !e.operation);
    if (emptyOp.length > 0) {
      console.error(`\n  WARNING: ${emptyOp.length} events with empty operation:`);
      for (const e of emptyOp) console.error(`    ${e.kind}:${e.event} step=${e.step}`);
    }

    // Verify we exercised many different operation paths
    const ops = new Set(allEvents.map((e) => e.operation).filter(Boolean));
    console.error(`\n  Unique operations: ${ops.size}`);
    expect(ops.size).toBeGreaterThanOrEqual(15);

    // Verify chains we exercised
    const chainStarts = allEvents.filter((e) => e.event === 'chain:start').map((e) => e.operation);
    console.error(`\n  Chain starts: ${chainStarts.join(', ')}`);

    // Verify hierarchical composition: vision chains compose analyze-image/llm
    expect(ops.has('analyze-image')).toBe(true);
    expect(ops.has('analyze-image/llm')).toBe(true);

    // Score chain composes scale:spec/llm inside score
    expect(ops.has('score-low/score')).toBe(true);
    expect(ops.has('score-low/score/scale:spec/llm')).toBe(true);

    // Temperature experiment composes directly
    expect(ops.has('temp-analytical/llm')).toBe(true);
    expect(ops.has('temp-creative/llm')).toBe(true);
  });
});

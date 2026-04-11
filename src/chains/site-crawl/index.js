import * as playwrightCore from 'playwright-core';
import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { createTempDir } from '../../lib/temp-files/index.js';
import { resizeImage, mapImageShrink } from '../../lib/image-utils/index.js';
import { isBrowserEnabled } from '../web-scrape/state.js';
import extractPage from './extractor.js';
import createFrontier from './frontier.js';
import {
  DEFAULT_COOLDOWN,
  defaultIsBlocked,
  visitWithCooldown,
  createHeartbeat,
} from './cooldown.js';

export { setBrowserEnabled } from '../web-scrape/state.js';

const name = 'site-crawl';

const DISABLED_MESSAGE = 'Browser support is disabled. Call init({ browser: true }) to enable.';

/**
 * Build a compact summary of what's been discovered so far,
 * suitable for LLM context.
 */
const buildDiscoverySummary = (pages, frontier) => {
  const stats = frontier.summary();
  const paths = pages.map((p) => {
    const url = new URL(p.url);
    return `${url.pathname} — ${p.meta.title || '(no title)'} [${p.links.length} links, ${p.forms.length} forms, ${p.buttons.length} buttons]`;
  });

  return [
    `Crawled ${stats.visited} pages, ${stats.pending} pending, ${stats.skipped} skipped.`,
    '',
    'Pages visited:',
    ...paths.map((p) => `  ${p}`),
  ].join('\n');
};

/**
 * Build the LLM gate prompt — asks the model which URL branches to explore.
 */
const buildGatePrompt = (candidateGroups, summary, budget) => {
  const groupLines = [];
  for (const [prefix, entries] of candidateGroups) {
    const urls = entries.slice(0, 5).map((e) => `    ${e.url}`);
    const more = entries.length > 5 ? `    ... and ${entries.length - 5} more` : '';
    groupLines.push(`  ${prefix} (${entries.length} URLs):`);
    groupLines.push(...urls);
    if (more) groupLines.push(more);
  }

  return [
    'You are a site crawler deciding which URL branches to explore next.',
    `Budget remaining: ${budget} pages.`,
    '',
    'Discovery so far:',
    summary,
    '',
    'Candidate URL groups (grouped by path prefix):',
    ...groupLines,
    '',
    'For each group, decide: "explore" (visit URLs from this group) or "skip" (diminishing returns).',
    'Prefer to explore groups that reveal different parts of the application: new features, forms, settings, distinct page types.',
    'Skip groups that are likely repetitive (e.g. many similar detail pages when we already visited one).',
    'Skip groups that are clearly non-functional (help/support, legal, marketing pages).',
  ].join('\n');
};

const gateResponseFormat = jsonSchema('crawl_gate', {
  type: 'object',
  properties: {
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          prefix: { type: 'string', description: 'The path prefix group' },
          action: {
            type: 'string',
            enum: ['explore', 'skip'],
            description: 'Whether to explore or skip this group',
          },
          reason: { type: 'string', description: 'Brief reason for the decision' },
          maxFromGroup: {
            type: 'integer',
            description: 'If exploring, how many URLs from this group to visit (1-5)',
          },
        },
        required: ['prefix', 'action', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['decisions'],
  additionalProperties: false,
});

/**
 * Ask the LLM which branches to explore.
 * Returns { explore: url[], skip: url[], decisions: [] }
 */
const consultGate = async (frontier, pages, budget, config) => {
  const groups = frontier.pendingByPrefix(2);
  if (groups.size === 0) return { explore: [], skip: [], decisions: [] };

  const summary = buildDiscoverySummary(pages, frontier);
  const prompt = buildGatePrompt(groups, summary, budget);

  const result = await callLlm(prompt, {
    ...config,
    responseFormat: gateResponseFormat,
    temperature: 0.2,
  });

  const decisions = result?.decisions || [];
  const explore = [];
  const skip = [];

  for (const decision of decisions) {
    const group = groups.get(decision.prefix);
    if (!group) continue;

    if (decision.action === 'skip') {
      skip.push(...group.map((e) => e.url));
    } else {
      const limit = Math.min(decision.maxFromGroup || 3, 5, group.length);
      explore.push(...group.slice(0, limit).map((e) => e.url));
      // Skip the rest of the group beyond the limit
      if (group.length > limit) {
        skip.push(...group.slice(limit).map((e) => e.url));
      }
    }
  }

  // Any groups not mentioned by LLM — explore conservatively (1 URL each)
  for (const [prefix, group] of groups) {
    const mentioned = decisions.some((d) => d.prefix === prefix);
    if (!mentioned) {
      explore.push(group[0].url);
      if (group.length > 1) {
        skip.push(...group.slice(1).map((e) => e.url));
      }
    }
  }

  return { explore, skip, decisions };
};

/**
 * Visit a single page: navigate, wait, extract, capture network, optionally screenshot.
 */
const visitPage = async (page, url, networkCapture, screenshotDir, opts, _emitter) => {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Brief settle time for JS-rendered content
  await page.waitForTimeout(1500);

  const pageData = await extractPage(page);

  // Screenshot if enabled
  if (opts.screenshots) {
    const rawPath = `${screenshotDir.dir}/crawl-${Date.now()}.png`;
    await page.screenshot({ path: rawPath, fullPage: false });
    screenshotDir.track(rawPath);

    if (opts.imageShrink) {
      const result = await resizeImage(rawPath, {
        ...opts.imageShrink,
        outputDir: screenshotDir.dir,
      });
      screenshotDir.track(result.path);
      pageData.screenshot = result.path;
    } else {
      pageData.screenshot = rawPath;
    }
  }

  // Snapshot network calls since last visit
  const reqs = networkCapture.responses();
  pageData.apis = reqs
    .filter((r) => {
      const u = r.url();
      return (
        u.includes('/api/') || u.includes('/v1/') || u.includes('/v2/') || u.includes('/graphql')
      );
    })
    .map((r) => ({
      url: r.url(),
      status: r.status(),
      method: r.request().method(),
    }));
  networkCapture.clear();

  return pageData;
};

/**
 * Build the adjacency graph from collected pages.
 */
const buildGraph = (pages) => {
  const graph = {};
  for (const page of pages) {
    const childUrls = page.links.filter((l) => l.isSameDomain && !l.isAnchor).map((l) => l.href);
    graph[page.url] = [...new Set(childUrls)];
  }
  return graph;
};

/**
 * Collect all unique API endpoints discovered across pages.
 */
const collectApis = (pages) => {
  const apis = new Map();
  for (const page of pages) {
    for (const api of page.apis || []) {
      const key = `${api.method} ${new URL(api.url).pathname}`;
      if (!apis.has(key)) {
        apis.set(key, { ...api, seenOn: [page.url] });
      } else {
        apis.get(key).seenOn.push(page.url);
      }
    }
  }
  return [...apis.values()];
};

/**
 * Crawl a site starting from the given URL.
 *
 * @param {string} startUrl - URL to begin crawling from
 * @param {object} [config={}] - Chain config
 * @param {Function} [config.setup] - Browser setup callback (login): async (page) => void
 * @param {Function} [config.teardown] - Browser teardown: async (page) => void
 * @param {boolean} [config.headless] - Headless browser mode (default: true)
 * @param {string} [config.browserEngine] - 'chromium' | 'firefox' | 'webkit'
 * @param {object} [config.launchOptions] - Extra browser launch options
 * @param {object} [config.contextOptions] - Extra browser context options
 * @param {number} [config.maxPages] - Maximum pages to visit (default: 20)
 * @param {number} [config.maxDepth] - Maximum link depth from start (default: 5)
 * @param {boolean} [config.sameDomain] - Only crawl same domain (default: true)
 * @param {number} [config.gateInterval] - Consult LLM every N pages (default: 5)
 * @param {boolean} [config.screenshots] - Capture screenshots (default: false)
 * @param {string} [config.imageShrink] - Shrink preset for screenshots
 * @param {string} [config.llm] - LLM config for the gate decisions
 * @param {object} [config.cooldown] - Cooldown config (baseDelay, maxDelay, backoffFactor, maxRetries, jitter)
 * @param {number} [config.heartbeatInterval] - ms between heartbeat ticks (default: 1000)
 * @param {Function} [config.isBlocked] - Custom block detector: async (page) => reason|falsy
 * @returns {Promise<object>} Crawl result with pages, graph, apis
 */
const siteCrawl = async (startUrl, config = {}) => {
  if (!isBrowserEnabled()) throw new Error(DISABLED_MESSAGE);

  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  const opts = await getOptions(runConfig, {
    maxPages: 20,
    maxDepth: 5,
    sameDomain: true,
    gateInterval: 5,
    headless: true,
    screenshots: false,
    errorPosture: ErrorPosture.resilient,
    imageShrink: withPolicy(mapImageShrink),
    heartbeatInterval: 1000,
  });

  const cooldownOpts = { ...DEFAULT_COOLDOWN, ...runConfig.cooldown };
  const isBlocked = runConfig.isBlocked || defaultIsBlocked;

  const frontier = createFrontier(startUrl, {
    sameDomain: opts.sameDomain,
    maxDepth: opts.maxDepth,
  });

  const screenshotDir = await createTempDir('site-crawl', runConfig.outputDir);
  const engine = runConfig.browserEngine
    ? playwrightCore[runConfig.browserEngine]
    : playwrightCore.chromium;
  const browser = await engine.launch({
    headless: opts.headless,
    ...runConfig.launchOptions,
  });
  emitter.emit({ event: 'browser', headless: opts.headless });

  try {
    const context = await browser.newContext(runConfig.contextOptions);

    // Setup (login, cookie consent, etc.)
    if (runConfig.setup) {
      const setupPage = await context.newPage();
      await runConfig.setup(setupPage);
      await setupPage.close();
      emitter.emit({ event: 'setup' });
    }

    const page = await context.newPage();

    // Start network capture for API discovery
    const networkCapture = (() => {
      const resps = [];
      page.on('response', (resp) => resps.push(resp));
      return {
        responses: () => [...resps],
        clear: () => {
          resps.length = 0;
        },
      };
    })();

    const pages = [];
    let gateCallCount = 0;
    let currentUrl = startUrl;

    // Heartbeat — periodic state snapshot so consumers know we're alive
    const heartbeat = createHeartbeat(emitter, opts.heartbeatInterval, () => ({
      pagesVisited: pages.length,
      maxPages: opts.maxPages,
      pending: frontier.size(),
      currentUrl,
      ...frontier.summary(),
    }));

    try {
      // Main crawl loop
      while (!frontier.isEmpty() && pages.length < opts.maxPages) {
        // LLM gate check — periodically prune the frontier
        if (pages.length > 0 && pages.length % opts.gateInterval === 0 && frontier.size() > 0) {
          const budget = opts.maxPages - pages.length;
          emitter.emit({ event: 'gate:start', pending: frontier.size(), budget });

          const gateResult = await consultGate(frontier, pages, budget, runConfig);
          gateCallCount++;

          if (gateResult.skip.length > 0) {
            frontier.skip(gateResult.skip, 'llm-gate');
          }

          emitter.emit({
            event: 'gate:complete',
            explored: gateResult.explore.length,
            skipped: gateResult.skip.length,
            decisions: gateResult.decisions.length,
          });
        }

        const entry = frontier.next();
        if (!entry) break;

        currentUrl = entry.url;

        emitter.emit({
          event: 'page:start',
          url: entry.url,
          depth: entry.depth,
          pageNumber: pages.length + 1,
          maxPages: opts.maxPages,
        });

        try {
          const visitFn = (pg, u) => visitPage(pg, u, networkCapture, screenshotDir, opts, emitter);
          const { pageData, blocked } = await visitWithCooldown(
            visitFn,
            page,
            entry.url,
            emitter,
            cooldownOpts,
            isBlocked,
            opts.heartbeatInterval
          );

          pageData.depth = entry.depth;
          pageData.source = entry.source;
          if (blocked) pageData.blocked = blocked;
          pages.push(pageData);

          // Discover new URLs from this page's links (skip if page was blocked)
          const added = blocked
            ? 0
            : frontier.addLinks(
                pageData.links.filter((l) => l.isSameDomain && !l.isAnchor),
                entry.depth,
                entry.url
              );

          emitter.emit({
            event: 'page:complete',
            url: entry.url,
            links: pageData.links.length,
            forms: pageData.forms.length,
            newUrls: added,
            pending: frontier.size(),
            blocked,
          });
        } catch (err) {
          emitter.emit({ event: 'page:error', url: entry.url, error: err.message });
          if (opts.errorPosture === ErrorPosture.strict) throw err;
        }
      }
    } finally {
      heartbeat.stop();
    }

    await page.close();

    // Teardown
    if (runConfig.teardown) {
      try {
        const teardownPage = await context.newPage();
        await runConfig.teardown(teardownPage);
        await teardownPage.close();
      } catch {
        /* best-effort */
      }
      emitter.emit({ event: 'teardown' });
    }

    await context.close();

    const graph = buildGraph(pages);
    const apis = collectApis(pages);

    const result = {
      pages,
      graph,
      apis,
      frontier: frontier.summary(),
      skipped: frontier.skippedUrls(),
      gateCallCount,
      cleanup: () => screenshotDir.cleanup(),
    };

    emitter.complete({
      outcome: Outcome.success,
      pagesVisited: pages.length,
      apisFound: apis.length,
      gateCallCount,
      ...frontier.summary(),
    });

    return result;
  } catch (err) {
    emitter.error(err, { pagesVisited: 0 });
    throw err;
  } finally {
    await browser.close();
  }
};

export { default as extractPage } from './extractor.js';
export {
  extractLinks,
  extractForms,
  extractButtons,
  extractScripts,
  extractMeta,
  extractStructure,
} from './extractor.js';

export default siteCrawl;

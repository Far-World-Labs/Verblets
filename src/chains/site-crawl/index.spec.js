import { beforeEach, vi, expect } from 'vitest';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('playwright-core', () => {
  const mockPage = () => {
    let urlValue = 'https://example.com';
    return {
      goto: vi.fn(async (url) => {
        urlValue = url;
      }),
      url: vi.fn(() => urlValue),
      title: vi.fn(async () => 'Example Page'),
      screenshot: vi.fn(async () => undefined),
      evaluate: vi.fn(async () => []),
      waitForTimeout: vi.fn(async () => undefined),
      textContent: vi.fn(async () => 'some text'),
      close: vi.fn(async () => undefined),
      on: vi.fn(),
    };
  };

  const pages = [];
  const mockContext = {
    newPage: vi.fn(async () => {
      const p = mockPage();
      pages.push(p);
      return p;
    }),
    close: vi.fn(async () => undefined),
  };

  const mockBrowser = {
    newContext: vi.fn(async () => mockContext),
    close: vi.fn(async () => undefined),
  };

  return {
    chromium: { launch: vi.fn(async () => mockBrowser) },
    __mockBrowser: mockBrowser,
    __mockContext: mockContext,
    __mockPages: pages,
  };
});

vi.mock('../../lib/temp-files/index.js', () => ({
  createTempDir: vi.fn(async () => ({
    dir: '/tmp/verblets-crawl-mock',
    track: vi.fn(),
    paths: vi.fn(() => []),
    cleanup: vi.fn(async () => undefined),
  })),
}));

vi.mock('../../lib/image-utils/index.js', () => ({
  resizeImage: vi.fn(async (path) => ({
    path: `/tmp/resized-${path.split('/').pop()}`,
    width: 300,
    height: 200,
    sizeBytes: 1000,
  })),
  mapImageShrink: (value) =>
    ({
      low: { width: 300, quality: 60, format: 'jpeg' },
      med: { width: 100, quality: 60, format: 'jpeg' },
      high: { width: 50, quality: 60, format: 'jpeg' },
    })[value],
}));

vi.mock('./extractor.js', () => ({
  default: vi.fn(async (page) => {
    const url = page.url();
    const isStart = url === 'https://example.com/' || url === 'https://example.com';
    return {
      url,
      links: isStart
        ? [
            {
              href: 'https://example.com/page-a',
              isSameDomain: true,
              isAnchor: false,
              text: 'Page A',
            },
            {
              href: 'https://example.com/page-b',
              isSameDomain: true,
              isAnchor: false,
              text: 'Page B',
            },
            {
              href: 'https://other.com/external',
              isSameDomain: false,
              isAnchor: false,
              text: 'External',
            },
          ]
        : [],
      forms: [],
      buttons: [],
      scripts: [],
      meta: { title: `Page at ${url}` },
      structure: { headings: [], landmarks: [], dataAttributes: [], globals: {} },
    };
  }),
}));

vi.mock('./cooldown.js', () => ({
  DEFAULT_COOLDOWN: {
    baseDelay: 5000,
    maxDelay: 300000,
    backoffFactor: 2,
    maxRetries: 6,
    jitter: 0.2,
  },
  defaultIsBlocked: vi.fn(async () => undefined),
  visitWithCooldown: vi.fn(async (visitFn, page, url) => ({
    pageData: await visitFn(page, url),
    retries: 0,
    totalCooldownMs: 0,
  })),
  createHeartbeat: vi.fn(() => ({ stop: vi.fn() })),
}));

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(async () => ({
    decisions: [
      { prefix: '/page-a', action: 'explore', reason: 'new area', maxFromGroup: 1 },
      { prefix: '/page-b', action: 'skip', reason: 'not interesting' },
    ],
  })),
  jsonSchema: vi.fn((name, schema) => ({
    type: 'json_schema',
    json_schema: { name, schema },
  })),
}));

import siteCrawl from './index.js';
import { setBrowserEnabled } from '../web-scrape/state.js';
import { chromium, __mockPages } from 'playwright-core';

beforeEach(() => {
  setBrowserEnabled(true);
  __mockPages.length = 0;
  vi.clearAllMocks();
});

const startUrl = 'https://example.com/';

runTable({
  describe: 'site-crawl',
  examples: [
    {
      name: 'throws when browser is not enabled',
      inputs: { url: startUrl, setupMock: () => setBrowserEnabled(false) },
      want: { throws: /Browser support is disabled/ },
    },
    {
      name: 'crawls the start URL and discovers child pages',
      inputs: { url: startUrl, options: { maxPages: 3, gateInterval: 100 } },
      want: { hasFirstPage: true, hasGraph: true, hasApis: true, hasCleanup: true },
    },
    {
      name: 'respects maxPages limit',
      inputs: { url: startUrl, options: { maxPages: 2, gateInterval: 100 } },
      want: { pagesAtMost: 2 },
    },
    {
      name: 'runs setup callback before crawling',
      inputs: { url: startUrl, makeSetup: true, options: { maxPages: 1, gateInterval: 100 } },
      want: { setupCalled: true },
    },
    {
      name: 'runs teardown callback after crawling',
      inputs: { url: startUrl, makeTeardown: true, options: { maxPages: 1, gateInterval: 100 } },
      want: { teardownCalled: true },
    },
    {
      name: 'launches browser with specified engine',
      inputs: { url: startUrl, options: { maxPages: 1, gateInterval: 100 } },
      want: { browserLaunched: true },
    },
    {
      name: 'emits progress events',
      inputs: { url: startUrl, withEvents: true, options: { maxPages: 2, gateInterval: 100 } },
      want: { eventTypes: ['browser', 'page:start', 'page:complete'] },
    },
    {
      name: 'builds adjacency graph from discovered links',
      inputs: { url: startUrl, options: { maxPages: 3, gateInterval: 100 } },
      want: { graphHas: true },
    },
    {
      name: 'reports frontier summary in result',
      inputs: { url: startUrl, options: { maxPages: 3, gateInterval: 100 } },
      want: { frontierShape: true },
    },
    {
      name: 'calls LLM gate when gateInterval is reached',
      inputs: { url: startUrl, options: { maxPages: 3, gateInterval: 1 } },
      want: { llmGateCalled: true },
    },
    {
      name: 'applies LLM gate skip decisions to frontier',
      inputs: { url: startUrl, options: { maxPages: 5, gateInterval: 1 } },
      want: { skippedByGate: true },
    },
    {
      name: 'throws when gate LLM returns malformed shape (no decisions key)',
      inputs: {
        url: startUrl,
        options: { maxPages: 3, gateInterval: 1 },
        setupMock: async () => {
          const callLlm = (await import('../../lib/llm/index.js')).default;
          callLlm.mockResolvedValueOnce({ wrong: 'shape' });
        },
      },
      want: { throws: /expected.*decisions/ },
    },
    {
      name: 'throws when gate LLM returns null',
      inputs: {
        url: startUrl,
        options: { maxPages: 3, gateInterval: 1 },
        setupMock: async () => {
          const callLlm = (await import('../../lib/llm/index.js')).default;
          callLlm.mockResolvedValueOnce(null);
        },
      },
      want: { throws: /expected.*decisions/ },
    },
    {
      name: 'throws when gate LLM returns non-array decisions',
      inputs: {
        url: startUrl,
        options: { maxPages: 3, gateInterval: 1 },
        setupMock: async () => {
          const callLlm = (await import('../../lib/llm/index.js')).default;
          callLlm.mockResolvedValueOnce({ decisions: 'not-array' });
        },
      },
      want: { throws: /expected.*decisions/ },
    },
    {
      name: 'provides cleanup function',
      inputs: { url: startUrl, options: { maxPages: 1, gateInterval: 100 } },
      want: { cleanupCallable: true },
    },
    {
      name: 'starts and stops heartbeat around the crawl loop',
      inputs: { url: startUrl, options: { maxPages: 1, gateInterval: 100 } },
      want: { heartbeatLifecycle: true },
    },
    {
      name: 'passes cooldown config to visitWithCooldown',
      inputs: {
        url: startUrl,
        options: {
          maxPages: 1,
          gateInterval: 100,
          cooldown: { baseDelay: 10000, maxRetries: 3 },
        },
      },
      want: { cooldownConfig: { baseDelay: 10000, maxRetries: 3, backoffFactor: 2 } },
    },
    {
      name: 'passes custom isBlocked to visitWithCooldown',
      inputs: { url: startUrl, makeIsBlocked: true, options: { maxPages: 1, gateInterval: 100 } },
      want: { customIsBlocked: true },
    },
    {
      name: 'emits heartbeat events with progress data',
      inputs: { url: startUrl, withEvents: true, options: { maxPages: 2, gateInterval: 100 } },
      want: { heartbeatState: true },
    },
  ],
  process: async ({ inputs }) => {
    if (inputs.setupMock) await inputs.setupMock();
    const setup = inputs.makeSetup ? vi.fn(async () => undefined) : undefined;
    const teardown = inputs.makeTeardown ? vi.fn(async () => undefined) : undefined;
    const isBlocked = inputs.makeIsBlocked ? vi.fn(async () => undefined) : undefined;
    const events = [];
    const value = await siteCrawl(inputs.url, {
      ...inputs.options,
      ...(setup && { setup }),
      ...(teardown && { teardown }),
      ...(isBlocked && { isBlocked }),
      ...(inputs.withEvents && { onProgress: (e) => events.push(e) }),
    });
    return { ...value, setup, teardown, isBlocked, events };
  },
  expects: async ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if (want.hasFirstPage) {
      expect(result.pages.length).toBeGreaterThanOrEqual(1);
      expect(result.pages[0].url).toBe(startUrl);
    }
    if (want.hasGraph) expect(result.graph).toBeDefined();
    if (want.hasApis) expect(result.apis).toBeDefined();
    if (want.hasCleanup) expect(typeof result.cleanup).toBe('function');
    if (want.pagesAtMost !== undefined) {
      expect(result.pages.length).toBeLessThanOrEqual(want.pagesAtMost);
    }
    if (want.setupCalled) {
      expect(result.setup).toHaveBeenCalledOnce();
      expect(result.setup.mock.calls[0][0]).toHaveProperty('goto');
    }
    if (want.teardownCalled) expect(result.teardown).toHaveBeenCalledOnce();
    if (want.browserLaunched) {
      expect(chromium.launch).toHaveBeenCalledOnce();
      expect(chromium.launch).toHaveBeenCalledWith(expect.objectContaining({ headless: true }));
    }
    if (want.eventTypes) {
      const eventTypes = result.events.map((e) => e.event || e.kind);
      for (const t of want.eventTypes) expect(eventTypes).toContain(t);
    }
    if (want.graphHas) {
      const startLinks = result.graph[startUrl];
      expect(startLinks).toBeDefined();
      expect(startLinks).toContain('https://example.com/page-a');
      expect(startLinks).toContain('https://example.com/page-b');
      expect(startLinks).not.toContain('https://other.com/external');
    }
    if (want.frontierShape) {
      expect(result.frontier).toBeDefined();
      expect(typeof result.frontier.visited).toBe('number');
      expect(typeof result.frontier.pending).toBe('number');
      expect(typeof result.frontier.skipped).toBe('number');
    }
    if (want.llmGateCalled) {
      const callLlm = (await import('../../lib/llm/index.js')).default;
      expect(callLlm).toHaveBeenCalled();
      expect(callLlm.mock.calls[0][0]).toContain('site crawler');
    }
    if (want.skippedByGate) {
      expect(result.skipped.some((s) => s.reason === 'llm-gate')).toBe(true);
      expect(result.gateCallCount).toBeGreaterThanOrEqual(1);
    }
    if (want.cleanupCallable) {
      expect(typeof result.cleanup).toBe('function');
      await result.cleanup();
    }
    if (want.heartbeatLifecycle) {
      const { createHeartbeat } = await import('./cooldown.js');
      expect(createHeartbeat).toHaveBeenCalledOnce();
      const stopFn = createHeartbeat.mock.results[0].value.stop;
      expect(stopFn).toHaveBeenCalledOnce();
    }
    if (want.cooldownConfig) {
      const { visitWithCooldown } = await import('./cooldown.js');
      expect(visitWithCooldown).toHaveBeenCalled();
      const cooldownArg = visitWithCooldown.mock.calls[0][4];
      expect(cooldownArg).toMatchObject(want.cooldownConfig);
    }
    if (want.customIsBlocked) {
      const { visitWithCooldown } = await import('./cooldown.js');
      expect(visitWithCooldown).toHaveBeenCalled();
      expect(visitWithCooldown.mock.calls[0][5]).toBe(result.isBlocked);
    }
    if (want.heartbeatState) {
      const { createHeartbeat } = await import('./cooldown.js');
      const getState = createHeartbeat.mock.calls[0][2];
      const state = getState();
      expect(typeof state.pagesVisited).toBe('number');
      expect(typeof state.pending).toBe('number');
      expect(typeof state.maxPages).toBe('number');
      expect(state.currentUrl).toBeDefined();
    }
  },
});

import { beforeEach, vi, expect } from 'vitest';
import { runTable, throws } from '../../lib/examples-runner/index.js';

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

const examples = [
  {
    name: 'throws when browser is not enabled',
    inputs: {
      url: startUrl,
      preMock: () => setBrowserEnabled(false),
    },
    check: throws(/Browser support is disabled/),
  },
  {
    name: 'crawls the start URL and discovers child pages',
    inputs: { url: startUrl, options: { maxPages: 3, gateInterval: 100 } },
    check: ({ result }) => {
      expect(result.pages.length).toBeGreaterThanOrEqual(1);
      expect(result.pages[0].url).toBe(startUrl);
      expect(result.graph).toBeDefined();
      expect(result.apis).toBeDefined();
      expect(typeof result.cleanup).toBe('function');
    },
  },
  {
    name: 'respects maxPages limit',
    inputs: { url: startUrl, options: { maxPages: 2, gateInterval: 100 } },
    check: ({ result }) => expect(result.pages.length).toBeLessThanOrEqual(2),
  },
  {
    name: 'runs setup callback before crawling',
    inputs: {
      url: startUrl,
      makeSetup: true,
      options: { maxPages: 1, gateInterval: 100 },
    },
    check: ({ result }) => {
      expect(result.setup).toHaveBeenCalledOnce();
      expect(result.setup.mock.calls[0][0]).toHaveProperty('goto');
    },
  },
  {
    name: 'runs teardown callback after crawling',
    inputs: {
      url: startUrl,
      makeTeardown: true,
      options: { maxPages: 1, gateInterval: 100 },
    },
    check: ({ result }) => expect(result.teardown).toHaveBeenCalledOnce(),
  },
  {
    name: 'launches browser with specified engine',
    inputs: { url: startUrl, options: { maxPages: 1, gateInterval: 100 } },
    check: () => {
      expect(chromium.launch).toHaveBeenCalledOnce();
      expect(chromium.launch).toHaveBeenCalledWith(expect.objectContaining({ headless: true }));
    },
  },
  {
    name: 'emits progress events',
    inputs: {
      url: startUrl,
      withEvents: true,
      options: { maxPages: 2, gateInterval: 100 },
    },
    check: ({ result }) => {
      const eventTypes = result.events.map((e) => e.event || e.kind);
      expect(eventTypes).toContain('browser');
      expect(eventTypes).toContain('page:start');
      expect(eventTypes).toContain('page:complete');
    },
  },
  {
    name: 'builds adjacency graph from discovered links',
    inputs: { url: startUrl, options: { maxPages: 3, gateInterval: 100 } },
    check: ({ result }) => {
      const startLinks = result.graph[startUrl];
      expect(startLinks).toBeDefined();
      expect(startLinks).toContain('https://example.com/page-a');
      expect(startLinks).toContain('https://example.com/page-b');
      expect(startLinks).not.toContain('https://other.com/external');
    },
  },
  {
    name: 'reports frontier summary in result',
    inputs: { url: startUrl, options: { maxPages: 3, gateInterval: 100 } },
    check: ({ result }) => {
      expect(result.frontier).toBeDefined();
      expect(typeof result.frontier.visited).toBe('number');
      expect(typeof result.frontier.pending).toBe('number');
      expect(typeof result.frontier.skipped).toBe('number');
    },
  },
  {
    name: 'calls LLM gate when gateInterval is reached',
    inputs: { url: startUrl, options: { maxPages: 3, gateInterval: 1 } },
    check: async () => {
      const callLlm = (await import('../../lib/llm/index.js')).default;
      expect(callLlm).toHaveBeenCalled();
      expect(callLlm.mock.calls[0][0]).toContain('site crawler');
    },
  },
  {
    name: 'applies LLM gate skip decisions to frontier',
    inputs: { url: startUrl, options: { maxPages: 5, gateInterval: 1 } },
    check: ({ result }) => {
      expect(result.skipped.some((s) => s.reason === 'llm-gate')).toBe(true);
      expect(result.gateCallCount).toBeGreaterThanOrEqual(1);
    },
  },
  {
    name: 'throws when gate LLM returns malformed shape (no decisions key)',
    inputs: {
      url: startUrl,
      options: { maxPages: 3, gateInterval: 1 },
      preMock: async () => {
        const callLlm = (await import('../../lib/llm/index.js')).default;
        callLlm.mockResolvedValueOnce({ wrong: 'shape' });
      },
    },
    check: throws(/expected.*decisions/),
  },
  {
    name: 'throws when gate LLM returns null',
    inputs: {
      url: startUrl,
      options: { maxPages: 3, gateInterval: 1 },
      preMock: async () => {
        const callLlm = (await import('../../lib/llm/index.js')).default;
        callLlm.mockResolvedValueOnce(null);
      },
    },
    check: throws(/expected.*decisions/),
  },
  {
    name: 'throws when gate LLM returns non-array decisions',
    inputs: {
      url: startUrl,
      options: { maxPages: 3, gateInterval: 1 },
      preMock: async () => {
        const callLlm = (await import('../../lib/llm/index.js')).default;
        callLlm.mockResolvedValueOnce({ decisions: 'not-array' });
      },
    },
    check: throws(/expected.*decisions/),
  },
  {
    name: 'provides cleanup function',
    inputs: { url: startUrl, options: { maxPages: 1, gateInterval: 100 } },
    check: async ({ result }) => {
      expect(typeof result.cleanup).toBe('function');
      await result.cleanup();
    },
  },
  {
    name: 'starts and stops heartbeat around the crawl loop',
    inputs: { url: startUrl, options: { maxPages: 1, gateInterval: 100 } },
    check: async () => {
      const { createHeartbeat } = await import('./cooldown.js');
      expect(createHeartbeat).toHaveBeenCalledOnce();
      const stopFn = createHeartbeat.mock.results[0].value.stop;
      expect(stopFn).toHaveBeenCalledOnce();
    },
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
    check: async () => {
      const { visitWithCooldown } = await import('./cooldown.js');
      expect(visitWithCooldown).toHaveBeenCalled();
      const cooldownArg = visitWithCooldown.mock.calls[0][4];
      expect(cooldownArg).toMatchObject({
        baseDelay: 10000,
        maxRetries: 3,
        backoffFactor: 2,
      });
    },
  },
  {
    name: 'passes custom isBlocked to visitWithCooldown',
    inputs: {
      url: startUrl,
      makeIsBlocked: true,
      options: { maxPages: 1, gateInterval: 100 },
    },
    check: async ({ result }) => {
      const { visitWithCooldown } = await import('./cooldown.js');
      expect(visitWithCooldown).toHaveBeenCalled();
      expect(visitWithCooldown.mock.calls[0][5]).toBe(result.isBlocked);
    },
  },
  {
    name: 'emits heartbeat events with progress data',
    inputs: {
      url: startUrl,
      withEvents: true,
      options: { maxPages: 2, gateInterval: 100 },
    },
    check: async () => {
      const { createHeartbeat } = await import('./cooldown.js');
      const getState = createHeartbeat.mock.calls[0][2];
      const state = getState();
      expect(typeof state.pagesVisited).toBe('number');
      expect(typeof state.pending).toBe('number');
      expect(typeof state.maxPages).toBe('number');
      expect(state.currentUrl).toBeDefined();
    },
  },
];

runTable({
  describe: 'site-crawl',
  examples,
  process: async ({
    url,
    options,
    preMock,
    makeSetup,
    makeTeardown,
    makeIsBlocked,
    withEvents,
  }) => {
    if (preMock) await preMock();
    const setup = makeSetup ? vi.fn(async () => undefined) : undefined;
    const teardown = makeTeardown ? vi.fn(async () => undefined) : undefined;
    const isBlocked = makeIsBlocked ? vi.fn(async () => undefined) : undefined;
    const events = [];
    const value = await siteCrawl(url, {
      ...options,
      ...(setup && { setup }),
      ...(teardown && { teardown }),
      ...(isBlocked && { isBlocked }),
      ...(withEvents && { onProgress: (e) => events.push(e) }),
    });
    return { ...value, setup, teardown, isBlocked, events };
  },
});

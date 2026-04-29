import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock playwright-core
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
    chromium: {
      launch: vi.fn(async () => mockBrowser),
    },
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

// Mock the extractor — return predictable page data
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

// Mock cooldown — passthrough visitFn, no delays
vi.mock('./cooldown.js', () => ({
  DEFAULT_COOLDOWN: {
    baseDelay: 5000,
    maxDelay: 300000,
    backoffFactor: 2,
    maxRetries: 6,
    jitter: 0.2,
  },
  defaultIsBlocked: vi.fn(async () => undefined),
  visitWithCooldown: vi.fn(
    async (visitFn, page, url, _emitter, _cooldownOpts, _isBlocked, _hbInterval) => {
      const pageData = await visitFn(page, url);
      return { pageData, retries: 0, totalCooldownMs: 0 };
    }
  ),
  createHeartbeat: vi.fn(() => ({ stop: vi.fn() })),
}));

// Mock callLlm for the gate
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

describe('site-crawl', () => {
  beforeEach(() => {
    setBrowserEnabled(true);
    __mockPages.length = 0;
    vi.clearAllMocks();
  });

  it('throws when browser is not enabled', async () => {
    setBrowserEnabled(false);
    await expect(siteCrawl('https://example.com')).rejects.toThrow('Browser support is disabled');
  });

  it('crawls the start URL and discovers child pages', async () => {
    const result = await siteCrawl('https://example.com/', { maxPages: 3, gateInterval: 100 });

    expect(result.pages.length).toBeGreaterThanOrEqual(1);
    expect(result.pages[0].url).toBe('https://example.com/');
    expect(result.graph).toBeDefined();
    expect(result.apis).toBeDefined();
    expect(typeof result.cleanup).toBe('function');
  });

  it('respects maxPages limit', async () => {
    const result = await siteCrawl('https://example.com/', { maxPages: 2, gateInterval: 100 });
    expect(result.pages.length).toBeLessThanOrEqual(2);
  });

  it('runs setup callback before crawling', async () => {
    const setup = vi.fn(async () => undefined);
    await siteCrawl('https://example.com/', { maxPages: 1, setup, gateInterval: 100 });

    expect(setup).toHaveBeenCalledOnce();
    // Setup gets called with a page
    expect(setup.mock.calls[0][0]).toHaveProperty('goto');
  });

  it('runs teardown callback after crawling', async () => {
    const teardown = vi.fn(async () => undefined);
    await siteCrawl('https://example.com/', { maxPages: 1, teardown, gateInterval: 100 });

    expect(teardown).toHaveBeenCalledOnce();
  });

  it('launches browser with specified engine', async () => {
    await siteCrawl('https://example.com/', { maxPages: 1, gateInterval: 100 });

    // Default is chromium
    expect(chromium.launch).toHaveBeenCalledOnce();
    expect(chromium.launch).toHaveBeenCalledWith(expect.objectContaining({ headless: true }));
  });

  it('emits progress events', async () => {
    const events = [];
    await siteCrawl('https://example.com/', {
      maxPages: 2,
      gateInterval: 100,
      onProgress: (event) => events.push(event),
    });

    const eventTypes = events.map((e) => e.event || e.kind);
    expect(eventTypes).toContain('browser');
    expect(eventTypes).toContain('page:start');
    expect(eventTypes).toContain('page:complete');
  });

  it('builds adjacency graph from discovered links', async () => {
    const result = await siteCrawl('https://example.com/', { maxPages: 3, gateInterval: 100 });

    // Start page links to page-a and page-b (same-domain, non-anchor)
    const startLinks = result.graph['https://example.com/'];
    expect(startLinks).toBeDefined();
    expect(startLinks).toContain('https://example.com/page-a');
    expect(startLinks).toContain('https://example.com/page-b');
    // External link should not appear
    expect(startLinks).not.toContain('https://other.com/external');
  });

  it('reports frontier summary in result', async () => {
    const result = await siteCrawl('https://example.com/', { maxPages: 3, gateInterval: 100 });

    expect(result.frontier).toBeDefined();
    expect(typeof result.frontier.visited).toBe('number');
    expect(typeof result.frontier.pending).toBe('number');
    expect(typeof result.frontier.skipped).toBe('number');
  });

  it('calls LLM gate when gateInterval is reached', async () => {
    const callLlm = (await import('../../lib/llm/index.js')).default;

    // gateInterval: 1 means consult after every page
    await siteCrawl('https://example.com/', { maxPages: 3, gateInterval: 1 });

    // Gate should have been called at least once
    expect(callLlm).toHaveBeenCalled();
    expect(callLlm.mock.calls[0][0]).toContain('site crawler');
  });

  it('applies LLM gate skip decisions to frontier', async () => {
    // The mock LLM skips /page-b — so page-b should be in skipped
    const result = await siteCrawl('https://example.com/', { maxPages: 5, gateInterval: 1 });

    // page-b was skipped by LLM gate
    expect(result.skipped.some((s) => s.reason === 'llm-gate')).toBe(true);
    // Gate was called, so there should be some gate decisions
    expect(result.gateCallCount).toBeGreaterThanOrEqual(1);
  });

  it('throws when gate LLM returns malformed shape (no decisions key)', async () => {
    const callLlm = (await import('../../lib/llm/index.js')).default;
    callLlm.mockResolvedValueOnce({ wrong: 'shape' });

    await expect(
      siteCrawl('https://example.com/', { maxPages: 3, gateInterval: 1 })
    ).rejects.toThrow(/expected.*decisions/);
  });

  it('throws when gate LLM returns null', async () => {
    const callLlm = (await import('../../lib/llm/index.js')).default;
    callLlm.mockResolvedValueOnce(null);

    await expect(
      siteCrawl('https://example.com/', { maxPages: 3, gateInterval: 1 })
    ).rejects.toThrow(/expected.*decisions/);
  });

  it('throws when gate LLM returns non-array decisions', async () => {
    const callLlm = (await import('../../lib/llm/index.js')).default;
    callLlm.mockResolvedValueOnce({ decisions: 'not-array' });

    await expect(
      siteCrawl('https://example.com/', { maxPages: 3, gateInterval: 1 })
    ).rejects.toThrow(/expected.*decisions/);
  });

  it('provides cleanup function', async () => {
    const result = await siteCrawl('https://example.com/', { maxPages: 1, gateInterval: 100 });

    expect(typeof result.cleanup).toBe('function');
    await result.cleanup(); // should not throw
  });

  it('starts and stops heartbeat around the crawl loop', async () => {
    const { createHeartbeat } = await import('./cooldown.js');

    await siteCrawl('https://example.com/', { maxPages: 1, gateInterval: 100 });

    expect(createHeartbeat).toHaveBeenCalledOnce();
    // Verify stop was called
    const stopFn = createHeartbeat.mock.results[0].value.stop;
    expect(stopFn).toHaveBeenCalledOnce();
  });

  it('passes cooldown config to visitWithCooldown', async () => {
    const { visitWithCooldown } = await import('./cooldown.js');

    await siteCrawl('https://example.com/', {
      maxPages: 1,
      gateInterval: 100,
      cooldown: { baseDelay: 10000, maxRetries: 3 },
    });

    expect(visitWithCooldown).toHaveBeenCalled();
    const cooldownArg = visitWithCooldown.mock.calls[0][4];
    expect(cooldownArg.baseDelay).toBe(10000);
    expect(cooldownArg.maxRetries).toBe(3);
    // Defaults should be merged in
    expect(cooldownArg.backoffFactor).toBe(2);
  });

  it('passes custom isBlocked to visitWithCooldown', async () => {
    const { visitWithCooldown } = await import('./cooldown.js');
    const customIsBlocked = vi.fn(async () => undefined);

    await siteCrawl('https://example.com/', {
      maxPages: 1,
      gateInterval: 100,
      isBlocked: customIsBlocked,
    });

    expect(visitWithCooldown).toHaveBeenCalled();
    const isBlockedArg = visitWithCooldown.mock.calls[0][5];
    expect(isBlockedArg).toBe(customIsBlocked);
  });

  it('emits heartbeat events with progress data', async () => {
    const events = [];
    await siteCrawl('https://example.com/', {
      maxPages: 2,
      gateInterval: 100,
      onProgress: (event) => events.push(event),
    });

    // Heartbeat event types are emitted by the mock via createHeartbeat
    // We verify the getState callback provides the right shape
    const { createHeartbeat } = await import('./cooldown.js');
    const getState = createHeartbeat.mock.calls[0][2];
    const state = getState();
    expect(typeof state.pagesVisited).toBe('number');
    expect(typeof state.pending).toBe('number');
    expect(typeof state.maxPages).toBe('number');
    expect(state.currentUrl).toBeDefined();
  });
});

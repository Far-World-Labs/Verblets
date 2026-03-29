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
      click: vi.fn(async () => undefined),
      fill: vi.fn(async () => undefined),
      evaluate: vi.fn(async () => undefined),
      waitForTimeout: vi.fn(async () => undefined),
      textContent: vi.fn(async () => 'some text'),
      $$eval: vi.fn(async (_sel, _fn) => ['item 1', 'item 2']),
      close: vi.fn(async () => undefined),
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

vi.mock('../../lib/screenshot-cleanup/index.js', () => ({
  createScreenshotDir: vi.fn(async () => ({
    dir: '/tmp/verblets-scrape-mock',
    track: vi.fn(),
    paths: vi.fn(() => []),
    cleanup: vi.fn(async () => undefined),
  })),
}));

vi.mock('../../lib/image-utils/index.js', () => ({
  resizeImage: vi.fn(async (path, opts) => ({
    path: `/tmp/resized-${path.split('/').pop()}`,
    width: opts.width || 300,
    height: opts.height || 200,
    sizeBytes: 1000,
  })),
  tileImages: vi.fn(async (paths) => ({
    path: '/tmp/tile.jpg',
    width: 800,
    height: 600,
    sizeBytes: 5000,
    tiles: paths.map((p, i) => ({ index: i, x: 0, y: i * 300, w: 400, h: 300 })),
  })),
  mapImageShrink: (value) =>
    ({
      low: { width: 300, quality: 60, format: 'jpeg' },
      med: { width: 100, quality: 60, format: 'jpeg' },
      high: { width: 50, quality: 60, format: 'jpeg' },
    })[value],
}));

import webScrape from './index.js';
import { setBrowserEnabled } from './state.js';
import { chromium, __mockPages } from 'playwright-core';
import { resizeImage, tileImages } from '../../lib/image-utils/index.js';

beforeEach(() => {
  vi.clearAllMocks();
  __mockPages.length = 0;
  setBrowserEnabled(true);
});

describe('web-scrape', () => {
  it('throws when browser is not enabled', async () => {
    setBrowserEnabled(false);
    const step = async () => ({ action: 'done' });
    await expect(webScrape('https://example.com', step)).rejects.toThrow(
      'Browser support is disabled'
    );
  });

  it('processes a single URL with a one-step callback', async () => {
    const step = vi.fn(async (ctx) => {
      expect(ctx.url).toBe('https://example.com');
      expect(ctx.stepNumber).toBe(0);
      expect(ctx.screenshotPath).toBeDefined();
      expect(typeof ctx.query).toBe('function');
      expect(typeof ctx.queryAll).toBe('function');
      expect(typeof ctx.queryJson).toBe('function');
      expect(ctx.page).toBeDefined();
      return { action: 'done', data: { title: 'Example' } };
    });

    const result = await webScrape('https://example.com', step);

    expect(result.url).toBe('https://example.com');
    expect(result.data).toEqual({ title: 'Example' });
    expect(result.steps).toBe(1);
    expect(result.screenshots).toHaveLength(1);
    expect(typeof result.cleanup).toBe('function');
    expect(step).toHaveBeenCalledTimes(1);
  });

  it('returns a single result object for single URL (not array)', async () => {
    const step = async () => ({ action: 'done', data: 'single' });
    const result = await webScrape('https://example.com', step);

    expect(Array.isArray(result)).toBe(false);
    expect(result.data).toBe('single');
  });

  it('returns an array of results for multiple URLs', async () => {
    const step = async (ctx) => ({ action: 'done', data: ctx.url });
    const results = await webScrape(['https://a.com', 'https://b.com'], step);

    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(2);
    expect(results[0].url).toBe('https://a.com');
    expect(results[1].url).toBe('https://b.com');
  });

  it('executes multiple steps in the inner loop', async () => {
    const step = vi.fn(async (ctx) => {
      if (ctx.stepNumber === 0) return { action: 'click', selector: '.btn' };
      if (ctx.stepNumber === 1) return { action: 'scroll', direction: 'down' };
      return { action: 'done', data: 'finished' };
    });

    const result = await webScrape('https://example.com', step);

    expect(step).toHaveBeenCalledTimes(3);
    expect(result.steps).toBe(3);
    expect(result.data).toBe('finished');
    expect(result.screenshots).toHaveLength(3);
  });

  it('passes previousAction to subsequent step calls', async () => {
    const actions = [];
    const step = async (ctx) => {
      actions.push(ctx.previousAction);
      if (ctx.stepNumber === 0) return { action: 'click', selector: '#btn' };
      return { action: 'done' };
    };

    await webScrape('https://example.com', step);

    expect(actions[0]).toBeUndefined();
    expect(actions[1]).toEqual({ action: 'click', selector: '#btn' });
  });

  it('provides working query helpers on step context', async () => {
    const step = async (ctx) => {
      const text = await ctx.query('.title');
      const items = await ctx.queryAll('.item');
      expect(text).toBe('some text');
      expect(items).toEqual(['item 1', 'item 2']);
      return { action: 'done', data: { text, items } };
    };

    const result = await webScrape('https://example.com', step);
    expect(result.data.text).toBe('some text');
  });

  it('accumulator persists across steps', async () => {
    const step = async (ctx) => {
      if (ctx.stepNumber === 0) {
        ctx.accumulator.count = 1;
        return { action: 'wait', ms: 100 };
      }
      ctx.accumulator.count += 1;
      return { action: 'done', data: ctx.accumulator };
    };

    const result = await webScrape('https://example.com', step);
    expect(result.data.count).toBe(2);
  });

  it('caps inner loop at maxSteps', async () => {
    const step = async () => ({ action: 'wait', ms: 10 });
    const result = await webScrape('https://example.com', step, { maxSteps: 3 });

    expect(result.steps).toBe(3);
  });

  it('runs setup callback before URL processing', async () => {
    const order = [];
    const setup = vi.fn(async (page) => {
      order.push('setup');
      await page.goto('https://example.com/login');
    });
    const step = async () => {
      order.push('step');
      return { action: 'done' };
    };

    await webScrape('https://example.com', step, { setup });

    expect(setup).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['setup', 'step']);
  });

  it('runs teardown callback after URL processing', async () => {
    const order = [];
    const teardown = vi.fn(async () => {
      order.push('teardown');
    });
    const step = async () => {
      order.push('step');
      return { action: 'done' };
    };

    await webScrape('https://example.com', step, { teardown });

    expect(teardown).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['step', 'teardown']);
  });

  it('teardown does not throw on error (best-effort)', async () => {
    const teardown = vi.fn(async () => {
      throw new Error('teardown failed');
    });
    const step = async () => ({ action: 'done', data: 'ok' });

    const result = await webScrape('https://example.com', step, { teardown });
    expect(result.data).toBe('ok');
  });

  it('accepts per-URL step overrides', async () => {
    const defaultStep = vi.fn(async () => ({ action: 'done', data: 'default' }));
    const customStep = vi.fn(async () => ({ action: 'done', data: 'custom' }));

    const results = await webScrape(
      [{ url: 'https://a.com', step: customStep }, { url: 'https://b.com' }],
      defaultStep
    );

    expect(results[0].data).toBe('custom');
    expect(results[1].data).toBe('default');
    expect(customStep).toHaveBeenCalledTimes(1);
    expect(defaultStep).toHaveBeenCalledTimes(1);
  });

  it('applies imageShrink to screenshots', async () => {
    const step = async () => ({ action: 'done' });
    await webScrape('https://example.com', step, { imageShrink: 'low' });

    expect(resizeImage).toHaveBeenCalledTimes(1);
    expect(resizeImage).toHaveBeenCalledWith(expect.stringContaining('.png'), {
      width: 300,
      quality: 60,
      format: 'jpeg',
    });
  });

  it('does not resize when imageShrink is not set', async () => {
    const step = async () => ({ action: 'done' });
    await webScrape('https://example.com', step);

    expect(resizeImage).not.toHaveBeenCalled();
  });

  it('tiles screenshots when tile option is true and multiple steps', async () => {
    const step = async (ctx) => {
      if (ctx.stepNumber < 2) return { action: 'wait', ms: 10 };
      return { action: 'done' };
    };

    const result = await webScrape('https://example.com', step, { tile: true });

    expect(tileImages).toHaveBeenCalledTimes(1);
    expect(result.tile).toBe('/tmp/tile.jpg');
  });

  it('does not tile when only one screenshot', async () => {
    const step = async () => ({ action: 'done' });
    const result = await webScrape('https://example.com', step, { tile: true });

    expect(tileImages).not.toHaveBeenCalled();
    expect(result.tile).toBeUndefined();
  });

  it('emits progress events through the full lifecycle', async () => {
    const events = [];
    const step = async (ctx) => {
      if (ctx.stepNumber === 0) return { action: 'click', selector: '.btn' };
      return { action: 'done' };
    };

    await webScrape('https://example.com', step, {
      onProgress: (e) => events.push(e),
    });

    const eventNames = events.map((e) => e.event);
    expect(eventNames).toContain('chain:start');
    expect(eventNames).toContain('browser');
    expect(eventNames).toContain('url:start');
    expect(eventNames).toContain('step');
    expect(eventNames).toContain('url:complete');
    expect(eventNames).toContain('chain:complete');

    const stepEvents = events.filter((e) => e.event === 'step');
    expect(stepEvents).toHaveLength(2);
    expect(stepEvents[0].action).toBe('click');
    expect(stepEvents[1].action).toBe('done');
  });

  it('handles URL errors in resilient mode', async () => {
    const step = async (ctx) => {
      if (ctx.url === 'https://fail.com') throw new Error('page crashed');
      return { action: 'done', data: 'ok' };
    };

    const results = await webScrape(['https://ok.com', 'https://fail.com'], step, {
      errorPosture: 'resilient',
    });

    expect(results[0].data).toBe('ok');
    expect(results[1].error).toBe('page crashed');
    expect(results[1].data).toBeUndefined();
  });

  it('always closes browser even on error', async () => {
    const step = async () => {
      throw new Error('fatal');
    };

    await expect(
      webScrape('https://example.com', step, { errorPosture: 'strict' })
    ).rejects.toThrow('fatal');

    const { chromium: pw } = await import('playwright-core');
    const browser = await pw.launch.mock.results[0].value;
    expect(browser.close).toHaveBeenCalled();
  });

  it('launches browser with headless option', async () => {
    const step = async () => ({ action: 'done' });
    await webScrape('https://example.com', step, { headless: false });

    expect(chromium.launch).toHaveBeenCalledWith({ headless: false });
  });

  it('provides urlIndex on step context (single URL = 0)', async () => {
    let capturedIndex;
    const step = async (ctx) => {
      capturedIndex = ctx.urlIndex;
      return { action: 'done' };
    };

    await webScrape('https://example.com', step);
    expect(capturedIndex).toBe(0);
  });

  it('provides correct urlIndex for each URL in a batch', async () => {
    const indices = [];
    const step = async (ctx) => {
      indices.push(ctx.urlIndex);
      return { action: 'done' };
    };

    await webScrape(['https://a.com', 'https://b.com', 'https://c.com'], step);
    expect(indices).toEqual([0, 1, 2]);
  });

  it('keep: false excludes screenshot from result but steps count unchanged', async () => {
    const step = vi.fn(async (ctx) => {
      if (ctx.stepNumber === 0) return { action: 'click', selector: '.btn', keep: false };
      if (ctx.stepNumber === 1) return { action: 'scroll', direction: 'down', keep: false };
      return { action: 'done', data: 'finished' };
    });

    const result = await webScrape('https://example.com', step);

    expect(result.steps).toBe(3);
    // Only step 2 (done) kept — steps 0 and 1 had keep: false
    expect(result.screenshots).toHaveLength(1);
  });

  it('screenshotFilter filters screenshots by config callback', async () => {
    const step = vi.fn(async (ctx) => {
      if (ctx.stepNumber < 2) return { action: 'wait', ms: 10 };
      return { action: 'done' };
    });

    const result = await webScrape('https://example.com', step, {
      screenshotFilter: ({ stepNumber }) => stepNumber > 0,
    });

    expect(result.steps).toBe(3);
    // Step 0 filtered out, steps 1 and 2 kept
    expect(result.screenshots).toHaveLength(2);
  });

  it('keep and screenshotFilter both must agree (AND logic)', async () => {
    const step = vi.fn(async (ctx) => {
      if (ctx.stepNumber === 0) return { action: 'wait', ms: 10, keep: true };
      if (ctx.stepNumber === 1) return { action: 'wait', ms: 10, keep: false };
      return { action: 'done' };
    });

    const result = await webScrape('https://example.com', step, {
      // Filter keeps all, but action keep: false on step 1 should still exclude it
      screenshotFilter: () => true,
    });

    expect(result.steps).toBe(3);
    // Step 0: keep=true, filter=true → kept
    // Step 1: keep=false, filter=true → excluded
    // Step 2: keep=true (default), filter=true → kept
    expect(result.screenshots).toHaveLength(2);
  });

  it('screenshot filenames include url index and step number', async () => {
    const step = async () => ({ action: 'done' });
    await webScrape('https://example.com', step);

    const page = __mockPages[0];
    const screenshotCall = page.screenshot.mock.calls[0][0];
    expect(screenshotCall.path).toMatch(/url-0-step-0-/);
  });

  it('tiles with labels when tile option is true', async () => {
    const step = async (ctx) => {
      if (ctx.stepNumber < 2) return { action: 'wait', ms: 10 };
      return { action: 'done' };
    };

    await webScrape('https://example.com', step, { tile: true });

    expect(tileImages).toHaveBeenCalledTimes(1);
    expect(tileImages).toHaveBeenCalledWith(expect.any(Array), { labels: ['0.0', '0.1', '0.2'] });
  });

  it('provides captureNetwork as a function on context', async () => {
    let hasCaptureNetwork = false;
    const step = async (ctx) => {
      hasCaptureNetwork = typeof ctx.captureNetwork === 'function';
      return { action: 'done' };
    };

    await webScrape('https://example.com', step);
    expect(hasCaptureNetwork).toBe(true);
  });

  it('passes per-URL data through to ctx.data', async () => {
    let capturedData;
    const step = async (ctx) => {
      capturedData = ctx.data;
      return { action: 'done' };
    };

    await webScrape(
      [{ url: 'https://example.com', data: { token: 'abc123', prefs: { theme: 'dark' } } }],
      step
    );

    expect(capturedData).toEqual({ token: 'abc123', prefs: { theme: 'dark' } });
  });

  it('ctx.data defaults to empty object when entry has no data', async () => {
    let capturedData;
    const step = async (ctx) => {
      capturedData = ctx.data;
      return { action: 'done' };
    };

    await webScrape('https://example.com', step);
    expect(capturedData).toEqual({});
  });

  it('injects localStorage entries before first step', async () => {
    const step = async () => ({ action: 'done' });

    await webScrape(
      [{ url: 'https://example.com', inject: { localStorage: { authToken: 'xyz', lang: 'en' } } }],
      step
    );

    // The work page (index 1: setup=none so index 0 is work page) should have evaluate called
    // for localStorage injection before the step loop
    const workPage = __mockPages[0];
    const evaluateCalls = workPage.evaluate.mock.calls;
    // First evaluate call is the injection
    expect(evaluateCalls.length).toBeGreaterThanOrEqual(1);
    expect(evaluateCalls[0][1]).toEqual({ authToken: 'xyz', lang: 'en' });
  });

  it('skips localStorage injection when inject is not set', async () => {
    const step = async () => ({ action: 'done' });
    await webScrape('https://example.com', step);

    // No evaluate calls for injection on the work page
    const workPage = __mockPages[0];
    // evaluate may be called by step context helpers but not for injection
    // The injection call passes an object as second arg — check none do
    const injectionCalls = workPage.evaluate.mock.calls.filter(
      (call) => call[1] && typeof call[1] === 'object' && !Array.isArray(call[1])
    );
    expect(injectionCalls).toHaveLength(0);
  });

  it('provides localStorage as a function on context', async () => {
    let hasLocalStorage = false;
    const step = async (ctx) => {
      hasLocalStorage = typeof ctx.localStorage === 'function';
      return { action: 'done' };
    };

    await webScrape('https://example.com', step);
    expect(hasLocalStorage).toBe(true);
  });

  it('each URL in batch gets its own data', async () => {
    const captured = [];
    const step = async (ctx) => {
      captured.push(ctx.data);
      return { action: 'done' };
    };

    await webScrape(
      [
        { url: 'https://a.com', data: { id: 1 } },
        { url: 'https://b.com', data: { id: 2 } },
        { url: 'https://c.com' },
      ],
      step
    );

    expect(captured[0]).toEqual({ id: 1 });
    expect(captured[1]).toEqual({ id: 2 });
    expect(captured[2]).toEqual({});
  });

  it('eval action with into stores return value in accumulator', async () => {
    const pages = (await import('playwright-core')).__mockPages;
    pages.length = 0;

    let capturedAccumulator;
    let callCount = 0;
    const step = async (ctx) => {
      callCount++;
      if (callCount === 1) {
        // First step: eval that returns data into accumulator
        return { action: 'eval', fn: () => ({ title: 'Hello', count: 42 }), into: 'extracted' };
      }
      // Second step: check accumulator has the data
      capturedAccumulator = { ...ctx.accumulator };
      return { action: 'done', data: ctx.accumulator };
    };

    // Make evaluate return the function's result
    await (async () => {
      const pw = await import('playwright-core');
      pw.__mockPages.length = 0;
      const r = await webScrape('https://example.com', step);
      // The mock evaluate returns undefined by default — set it up
      return r;
    })();

    // eval was called; the into path stores whatever evaluate returned
    // With mock, evaluate returns undefined, so accumulator.extracted = undefined
    expect(capturedAccumulator).toHaveProperty('extracted');
  });

  it('eval action without into does not modify accumulator', async () => {
    let capturedAccumulator;
    let callCount = 0;
    const step = async (ctx) => {
      callCount++;
      if (callCount === 1) {
        return { action: 'eval', fn: () => 'discarded' };
      }
      capturedAccumulator = { ...ctx.accumulator };
      return { action: 'done' };
    };

    await webScrape('https://example.com', step);
    expect(Object.keys(capturedAccumulator)).toHaveLength(0);
  });

  it('resize action is accepted as valid', async () => {
    const pages = (await import('playwright-core')).__mockPages;
    pages.length = 0;

    // resize calls page.setViewportSize — mock doesn't have it, will throw
    // but we can verify it doesn't fail validation
    const { validateAction } = await import('./actions.js');
    expect(() => validateAction({ action: 'resize', width: 375 })).not.toThrow();
  });
});

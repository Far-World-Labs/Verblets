import { beforeEach, vi, expect } from 'vitest';
import { ErrorPosture, ChainEvent, DomainEvent } from '../../lib/progress/constants.js';
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
      click: vi.fn(async () => undefined),
      fill: vi.fn(async () => undefined),
      evaluate: vi.fn(async () => undefined),
      waitForTimeout: vi.fn(async () => undefined),
      textContent: vi.fn(async () => 'some text'),
      $$eval: vi.fn(async () => ['item 1', 'item 2']),
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
    chromium: { launch: vi.fn(async () => mockBrowser) },
    firefox: { launch: vi.fn(async () => mockBrowser) },
    __mockBrowser: mockBrowser,
    __mockContext: mockContext,
    __mockPages: pages,
  };
});

vi.mock('../../lib/temp-files/index.js', () => ({
  createTempDir: vi.fn(async () => ({
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
import { chromium, firefox, __mockPages } from 'playwright-core';
import { resizeImage, tileImages } from '../../lib/image-utils/index.js';
import { createTempDir } from '../../lib/temp-files/index.js';

beforeEach(() => {
  vi.clearAllMocks();
  __mockPages.length = 0;
  setBrowserEnabled(true);
});

const doneStep = async () => ({ action: 'done' });

// ─── browser-disabled gate ───────────────────────────────────────────────

runTable({
  describe: 'web-scrape — browser disabled',
  examples: [
    {
      name: 'throws when browser is not enabled',
      inputs: { preMock: () => setBrowserEnabled(false) },
      check: throws(/Browser support is disabled/),
    },
  ],
  process: async ({ preMock }) => {
    if (preMock) preMock();
    return webScrape('https://example.com', doneStep);
  },
});

// ─── input validation ────────────────────────────────────────────────────

runTable({
  describe: 'web-scrape — input validation',
  examples: [
    { name: 'throws on null urls', inputs: { args: [null, doneStep] }, check: throws() },
    {
      name: 'throws on undefined urls',
      inputs: { args: [undefined, doneStep] },
      check: throws(),
    },
    {
      name: 'throws on empty array',
      inputs: { args: [[], doneStep] },
      check: throws(/at least one URL/),
    },
    {
      name: 'throws on empty string url',
      inputs: { args: ['', doneStep] },
      check: throws(/non-empty "url"/),
    },
    {
      name: 'throws on object without url field',
      inputs: { args: [[{ step: doneStep }], doneStep] },
      check: throws(/non-empty "url"/),
    },
    {
      name: 'throws on null inside array',
      inputs: { args: [[null, 'https://example.com'], doneStep] },
      check: throws(/string or .* object/),
    },
    {
      name: 'throws on missing step (and no per-URL step)',
      inputs: { args: ['https://example.com'] },
      check: throws(/step must be a function/),
    },
    {
      name: 'throws on non-function step',
      inputs: { args: ['https://example.com', 'not-fn'] },
      check: throws(/step must be a function/),
    },
    {
      name: 'accepts per-URL step without top-level step',
      inputs: { args: [[{ url: 'https://example.com', step: doneStep }]] },
      check: ({ result }) => expect(result).toBeDefined(),
    },
  ],
  process: ({ args }) => webScrape(...args),
});

// ─── core behavior ───────────────────────────────────────────────────────

const coreExamples = [
  {
    name: 'processes a single URL with a one-step callback',
    inputs: {
      makeStep: () =>
        vi.fn(async (ctx) => {
          expect(ctx.url).toBe('https://example.com');
          expect(ctx.stepNumber).toBe(0);
          expect(ctx.screenshotPath).toBeDefined();
          expect(typeof ctx.query).toBe('function');
          expect(typeof ctx.queryAll).toBe('function');
          expect(typeof ctx.queryJson).toBe('function');
          expect(ctx.page).toBeDefined();
          return { action: 'done', data: { title: 'Example' } };
        }),
    },
    check: ({ result }) => {
      expect(result.value).toMatchObject({
        url: 'https://example.com',
        data: { title: 'Example' },
        steps: 1,
      });
      expect(result.value.screenshots).toHaveLength(1);
      expect(typeof result.value.cleanup).toBe('function');
      expect(result.step).toHaveBeenCalledTimes(1);
    },
  },
  {
    name: 'returns a single result object for single URL (not array)',
    inputs: {
      makeStep: () => async () => ({ action: 'done', data: 'single' }),
    },
    check: ({ result }) => {
      expect(Array.isArray(result.value)).toBe(false);
      expect(result.value.data).toBe('single');
    },
  },
  {
    name: 'returns an array of results for multiple URLs',
    inputs: {
      urls: ['https://a.com', 'https://b.com'],
      makeStep: () => async (ctx) => ({ action: 'done', data: ctx.url }),
    },
    check: ({ result }) => {
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value[0].url).toBe('https://a.com');
      expect(result.value[1].url).toBe('https://b.com');
    },
  },
  {
    name: 'executes multiple steps in the inner loop',
    inputs: {
      makeStep: () =>
        vi.fn(async (ctx) => {
          if (ctx.stepNumber === 0) return { action: 'click', selector: '.btn' };
          if (ctx.stepNumber === 1) return { action: 'scroll', direction: 'down' };
          return { action: 'done', data: 'finished' };
        }),
    },
    check: ({ result }) => {
      expect(result.step).toHaveBeenCalledTimes(3);
      expect(result.value.steps).toBe(3);
      expect(result.value.data).toBe('finished');
      expect(result.value.screenshots).toHaveLength(3);
    },
  },
  {
    name: 'passes previousAction to subsequent step calls',
    inputs: {
      makeStep: () => {
        const captured = [];
        const fn = async (ctx) => {
          captured.push(ctx.previousAction);
          if (ctx.stepNumber === 0) return { action: 'click', selector: '#btn' };
          return { action: 'done' };
        };
        fn.captured = captured;
        return fn;
      },
    },
    check: ({ result }) => {
      expect(result.step.captured[0]).toBeUndefined();
      expect(result.step.captured[1]).toEqual({ action: 'click', selector: '#btn' });
    },
  },
  {
    name: 'provides working query helpers on step context',
    inputs: {
      makeStep: () => async (ctx) => {
        const text = await ctx.query('.title');
        const items = await ctx.queryAll('.item');
        expect(text).toBe('some text');
        expect(items).toEqual(['item 1', 'item 2']);
        return { action: 'done', data: { text, items } };
      },
    },
    check: ({ result }) => expect(result.value.data.text).toBe('some text'),
  },
  {
    name: 'accumulator persists across steps',
    inputs: {
      makeStep: () => async (ctx) => {
        if (ctx.stepNumber === 0) {
          ctx.accumulator.count = 1;
          return { action: 'wait', ms: 100 };
        }
        ctx.accumulator.count += 1;
        return { action: 'done', data: ctx.accumulator };
      },
    },
    check: ({ result }) => expect(result.value.data.count).toBe(2),
  },
  {
    name: 'caps inner loop at maxSteps',
    inputs: {
      makeStep: () => async () => ({ action: 'wait', ms: 10 }),
      options: { maxSteps: 3 },
    },
    check: ({ result }) => expect(result.value.steps).toBe(3),
  },
  {
    name: 'runs setup callback before URL processing',
    inputs: {
      makeStep: () => {
        const order = [];
        const fn = async () => {
          order.push('step');
          return { action: 'done' };
        };
        fn.order = order;
        return fn;
      },
      makeOptions: (step) => {
        const setup = vi.fn(async (page) => {
          step.order.push('setup');
          await page.goto('https://example.com/login');
        });
        return { setup, _setup: setup };
      },
    },
    check: ({ result }) => {
      expect(result.options._setup).toHaveBeenCalledTimes(1);
      expect(result.step.order).toEqual(['setup', 'step']);
    },
  },
  {
    name: 'runs teardown callback after URL processing',
    inputs: {
      makeStep: () => {
        const order = [];
        const fn = async () => {
          order.push('step');
          return { action: 'done' };
        };
        fn.order = order;
        return fn;
      },
      makeOptions: (step) => {
        const teardown = vi.fn(async () => {
          step.order.push('teardown');
        });
        return { teardown, _teardown: teardown };
      },
    },
    check: ({ result }) => {
      expect(result.options._teardown).toHaveBeenCalledTimes(1);
      expect(result.step.order).toEqual(['step', 'teardown']);
    },
  },
  {
    name: 'teardown does not throw on error (best-effort)',
    inputs: {
      makeStep: () => async () => ({ action: 'done', data: 'ok' }),
      makeOptions: () => ({
        teardown: vi.fn(async () => {
          throw new Error('teardown failed');
        }),
      }),
    },
    check: ({ result }) => expect(result.value.data).toBe('ok'),
  },
  {
    name: 'accepts per-URL step overrides',
    inputs: {
      multiUrl: true,
      makeStep: () => {
        const defaultStep = vi.fn(async () => ({ action: 'done', data: 'default' }));
        const customStep = vi.fn(async () => ({ action: 'done', data: 'custom' }));
        return Object.assign(defaultStep, { customStep });
      },
      buildArgs: (step) => [
        [{ url: 'https://a.com', step: step.customStep }, { url: 'https://b.com' }],
        step,
      ],
    },
    check: ({ result }) => {
      expect(result.value[0].data).toBe('custom');
      expect(result.value[1].data).toBe('default');
      expect(result.step.customStep).toHaveBeenCalledTimes(1);
      expect(result.step).toHaveBeenCalledTimes(1);
    },
  },
  {
    name: 'applies imageShrink to screenshots',
    inputs: {
      makeStep: () => doneStep,
      options: { imageShrink: 'low' },
    },
    check: () => {
      expect(resizeImage).toHaveBeenCalledTimes(1);
      expect(resizeImage).toHaveBeenCalledWith(expect.stringContaining('.png'), {
        width: 300,
        quality: 60,
        format: 'jpeg',
        outputDir: '/tmp/verblets-scrape-mock',
      });
    },
  },
  {
    name: 'passes outputDir to createTempDir when configured',
    inputs: {
      makeStep: () => doneStep,
      options: { outputDir: '/custom/output' },
    },
    check: () => expect(createTempDir).toHaveBeenCalledWith('web-scrape', '/custom/output'),
  },
  {
    name: 'passes chain name without outputDir by default',
    inputs: { makeStep: () => doneStep },
    check: () => expect(createTempDir).toHaveBeenCalledWith('web-scrape', undefined),
  },
  {
    name: 'does not resize when imageShrink is not set',
    inputs: { makeStep: () => doneStep },
    check: () => expect(resizeImage).not.toHaveBeenCalled(),
  },
  {
    name: 'tiles screenshots when tile option is true and multiple steps',
    inputs: {
      makeStep: () => async (ctx) => {
        if (ctx.stepNumber < 2) return { action: 'wait', ms: 10 };
        return { action: 'done' };
      },
      options: { tile: true },
    },
    check: ({ result }) => {
      expect(tileImages).toHaveBeenCalledTimes(1);
      expect(result.value.tile).toBe('/tmp/tile.jpg');
    },
  },
  {
    name: 'does not tile when only one screenshot',
    inputs: { makeStep: () => doneStep, options: { tile: true } },
    check: ({ result }) => {
      expect(tileImages).not.toHaveBeenCalled();
      expect(result.value.tile).toBeUndefined();
    },
  },
  {
    name: 'emits progress events through the full lifecycle',
    inputs: {
      withEvents: true,
      makeStep: () => async (ctx) => {
        if (ctx.stepNumber === 0) return { action: 'click', selector: '.btn' };
        return { action: 'done' };
      },
    },
    check: ({ result }) => {
      const eventNames = result.events.map((e) => e.event);
      expect(eventNames).toContain(ChainEvent.start);
      expect(eventNames).toContain(DomainEvent.step);
      expect(eventNames).toContain(ChainEvent.complete);
      const stepNames = result.events.filter((e) => e.stepName).map((e) => e.stepName);
      expect(stepNames).toContain('browser');
      expect(stepNames).toContain('url:start');
      expect(stepNames).toContain('url:complete');
      const actionSteps = result.events.filter((e) => e.event === 'step' && e.action);
      expect(actionSteps).toHaveLength(2);
      expect(actionSteps[0].action).toBe('click');
      expect(actionSteps[1].action).toBe('done');
    },
  },
  {
    name: 'handles URL errors in resilient mode',
    inputs: {
      urls: ['https://ok.com', 'https://fail.com'],
      makeStep: () => async (ctx) => {
        if (ctx.url === 'https://fail.com') throw new Error('page crashed');
        return { action: 'done', data: 'ok' };
      },
      options: { errorPosture: ErrorPosture.resilient },
    },
    check: ({ result }) => {
      expect(result.value[0].data).toBe('ok');
      expect(result.value[1].error).toBe('page crashed');
      expect(result.value[1].data).toBeUndefined();
    },
  },
  {
    name: 'always closes browser even on error',
    inputs: {
      makeStep: () => async () => {
        throw new Error('fatal');
      },
      options: { errorPosture: ErrorPosture.strict },
      tolerant: true,
    },
    check: async ({ result }) => {
      expect(result.error?.message).toBe('fatal');
      const { chromium: pw } = await import('playwright-core');
      const browser = await pw.launch.mock.results[0].value;
      expect(browser.close).toHaveBeenCalled();
    },
  },
  {
    name: 'launches browser with headless option',
    inputs: { makeStep: () => doneStep, options: { headless: false } },
    check: () => expect(chromium.launch).toHaveBeenCalledWith({ headless: false }),
  },
  {
    name: 'provides urlIndex on step context (single URL = 0)',
    inputs: {
      makeStep: () => {
        const captured = {};
        const fn = async (ctx) => {
          captured.urlIndex = ctx.urlIndex;
          return { action: 'done' };
        };
        fn.captured = captured;
        return fn;
      },
    },
    check: ({ result }) => expect(result.step.captured.urlIndex).toBe(0),
  },
  {
    name: 'provides correct urlIndex for each URL in a batch',
    inputs: {
      urls: ['https://a.com', 'https://b.com', 'https://c.com'],
      makeStep: () => {
        const indices = [];
        const fn = async (ctx) => {
          indices.push(ctx.urlIndex);
          return { action: 'done' };
        };
        fn.indices = indices;
        return fn;
      },
    },
    check: ({ result }) => expect(result.step.indices).toEqual([0, 1, 2]),
  },
  {
    name: 'keep: false excludes screenshot from result but steps count unchanged',
    inputs: {
      makeStep: () =>
        vi.fn(async (ctx) => {
          if (ctx.stepNumber === 0) return { action: 'click', selector: '.btn', keep: false };
          if (ctx.stepNumber === 1) return { action: 'scroll', direction: 'down', keep: false };
          return { action: 'done', data: 'finished' };
        }),
    },
    check: ({ result }) => {
      expect(result.value.steps).toBe(3);
      expect(result.value.screenshots).toHaveLength(1);
    },
  },
  {
    name: 'screenshotFilter filters screenshots by config callback',
    inputs: {
      makeStep: () =>
        vi.fn(async (ctx) => {
          if (ctx.stepNumber < 2) return { action: 'wait', ms: 10 };
          return { action: 'done' };
        }),
      options: { screenshotFilter: ({ stepNumber }) => stepNumber > 0 },
    },
    check: ({ result }) => {
      expect(result.value.steps).toBe(3);
      expect(result.value.screenshots).toHaveLength(2);
    },
  },
  {
    name: 'keep and screenshotFilter both must agree (AND logic)',
    inputs: {
      makeStep: () =>
        vi.fn(async (ctx) => {
          if (ctx.stepNumber === 0) return { action: 'wait', ms: 10, keep: true };
          if (ctx.stepNumber === 1) return { action: 'wait', ms: 10, keep: false };
          return { action: 'done' };
        }),
      options: { screenshotFilter: () => true },
    },
    check: ({ result }) => {
      expect(result.value.steps).toBe(3);
      expect(result.value.screenshots).toHaveLength(2);
    },
  },
  {
    name: 'screenshot filenames include url index and step number',
    inputs: { makeStep: () => doneStep },
    check: () => {
      const page = __mockPages[0];
      const screenshotCall = page.screenshot.mock.calls[0][0];
      expect(screenshotCall.path).toMatch(/url-0-step-0-/);
    },
  },
  {
    name: 'tiles with labels when tile option is true',
    inputs: {
      makeStep: () => async (ctx) => {
        if (ctx.stepNumber < 2) return { action: 'wait', ms: 10 };
        return { action: 'done' };
      },
      options: { tile: true },
    },
    check: () => {
      expect(tileImages).toHaveBeenCalledTimes(1);
      expect(tileImages).toHaveBeenCalledWith(expect.any(Array), {
        labels: ['0.0', '0.1', '0.2'],
        outputDir: '/tmp/verblets-scrape-mock',
      });
    },
  },
  {
    name: 'provides captureNetwork as a function on context',
    inputs: {
      makeStep: () => {
        const captured = {};
        const fn = async (ctx) => {
          captured.has = typeof ctx.captureNetwork === 'function';
          return { action: 'done' };
        };
        fn.captured = captured;
        return fn;
      },
    },
    check: ({ result }) => expect(result.step.captured.has).toBe(true),
  },
  {
    name: 'passes per-URL data through to ctx.data',
    inputs: {
      makeStep: () => {
        const captured = {};
        const fn = async (ctx) => {
          captured.data = ctx.data;
          return { action: 'done' };
        };
        fn.captured = captured;
        return fn;
      },
      buildArgs: (step) => [
        [
          {
            url: 'https://example.com',
            data: { token: 'abc123', prefs: { theme: 'dark' } },
          },
        ],
        step,
      ],
    },
    check: ({ result }) =>
      expect(result.step.captured.data).toEqual({
        token: 'abc123',
        prefs: { theme: 'dark' },
      }),
  },
  {
    name: 'ctx.data defaults to empty object when entry has no data',
    inputs: {
      makeStep: () => {
        const captured = {};
        const fn = async (ctx) => {
          captured.data = ctx.data;
          return { action: 'done' };
        };
        fn.captured = captured;
        return fn;
      },
    },
    check: ({ result }) => expect(result.step.captured.data).toEqual({}),
  },
  {
    name: 'injects localStorage entries before first step',
    inputs: {
      makeStep: () => doneStep,
      buildArgs: (step) => [
        [
          {
            url: 'https://example.com',
            inject: { localStorage: { authToken: 'xyz', lang: 'en' } },
          },
        ],
        step,
      ],
    },
    check: () => {
      const workPage = __mockPages[0];
      const evaluateCalls = workPage.evaluate.mock.calls;
      expect(evaluateCalls.length).toBeGreaterThanOrEqual(1);
      expect(evaluateCalls[0][1]).toEqual({ authToken: 'xyz', lang: 'en' });
    },
  },
  {
    name: 'skips localStorage injection when inject is not set',
    inputs: { makeStep: () => doneStep },
    check: () => {
      const workPage = __mockPages[0];
      const injectionCalls = workPage.evaluate.mock.calls.filter(
        (call) => call[1] && typeof call[1] === 'object' && !Array.isArray(call[1])
      );
      expect(injectionCalls).toHaveLength(0);
    },
  },
  {
    name: 'provides localStorage as a function on context',
    inputs: {
      makeStep: () => {
        const captured = {};
        const fn = async (ctx) => {
          captured.has = typeof ctx.localStorage === 'function';
          return { action: 'done' };
        };
        fn.captured = captured;
        return fn;
      },
    },
    check: ({ result }) => expect(result.step.captured.has).toBe(true),
  },
  {
    name: 'each URL in batch gets its own data',
    inputs: {
      makeStep: () => {
        const captured = [];
        const fn = async (ctx) => {
          captured.push(ctx.data);
          return { action: 'done' };
        };
        fn.captured = captured;
        return fn;
      },
      buildArgs: (step) => [
        [
          { url: 'https://a.com', data: { id: 1 } },
          { url: 'https://b.com', data: { id: 2 } },
          { url: 'https://c.com' },
        ],
        step,
      ],
    },
    check: ({ result }) => {
      expect(result.step.captured[0]).toEqual({ id: 1 });
      expect(result.step.captured[1]).toEqual({ id: 2 });
      expect(result.step.captured[2]).toEqual({});
    },
  },
  {
    name: 'eval action with into stores return value in accumulator',
    inputs: {
      makeStep: () => {
        const captured = {};
        let callCount = 0;
        const fn = async (ctx) => {
          callCount += 1;
          if (callCount === 1) {
            return {
              action: 'eval',
              fn: () => ({ title: 'Hello', count: 42 }),
              into: 'extracted',
            };
          }
          captured.acc = { ...ctx.accumulator };
          return { action: 'done', data: ctx.accumulator };
        };
        fn.captured = captured;
        return fn;
      },
    },
    check: ({ result }) => expect(result.step.captured.acc).toHaveProperty('extracted'),
  },
  {
    name: 'eval action without into does not modify accumulator',
    inputs: {
      makeStep: () => {
        const captured = {};
        let callCount = 0;
        const fn = async (ctx) => {
          callCount += 1;
          if (callCount === 1) return { action: 'eval', fn: () => 'discarded' };
          captured.acc = { ...ctx.accumulator };
          return { action: 'done' };
        };
        fn.captured = captured;
        return fn;
      },
    },
    check: ({ result }) => expect(Object.keys(result.step.captured.acc)).toHaveLength(0),
  },
  {
    name: 'uses browserEngine config to select browser type',
    inputs: { makeStep: () => doneStep, options: { browserEngine: 'firefox' } },
    check: () => {
      expect(firefox.launch).toHaveBeenCalledTimes(1);
      expect(chromium.launch).not.toHaveBeenCalled();
    },
  },
  {
    name: 'supports async generator step functions',
    inputs: {
      makeStep: () => {
        const captured = [];
        async function* genStep(ctx) {
          captured.push({ step: ctx.stepNumber, url: ctx.url });
          ctx = yield { action: 'click', selector: '.btn' };
          captured.push({ step: ctx.stepNumber, url: ctx.url });
          ctx = yield { action: 'wait', ms: 100 };
          captured.push({ step: ctx.stepNumber });
          yield { action: 'done', data: { total: captured.length } };
        }
        genStep.captured = captured;
        return genStep;
      },
    },
    check: ({ result }) => {
      expect(result.value.steps).toBe(3);
      expect(result.value.data).toEqual({ total: 3 });
      expect(result.step.captured).toEqual([
        { step: 0, url: 'https://example.com' },
        { step: 1, url: 'https://example.com' },
        { step: 2 },
      ]);
      expect(result.value.screenshots).toHaveLength(3);
    },
  },
  {
    name: 'generator can branch on accumulator state',
    inputs: {
      makeStep: () => {
        async function* genStep(ctx) {
          ctx = yield { action: 'eval', fn: () => ({ hasThing: true }), into: 'check' };
          if (ctx.accumulator.check?.hasThing) {
            ctx = yield { action: 'wait', ms: 50 };
          }
          yield {
            action: 'done',
            data: { branched: !!ctx.accumulator.check?.hasThing },
          };
        }
        return genStep;
      },
    },
    check: ({ result }) => {
      expect(result.value.data).toEqual({ branched: false });
      expect(result.value.steps).toBe(2);
    },
  },
  {
    name: 'generator early return produces done action',
    inputs: {
      makeStep: () => {
        // eslint-disable-next-line require-yield
        async function* genStep() {
          return { earlyExit: true };
        }
        return genStep;
      },
    },
    check: ({ result }) => {
      expect(result.value.data).toEqual({ earlyExit: true });
      expect(result.value.steps).toBe(1);
    },
  },
];

runTable({
  describe: 'web-scrape',
  examples: coreExamples,
  process: async ({
    urls = 'https://example.com',
    makeStep,
    makeOptions,
    options,
    buildArgs,
    multiUrl,
    withEvents,
    tolerant,
  }) => {
    const step = makeStep();
    const opts = { ...(options ?? {}), ...(makeOptions?.(step) ?? {}) };
    const events = [];
    if (withEvents) opts.onProgress = (e) => events.push(e);

    const args = buildArgs ? buildArgs(step) : [urls, step, opts];
    if (!buildArgs && Object.keys(opts).length === 0) args.pop();

    let value;
    let error;
    try {
      value = await webScrape(...args);
    } catch (e) {
      if (!tolerant) throw e;
      error = e;
    }
    return { value, error, step, options: opts, events, multiUrl };
  },
});

// ─── resize action validation ────────────────────────────────────────────

runTable({
  describe: 'web-scrape — action validation',
  examples: [
    {
      name: 'resize action is accepted as valid',
      inputs: {},
      check: async () => {
        const { validateAction } = await import('./actions.js');
        expect(() => validateAction({ action: 'resize', width: 375 })).not.toThrow();
      },
    },
  ],
  process: () => undefined,
});

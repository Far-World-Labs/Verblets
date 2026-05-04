import { beforeEach, vi, expect } from 'vitest';
import { ErrorPosture, ChainEvent, DomainEvent } from '../../lib/progress/constants.js';
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

runTable({
  describe: 'web-scrape — browser disabled',
  examples: [
    {
      name: 'throws when browser is not enabled',
      inputs: { setupMock: () => setBrowserEnabled(false) },
      want: { throws: /Browser support is disabled/ },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return webScrape('https://example.com', doneStep);
  },
  expects: ({ error, want }) => {
    if (want.throws) expect(error?.message).toMatch(want.throws);
  },
});

runTable({
  describe: 'web-scrape — input validation',
  examples: [
    { name: 'throws on null urls', inputs: { args: [null, doneStep] }, want: { throws: true } },
    {
      name: 'throws on undefined urls',
      inputs: { args: [undefined, doneStep] },
      want: { throws: true },
    },
    {
      name: 'throws on empty array',
      inputs: { args: [[], doneStep] },
      want: { throws: /at least one URL/ },
    },
    {
      name: 'throws on empty string url',
      inputs: { args: ['', doneStep] },
      want: { throws: /non-empty "url"/ },
    },
    {
      name: 'throws on object without url field',
      inputs: { args: [[{ step: doneStep }], doneStep] },
      want: { throws: /non-empty "url"/ },
    },
    {
      name: 'throws on null inside array',
      inputs: { args: [[null, 'https://example.com'], doneStep] },
      want: { throws: /string or .* object/ },
    },
    {
      name: 'throws on missing step (and no per-URL step)',
      inputs: { args: ['https://example.com'] },
      want: { throws: /step must be a function/ },
    },
    {
      name: 'throws on non-function step',
      inputs: { args: ['https://example.com', 'not-fn'] },
      want: { throws: /step must be a function/ },
    },
    {
      name: 'accepts per-URL step without top-level step',
      inputs: { args: [[{ url: 'https://example.com', step: doneStep }]] },
      want: { defined: true },
    },
  ],
  process: ({ inputs }) => webScrape(...inputs.args),
  expects: ({ result, error, want }) => {
    if (want.throws) {
      if (want.throws === true) expect(error).toBeDefined();
      else expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if (want.defined) expect(result).toBeDefined();
  },
});

runTable({
  describe: 'web-scrape',
  examples: [
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
      want: { singleStep: true },
    },
    {
      name: 'returns a single result object for single URL (not array)',
      inputs: { makeStep: () => async () => ({ action: 'done', data: 'single' }) },
      want: { singleObj: 'single' },
    },
    {
      name: 'returns an array of results for multiple URLs',
      inputs: {
        urls: ['https://a.com', 'https://b.com'],
        makeStep: () => async (ctx) => ({ action: 'done', data: ctx.url }),
      },
      want: { arrayLength: 2, urls: ['https://a.com', 'https://b.com'] },
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
      want: { stepCalls: 3, totalSteps: 3, finalData: 'finished', screenshotsLen: 3 },
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
      want: { previousActions: [undefined, { action: 'click', selector: '#btn' }] },
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
      want: { queriedText: 'some text' },
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
      want: { accCount: 2 },
    },
    {
      name: 'caps inner loop at maxSteps',
      inputs: {
        makeStep: () => async () => ({ action: 'wait', ms: 10 }),
        options: { maxSteps: 3 },
      },
      want: { totalSteps: 3 },
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
      want: { setupCalled: true, order: ['setup', 'step'] },
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
      want: { teardownCalled: true, order: ['step', 'teardown'] },
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
      want: { value: 'ok' },
    },
    {
      name: 'accepts per-URL step overrides',
      inputs: {
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
      want: { perUrlOverride: true },
    },
    {
      name: 'applies imageShrink to screenshots',
      inputs: { makeStep: () => doneStep, options: { imageShrink: 'low' } },
      want: { resizeCallShape: true },
    },
    {
      name: 'passes outputDir to createTempDir when configured',
      inputs: { makeStep: () => doneStep, options: { outputDir: '/custom/output' } },
      want: { tempDirArgs: ['web-scrape', '/custom/output'] },
    },
    {
      name: 'passes chain name without outputDir by default',
      inputs: { makeStep: () => doneStep },
      want: { tempDirArgs: ['web-scrape', undefined] },
    },
    {
      name: 'does not resize when imageShrink is not set',
      inputs: { makeStep: () => doneStep },
      want: { noResize: true },
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
      want: { tilingCalled: true, tilePath: '/tmp/tile.jpg' },
    },
    {
      name: 'does not tile when only one screenshot',
      inputs: { makeStep: () => doneStep, options: { tile: true } },
      want: { noTiling: true, tileUndefined: true },
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
      want: { progressLifecycle: true },
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
      want: { resilientResults: true },
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
      want: { fatalError: 'fatal', browserClosed: true },
    },
    {
      name: 'launches browser with headless option',
      inputs: { makeStep: () => doneStep, options: { headless: false } },
      want: { headlessFalse: true },
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
      want: { urlIndex: 0 },
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
      want: { urlIndices: [0, 1, 2] },
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
      want: { totalSteps: 3, screenshotsLen: 1 },
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
      want: { totalSteps: 3, screenshotsLen: 2 },
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
      want: { totalSteps: 3, screenshotsLen: 2 },
    },
    {
      name: 'screenshot filenames include url index and step number',
      inputs: { makeStep: () => doneStep },
      want: { screenshotPath: /url-0-step-0-/ },
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
      want: { tileLabels: ['0.0', '0.1', '0.2'] },
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
      want: { captureNetworkAvailable: true },
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
      want: { capturedData: { token: 'abc123', prefs: { theme: 'dark' } } },
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
      want: { capturedData: {} },
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
      want: { evaluateArg1: { authToken: 'xyz', lang: 'en' } },
    },
    {
      name: 'skips localStorage injection when inject is not set',
      inputs: { makeStep: () => doneStep },
      want: { noInjection: true },
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
      want: { localStorageAvailable: true },
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
      want: { capturedDataList: [{ id: 1 }, { id: 2 }, {}] },
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
      want: { hasAccProperty: 'extracted' },
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
      want: { accEmpty: true },
    },
    {
      name: 'uses browserEngine config to select browser type',
      inputs: { makeStep: () => doneStep, options: { browserEngine: 'firefox' } },
      want: { firefoxLaunched: true },
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
      want: {
        totalSteps: 3,
        finalData: { total: 3 },
        capturedSteps: [
          { step: 0, url: 'https://example.com' },
          { step: 1, url: 'https://example.com' },
          { step: 2 },
        ],
        screenshotsLen: 3,
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
      want: { finalData: { branched: false }, totalSteps: 2 },
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
      want: { finalData: { earlyExit: true }, totalSteps: 1 },
    },
  ],
  process: async ({ inputs }) => {
    const step = inputs.makeStep();
    const opts = { ...(inputs.options ?? {}), ...(inputs.makeOptions?.(step) ?? {}) };
    const events = [];
    if (inputs.withEvents) opts.onProgress = (e) => events.push(e);

    const args = inputs.buildArgs
      ? inputs.buildArgs(step)
      : [inputs.urls ?? 'https://example.com', step, opts];
    if (!inputs.buildArgs && Object.keys(opts).length === 0) args.pop();

    let value;
    let error;
    try {
      value = await webScrape(...args);
    } catch (e) {
      if (!inputs.tolerant) throw e;
      error = e;
    }
    return { value, error, step, options: opts, events };
  },
  expects: async ({ result, want }) => {
    if (want.singleStep) {
      expect(result.value).toMatchObject({
        url: 'https://example.com',
        data: { title: 'Example' },
        steps: 1,
      });
      expect(result.value.screenshots).toHaveLength(1);
      expect(typeof result.value.cleanup).toBe('function');
      expect(result.step).toHaveBeenCalledTimes(1);
    }
    if (want.singleObj !== undefined) {
      expect(Array.isArray(result.value)).toBe(false);
      expect(result.value.data).toBe(want.singleObj);
    }
    if (want.arrayLength) {
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value).toHaveLength(want.arrayLength);
      want.urls.forEach((u, i) => expect(result.value[i].url).toBe(u));
    }
    if ('stepCalls' in want) expect(result.step).toHaveBeenCalledTimes(want.stepCalls);
    if ('totalSteps' in want) expect(result.value.steps).toBe(want.totalSteps);
    if ('finalData' in want) expect(result.value.data).toEqual(want.finalData);
    if ('screenshotsLen' in want) {
      expect(result.value.screenshots).toHaveLength(want.screenshotsLen);
    }
    if (want.previousActions) {
      expect(result.step.captured[0]).toBeUndefined();
      expect(result.step.captured[1]).toEqual(want.previousActions[1]);
    }
    if (want.queriedText) expect(result.value.data.text).toBe(want.queriedText);
    if (want.accCount !== undefined) expect(result.value.data.count).toBe(want.accCount);
    if (want.setupCalled) {
      expect(result.options._setup).toHaveBeenCalledTimes(1);
      expect(result.step.order).toEqual(want.order);
    }
    if (want.teardownCalled) {
      expect(result.options._teardown).toHaveBeenCalledTimes(1);
      expect(result.step.order).toEqual(want.order);
    }
    if ('value' in want) expect(result.value.data).toBe(want.value);
    if (want.perUrlOverride) {
      expect(result.value[0].data).toBe('custom');
      expect(result.value[1].data).toBe('default');
      expect(result.step.customStep).toHaveBeenCalledTimes(1);
      expect(result.step).toHaveBeenCalledTimes(1);
    }
    if (want.resizeCallShape) {
      expect(resizeImage).toHaveBeenCalledTimes(1);
      expect(resizeImage).toHaveBeenCalledWith(expect.stringContaining('.png'), {
        width: 300,
        quality: 60,
        format: 'jpeg',
        outputDir: '/tmp/verblets-scrape-mock',
      });
    }
    if (want.tempDirArgs) {
      expect(createTempDir).toHaveBeenCalledWith(...want.tempDirArgs);
    }
    if (want.noResize) expect(resizeImage).not.toHaveBeenCalled();
    if (want.tilingCalled) {
      expect(tileImages).toHaveBeenCalledTimes(1);
      expect(result.value.tile).toBe(want.tilePath);
    }
    if (want.noTiling) {
      expect(tileImages).not.toHaveBeenCalled();
      expect(result.value.tile).toBeUndefined();
    }
    if (want.progressLifecycle) {
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
    }
    if (want.resilientResults) {
      expect(result.value[0].data).toBe('ok');
      expect(result.value[1].error).toBe('page crashed');
      expect(result.value[1].data).toBeUndefined();
    }
    if (want.fatalError) {
      expect(result.error?.message).toBe(want.fatalError);
      const { chromium: pw } = await import('playwright-core');
      const browser = await pw.launch.mock.results[0].value;
      expect(browser.close).toHaveBeenCalled();
    }
    if (want.headlessFalse) expect(chromium.launch).toHaveBeenCalledWith({ headless: false });
    if ('urlIndex' in want) expect(result.step.captured.urlIndex).toBe(want.urlIndex);
    if (want.urlIndices) expect(result.step.indices).toEqual(want.urlIndices);
    if (want.screenshotPath) {
      const page = __mockPages[0];
      const screenshotCall = page.screenshot.mock.calls[0][0];
      expect(screenshotCall.path).toMatch(want.screenshotPath);
    }
    if (want.tileLabels) {
      expect(tileImages).toHaveBeenCalledTimes(1);
      expect(tileImages).toHaveBeenCalledWith(expect.any(Array), {
        labels: want.tileLabels,
        outputDir: '/tmp/verblets-scrape-mock',
      });
    }
    if (want.captureNetworkAvailable) expect(result.step.captured.has).toBe(true);
    if (want.localStorageAvailable) expect(result.step.captured.has).toBe(true);
    if (want.capturedData !== undefined) {
      expect(result.step.captured.data).toEqual(want.capturedData);
    }
    if (want.capturedDataList) {
      want.capturedDataList.forEach((d, i) => {
        expect(result.step.captured[i]).toEqual(d);
      });
    }
    if (want.evaluateArg1) {
      const workPage = __mockPages[0];
      const evaluateCalls = workPage.evaluate.mock.calls;
      expect(evaluateCalls.length).toBeGreaterThanOrEqual(1);
      expect(evaluateCalls[0][1]).toEqual(want.evaluateArg1);
    }
    if (want.noInjection) {
      const workPage = __mockPages[0];
      const injectionCalls = workPage.evaluate.mock.calls.filter(
        (call) => call[1] && typeof call[1] === 'object' && !Array.isArray(call[1])
      );
      expect(injectionCalls).toHaveLength(0);
    }
    if (want.hasAccProperty) {
      expect(result.step.captured.acc).toHaveProperty(want.hasAccProperty);
    }
    if (want.accEmpty) expect(Object.keys(result.step.captured.acc)).toHaveLength(0);
    if (want.firefoxLaunched) {
      expect(firefox.launch).toHaveBeenCalledTimes(1);
      expect(chromium.launch).not.toHaveBeenCalled();
    }
    if (want.capturedSteps) expect(result.step.captured).toEqual(want.capturedSteps);
  },
});

runTable({
  describe: 'web-scrape — action validation',
  examples: [
    { name: 'resize action is accepted as valid', inputs: {}, want: { resizeAccepted: true } },
  ],
  process: () => undefined,
  expects: async ({ want }) => {
    if (want.resizeAccepted) {
      const { validateAction } = await import('./actions.js');
      expect(() => validateAction({ action: 'resize', width: 375 })).not.toThrow();
    }
  },
});

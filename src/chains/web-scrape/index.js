import * as playwrightCore from 'playwright-core';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { createTempDir } from '../../lib/temp-files/index.js';
import { resizeImage, tileImages, mapImageShrink } from '../../lib/image-utils/index.js';
import { parallelBatch } from '../../lib/parallel-batch/index.js';
import { isBrowserEnabled } from './state.js';
import { executeAction } from './actions.js';
import { buildStepContext } from './browser-tools.js';

export { setBrowserEnabled } from './state.js';

const name = 'web-scrape';

const DISABLED_MESSAGE = 'Browser support is disabled. Call init({ browser: true }) to enable.';

/**
 * Normalize URL input to array of { url, step? } objects.
 */
const normalizeUrls = (urls) => {
  const list = Array.isArray(urls) ? urls : [urls];
  return list.map((item) => (typeof item === 'string' ? { url: item } : item));
};

/**
 * Shrink a screenshot if imageShrink options are set.
 * Returns the (possibly new) path and emits a resize event.
 */
const maybeShrink = async (rawPath, shrinkOpts, screenshotDir, emitter, url) => {
  if (!shrinkOpts) return rawPath;
  const result = await resizeImage(rawPath, { ...shrinkOpts, outputDir: screenshotDir.dir });
  screenshotDir.track(result.path);
  emitter.emit({
    event: 'resize',
    url,
    path: result.path,
    width: result.width,
    height: result.height,
    sizeBytes: result.sizeBytes,
  });
  return result.path;
};

/**
 * Determine whether a screenshot should be kept in the result.
 * Both the action's `keep` field and the config's `screenshotFilter` must agree.
 */
const shouldKeep = (action, urlIndex, stepNumber, opts, url) => {
  const actionKeep = action.keep !== false;
  const filterKeep = opts.screenshotFilter
    ? opts.screenshotFilter({ urlIndex, stepNumber, action, url })
    : true;
  return actionKeep && filterKeep;
};

/**
 * Process a single URL through the step loop.
 */
const processUrl = async (entry, defaultStep, page, opts, screenshotDir, emitter, urlIndex) => {
  const { url } = entry;
  const stepFn = entry.step || defaultStep;

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Inject localStorage entries before first step
  if (entry.inject?.localStorage) {
    await page.evaluate((items) => {
      for (const [k, v] of Object.entries(items)) {
        window.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); // eslint-disable-line no-undef
      }
    }, entry.inject.localStorage);
  }

  const screenshots = [];
  const labels = [];
  const accumulator = {};
  let previousAction;

  for (let stepNumber = 0; stepNumber < opts.maxSteps; stepNumber++) {
    // Take screenshot
    const rawPath = join(
      screenshotDir.dir,
      `url-${urlIndex}-step-${stepNumber}-${randomUUID().slice(0, 8)}.png`
    );
    await page.screenshot({ path: rawPath, fullPage: false });
    screenshotDir.track(rawPath);
    const screenshotPath = await maybeShrink(
      rawPath,
      opts.imageShrink,
      screenshotDir,
      emitter,
      url
    );

    // Build context and call step
    const ctx = buildStepContext(page, {
      url: page.url(),
      screenshotPath,
      stepNumber,
      urlIndex,
      previousAction,
      accumulator,
      data: entry.data,
    });
    const action = await stepFn(ctx);

    // Keep or discard screenshot based on action.keep and screenshotFilter
    if (shouldKeep(action, urlIndex, stepNumber, opts, url)) {
      screenshots.push(screenshotPath);
      labels.push(`${urlIndex}.${stepNumber}`);
    }

    emitter.emit({ event: 'step', url, stepNumber, action: action.action });

    if (action.action === 'done') {
      return { url, data: action.data, screenshots, labels, steps: stepNumber + 1 };
    }

    const result = await executeAction(page, action);

    // eval action: store return value in accumulator if `into` is set
    if (action.action === 'eval' && action.into) {
      accumulator[action.into] = result;
    }

    previousAction = action;
  }

  // maxSteps exceeded
  return { url, data: accumulator, screenshots, labels, steps: opts.maxSteps };
};

/**
 * Scrape one or more URLs using a step callback to drive page interactions.
 *
 * @param {string|string[]|Array<{url: string, step?: Function}>} urls - URL(s) to scrape
 * @param {Function} step - Step callback: (ctx) => Action
 * @param {object} [config={}] - Chain config
 * @param {Function} [config.setup] - Browser setup callback (login): async (page) => void
 * @param {Function} [config.teardown] - Browser teardown callback (logout): async (page) => void
 * @param {boolean} [config.headless] - Headless browser mode
 * @param {number} [config.maxParallel] - Concurrent pages
 * @param {number} [config.maxSteps] - Inner loop safety cap per URL
 * @param {string} [config.imageShrink] - Shrink preset: 'low' | 'med' | 'high'
 * @param {boolean} [config.tile] - Tile collected screenshots per URL
 * @param {string} [config.errorPosture] - 'strict' | 'resilient'
 * @returns {Promise<object|object[]>} Result per URL (single URL returns one object)
 */
const webScrape = async (urls, step, config = {}) => {
  if (!isBrowserEnabled()) throw new Error(DISABLED_MESSAGE);

  const single = !Array.isArray(urls);
  const urlList = normalizeUrls(urls);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  const opts = await getOptions(runConfig, {
    maxParallel: 1,
    maxSteps: 50,
    tile: false,
    headless: true,
    errorPosture: 'resilient',
    imageShrink: withPolicy(mapImageShrink),
  });

  const screenshotDir = await createTempDir(name, runConfig.outputDir);
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

    // Thread screenshotFilter from config (same pattern as setup/teardown)
    opts.screenshotFilter = runConfig.screenshotFilter;

    // Process URLs
    const batchDone = emitter.batch(urlList.length);
    const results = await parallelBatch(
      urlList,
      async (entry, index) => {
        emitter.emit({ event: 'url:start', url: entry.url, index });
        const page = await context.newPage();
        try {
          const result = await processUrl(entry, step, page, opts, screenshotDir, emitter, index);

          if (opts.tile && result.screenshots.length > 1) {
            const tileResult = await tileImages(result.screenshots, {
              labels: result.labels,
              outputDir: screenshotDir.dir,
            });
            screenshotDir.track(tileResult.path);
            emitter.emit({
              event: 'tile',
              url: entry.url,
              path: tileResult.path,
              width: tileResult.width,
              height: tileResult.height,
            });
            result.tile = tileResult.path;
          }

          emitter.emit({
            event: 'url:complete',
            url: entry.url,
            steps: result.steps,
            screenshotCount: result.screenshots.length,
          });
          batchDone(1);
          return result;
        } catch (err) {
          emitter.emit({ event: 'url:error', url: entry.url, error: err.message });
          if (opts.errorPosture === 'strict') throw err;
          batchDone(1);
          return { url: entry.url, data: undefined, screenshots: [], steps: 0, error: err.message };
        } finally {
          await page.close();
        }
      },
      { maxParallel: opts.maxParallel, errorPosture: opts.errorPosture }
    );

    // Teardown (logout, best-effort)
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

    const successCount = results.filter((r) => !r.error).length;
    const totalSteps = results.reduce((sum, r) => sum + r.steps, 0);
    emitter.complete({ totalUrls: urlList.length, successCount, totalSteps });

    const output = single ? results[0] : results;
    output.cleanup = () => screenshotDir.cleanup();
    return output;
  } catch (err) {
    emitter.error(err, { totalUrls: urlList.length });
    throw err;
  } finally {
    await browser.close();
  }
};

export default webScrape;

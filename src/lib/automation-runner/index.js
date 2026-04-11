/**
 * Automation discovery and invocation.
 *
 * Discovers automations from the XDG-backed registry, validates
 * their shape, and provides a programmatic invocation surface.
 *
 * Before calling run(), the runner loads human-editable templates from
 * a configurable data root and injects them as params.templates.
 * This keeps automations sandboxed — they never touch the filesystem for
 * templates or configuration directly.
 */

import { resolve } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';

import init from '../../init.js';
import { RunContext } from '../run-context/index.js';
import { list, resolve as resolveAutomation, updateStats } from '../automation-registry/index.js';
import { TelemetryEvent, LlmStatus } from '../progress/constants.js';

const DATA_ROOT = () => {
  const xdgData = process.env.XDG_DATA_HOME || resolve(homedir(), '.local', 'share');
  return process.env.VERBLETS_DATA_ROOT || resolve(xdgData, 'verblets', 'automations');
};

/**
 * Load all text files (.md, .txt) from a directory as a key→content map.
 * Keys are filenames without extension.
 */
async function loadTextFiles(dir) {
  const result = {};
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return result;
  }
  for (const entry of entries) {
    if (!entry.endsWith('.md') && !entry.endsWith('.txt')) continue;
    const key = entry.replace(/\.(md|txt)$/, '');
    try {
      result[key] = await readFile(resolve(dir, entry), 'utf-8');
    } catch {
      // skip unreadable
    }
  }
  return result;
}

/**
 * Load all JSON files from a directory as a key→parsed map.
 * Recurses into subdirectories with / as separator.
 */
async function loadJsonFiles(dir, prefix = '') {
  const result = {};
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return result;
  }
  for (const entry of entries) {
    const entryPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await loadJsonFiles(entryPath, `${prefix}${entry.name}/`);
      Object.assign(result, nested);
    } else if (entry.name.endsWith('.json')) {
      const key = `${prefix}${entry.name.replace(/\.json$/, '')}`;
      try {
        result[key] = JSON.parse(await readFile(entryPath, 'utf-8'));
      } catch {
        // skip malformed
      }
    }
  }
  return result;
}

/**
 * Load co-located JS modules from the automation directory.
 * Imports all .js files except index.js, keyed by filename without extension.
 */
async function loadModules(dir) {
  const result = {};
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return result;
  }
  for (const entry of entries) {
    if (!entry.endsWith('.js') || entry === 'index.js') continue;
    const key = entry.replace(/\.js$/, '');
    try {
      result[key] = await import(pathToFileURL(resolve(dir, entry)).href);
    } catch {
      // skip unloadable
    }
  }
  return result;
}

/**
 * Discover valid automations from the registry.
 * @returns {Promise<Array<{ name: string, path: string, registeredAt: string }>>}
 */
export async function discoverAutomations() {
  const entries = await list();
  const automations = [];

  for (const entry of entries) {
    const indexPath = resolve(entry.path, 'index.js');
    try {
      const mod = await import(pathToFileURL(indexPath).href);
      const run = mod.run || mod.default?.run;
      if (typeof run !== 'function') continue;
      automations.push(entry);
    } catch {
      // Registered path invalid or missing — skip
    }
  }

  return automations;
}

/**
 * HTTP status codes that indicate irrecoverable provider errors.
 * Seeing any of these means retrying is pointless — abort the entire run.
 *
 * 400 with specific messages (credit exhaustion, invalid API key) are
 * irrecoverable. Generic 400s are not — they could be a malformed request
 * for one item that doesn't affect others.
 */
const IRRECOVERABLE_PATTERNS = [
  /credit balance is too low/i,
  /invalid.*api.?key/i,
  /authentication/i,
  /account.*deactivated/i,
  /billing/i,
  /quota.*exceeded/i,
  /rate.*limit/i, // 429s should be retried, but persistent ones are irrecoverable
];

const IRRECOVERABLE_STATUS_CODES = new Set([401, 403]);

/**
 * Count consecutive irrecoverable errors. A single 429 is retryable,
 * but N in a row means the provider is rejecting everything.
 */
const CONSECUTIVE_THRESHOLD = 3;

function createOutageDetector(abortController) {
  let consecutiveErrors = 0;

  return function observe(event) {
    // Only watch LLM call telemetry errors
    if (event.event !== TelemetryEvent.llmCall || event.status !== LlmStatus.error) {
      // Successful LLM call resets the counter
      if (event.event === TelemetryEvent.llmCall && event.status === LlmStatus.success) {
        consecutiveErrors = 0;
      }
      return;
    }

    const error = event.error || {};
    const httpStatus = error.httpStatusCode;
    const message = error.message || '';

    // Immediate abort: auth failures, account issues
    if (IRRECOVERABLE_STATUS_CODES.has(httpStatus)) {
      abortController.abort(new Error(`Provider error (${httpStatus}): ${message}`));
      return;
    }

    // Pattern-matched 400s: credit exhaustion, billing, etc.
    if (httpStatus === 400 && IRRECOVERABLE_PATTERNS.some((p) => p.test(message))) {
      abortController.abort(new Error(`Provider error: ${message}`));
      return;
    }

    // Consecutive error accumulation (catches persistent 429s, 500s)
    if (httpStatus === 429 || (httpStatus >= 500 && httpStatus < 600)) {
      consecutiveErrors++;
      if (consecutiveErrors >= CONSECUTIVE_THRESHOLD) {
        abortController.abort(
          new Error(`Provider outage: ${consecutiveErrors} consecutive failures. Last: ${message}`)
        );
      }
    }
  };
}

/**
 * Run an automation by name.
 *
 * Injects outage detection: an onProgress middleware watches LLM telemetry
 * for irrecoverable errors (auth, billing, persistent 429/5xx) and aborts
 * the entire run via AbortController rather than letting retry exhaust.
 *
 * @param {string} name - Automation name (as registered)
 * @param {object} [params={}] - Invocation parameters
 * @param {object} [options={}]
 * @param {string} [options.projectRoot] - Project root for file operations
 * @param {function} [options.onProgress] - External progress listener
 * @param {object} [options.initOptions] - Options passed to init()
 * @returns {Promise<any>} Automation result
 */
export async function runAutomation(name, params = {}, options = {}) {
  const { projectRoot, onProgress, initOptions = {} } = options;

  dotenv.config({ override: true });

  // Outage detection: abort controller + progress middleware
  const abortController = new AbortController();
  const outageDetector = createOutageDetector(abortController);

  const instance = init(initOptions);

  // Inject abort signal into init config so it flows to every LLM call via withConfig
  const initConfig = { ...instance.config, abortSignal: abortController.signal };

  // Wrap external onProgress with outage detection
  const wrappedOnProgress = onProgress
    ? (event) => {
        outageDetector(event);
        onProgress(event);
      }
    : (event) => {
        outageDetector(event);
      };

  const automationDir = await resolveAutomation(name);
  if (!automationDir) {
    throw new Error(
      `Automation '${name}' is not registered. Use automation-registry.register() first.`
    );
  }

  // Load all resources before entering the automation sandbox
  const [templates, sharedTemplates, schemas, modules] = await Promise.all([
    loadTextFiles(resolve(DATA_ROOT(), name)),
    loadTextFiles(resolve(DATA_ROOT(), 'shared')),
    loadJsonFiles(resolve(automationDir, 'schemas')),
    loadModules(automationDir),
  ]);

  const enrichedParams = {
    ...params,
    templates: { ...sharedTemplates, ...templates },
    schemas,
    _modules: modules,
  };

  const ctx = new RunContext(name, {
    automationDir,
    projectRoot: projectRoot || process.cwd(),
    onProgress: wrappedOnProgress,
    initConfig,
    params: enrichedParams,
  });

  const indexPath = resolve(automationDir, 'index.js');
  const mod = await import(pathToFileURL(indexPath).href);
  const run = mod.run || mod.default?.run;

  if (typeof run !== 'function') {
    throw new Error(`Automation '${name}' does not export a run function`);
  }

  const result = await run(ctx, enrichedParams);

  await updateStats(name, {
    lastRun: new Date().toISOString(),
    runCount: (await list()).find((e) => e.name === name)?.runCount + 1 || 1,
  });

  return result;
}

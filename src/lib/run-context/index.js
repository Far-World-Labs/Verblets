/**
 * RunContext — the ctx surface provided to automations.
 *
 * Provides:
 *   ctx.lib.verblets  — full verblets library (isomorphic, browser-safe)
 *   ctx.lib.scripts   — Node.js-dependent utilities (files, exec, mediaEncoding, process)
 *   ctx.lib.emit      — plain progress emitter (start, emit, progress, metrics, measure, complete, error, batch)
 *   ctx.localStorage, ctx.automationStorage, ctx.domainStorage
 *
 * Storage domains backed by XDG_DATA_HOME/verblets-automations/.
 * Registry backed by XDG_CONFIG_HOME/verblets-automations/registry.json.
 *
 * Split criteria:
 *   verblets — useful in automations AND browser UI. No Node.js APIs.
 *   scripts  — useful in automations but requires Node.js (fs, process, child_process).
 *   Exclude  — things that aren't good for libraries (e.g., the harness itself).
 */

import { resolve } from 'node:path';
import { homedir } from 'node:os';

import * as verblets from '../../shared.js';

// Node-only chains and utilities (not in shared.js)
import webScrape from '../../chains/web-scrape/index.js';
import siteCrawl from '../../chains/site-crawl/index.js';
import { tileImages, imageToBase64, resizeImage } from '../../lib/image-utils/index.js';
import { default as createTempDir, resolveOutputDir } from '../../lib/temp-files/index.js';

import createDataStore from './data-store.js';
import createFileOps from './file-ops.js';
import createEmit from './emit.js';
import createExec from './exec.js';
import createMediaEncoding from './media-encoding.js';

/**
 * Resolve XDG base directories.
 * @returns {{ xdgConfig: string, xdgData: string }}
 */
function xdgPaths() {
  const home = homedir();
  const xdgConfig = process.env.XDG_CONFIG_HOME || resolve(home, '.config');
  const xdgData = process.env.XDG_DATA_HOME || resolve(home, '.local', 'share');
  return { xdgConfig, xdgData };
}

export class RunContext {
  /**
   * @param {string} automationName
   * @param {object} options
   * @param {string} [options.automationDir] - Automation code directory (for importing schemas, criteria, etc.)
   * @param {string} [options.projectRoot] - Project root (for file ops relative path resolution)
   * @param {function} [options.onProgress] - External progress listener
   * @param {object} [options.initOptions] - Options passed to init()
   * @param {object} [options.params] - Invocation parameters
   */
  constructor(automationName, options = {}) {
    const { projectRoot, onProgress, initOptions = {}, params = {} } = options;

    // --- XDG-backed storage domains ---
    // VERBLETS_STORAGE_ROOT overrides the entire storage base (for parent apps with their own storage).
    // Otherwise defaults to $XDG_DATA_HOME/verblets-automations.
    const { xdgData } = xdgPaths();
    const appData = process.env.VERBLETS_STORAGE_ROOT || resolve(xdgData, 'verblets-automations');
    const runId = `${automationName}-${new Date().toISOString().replace(/[:.]/g, '-')}`;

    const localStoragePath = resolve(appData, '_runs', runId);
    const automationStoragePath = resolve(appData, automationName, 'automation');
    const domainStoragePath = resolve(appData, 'domain');

    this.localStorage = createDataStore(localStoragePath);
    this.automationStorage = createDataStore(automationStoragePath);
    this.domainStorage = createDataStore(domainStoragePath);

    // Populate reserved localStorage keys
    this._populateLocalStorage(automationName, params);

    // --- ctx.lib ---
    const emit = createEmit(automationName, { onProgress });
    const files = createFileOps(projectRoot || process.cwd());
    const mediaEncoding = createMediaEncoding(this.automationStorage);

    const buildChildContext = (childName, childAutomationDir) =>
      new RunContext(childName, {
        automationDir: childAutomationDir,
        projectRoot,
        onProgress,
        initOptions,
      });

    const exec = createExec({ emit, buildChildContext });

    this.lib = {
      // Isomorphic verblets library — safe for browser + Node
      verblets,

      // Node.js-dependent utilities — automation scripts only
      scripts: {
        files,
        exec,
        mediaEncoding,
        // Node-only chains (browser automation, codebase analysis)
        webScrape,
        siteCrawl,
        // Node-only image utilities
        tileImages,
        imageToBase64,
        resizeImage,
        createTempDir,
        resolveOutputDir,
        process: {
          exit(code = 0) {
            process.exit(code);
          },
        },
      },

      // Plain progress emitter — top-level for convenience
      emit,
    };
  }

  async _populateLocalStorage(name, params) {
    const envKeys = [
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'USE_REDIS_CACHE',
      'VERBLETS_EXAMPLE_BUDGET',
    ];
    const env = {};
    for (const key of envKeys) {
      if (process.env[key] !== undefined) {
        env[key] = key.includes('KEY') ? '(set)' : process.env[key];
      }
    }

    await this.localStorage.setJSON('ENV', env);
    await this.localStorage.setJSON('self', {
      name,
      startedAt: new Date().toISOString(),
      params,
    });
  }
}

export default RunContext;

/**
 * Instance-based initialization entry point.
 *
 * Each call to init() creates an isolated instance with its own ModelService,
 * Redis getter, and config. Returns an object of wrapped functions that
 * inject these services automatically.
 *
 * @param {object} [options]
 * @param {boolean} [options.embed] - Enable local embedding model — GLOBAL, shared across instances
 * @param {boolean} [options.imageProcessing] - Enable image processing via Sharp — GLOBAL, shared across instances
 * @param {boolean} [options.browser] - Enable browser automation via Playwright — GLOBAL, shared across instances
 * @param {object} [options.runtimeProvider] - Provider with get(key) — GLOBAL, shared across instances
 * @param {object} [options.redis] - Pre-configured Redis client instance — per-instance
 * @param {Record<string, any>} [options.modelOverrides] - Per-key global overrides — per-instance ModelService
 * @returns {object} Instance with config, modelService, context, and all wrapped exports
 */
import * as configModule from './lib/config/index.js';
import { validate } from './lib/config/index.js';
import { ModelService } from './services/llm-model/index.js';
import { setEmbedEnabled } from './lib/embed-local/state.js';
import { setImageProcessingEnabled } from './lib/image-utils/state.js';
import { setBrowserEnabled } from './chains/web-scrape/state.js';
import { createContextBuilder, observeApplication, observeProviders } from './lib/context/index.js';
import withConfig from './lib/with-config/index.js';
import * as shared from './shared.js';

export default function init(options = {}) {
  const { embed, imageProcessing, browser, redis, modelOverrides, runtimeProvider } = options;

  const errors = validate();
  if (errors.length > 0) {
    throw new Error(`Config validation failed:\n  ${errors.join('\n  ')}`);
  }

  // Process-level globals — these are not per-instance
  if (runtimeProvider) configModule.setRuntimeProvider(runtimeProvider);
  if (embed) setEmbedEnabled(true);
  if (imageProcessing) setImageProcessingEnabled(true);
  if (browser) setBrowserEnabled(true);

  // Per-instance: fresh ModelService
  const modelService = new ModelService();
  if (modelOverrides) {
    for (const [key, value] of Object.entries(modelOverrides)) {
      modelService.setGlobalOverride(key, value);
    }
  }

  // Per-instance: Redis getter
  const getRedis = redis ? () => Promise.resolve(redis) : undefined;

  const context = createContextBuilder();
  context.setApplication(observeApplication());
  context.setProviders(observeProviders());

  const baseConfig = { modelService, getRedis };

  // Wrap every shared export with config injection
  // Skip keys that shouldn't be wrapped or would collide with return properties
  const SKIP_KEYS = new Set(['init', 'config', 'services']);
  const wrapped = {};
  for (const [key, value] of Object.entries(shared)) {
    if (SKIP_KEYS.has(key)) continue;
    wrapped[key] = withConfig(baseConfig, value);
  }

  return {
    ...wrapped,
    config: baseConfig,
    modelService,
    context,
  };
}

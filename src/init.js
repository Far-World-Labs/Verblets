/**
 * Optional initialization entry point.
 *
 * Consumers can call init() to wire up runtime providers, Redis clients,
 * and model overrides in one place. Safe to call multiple times.
 *
 * @param {object} [options]
 * @param {boolean} [options.embed] - Enable local embedding model (downloads on first use)
 * @param {boolean} [options.imageProcessing] - Enable image processing via Sharp (must be installed)
 * @param {boolean} [options.browser] - Enable browser automation via Playwright (must be installed)
 * @param {object} [options.runtimeProvider] - Provider with get(key) → Promise<value|undefined>
 * @param {object} [options.redis] - Pre-configured Redis client instance
 * @param {Record<string, object>} [options.models] - Custom model definitions to add to the catalog (additive)
 * @param {Array<{ match?: object, use: string }>} [options.rules] - Negotiation rules (full override of defaults). First match wins.
 * @param {Record<string, function>} [options.policy] - Base policy for all LLM calls (per-call policy takes precedence)
 * @returns {{ config: object, modelService: object, context: object }}
 */
import * as config from './lib/config/index.js';
import { validate } from './lib/config/index.js';
import modelService from './services/llm-model/index.js';
import { setBasePolicy } from './lib/llm/index.js';
import { setClient } from './services/redis/index.js';
import { setEmbedEnabled } from './lib/embed-local/state.js';
import { setImageProcessingEnabled } from './lib/image-utils/state.js';
import { setBrowserEnabled } from './chains/web-scrape/state.js';
import { createContextBuilder, observeApplication, observeProviders } from './lib/context/index.js';

export default function init(options = {}) {
  const { embed, imageProcessing, browser, redis, models, rules, policy, runtimeProvider } =
    options;

  const errors = validate();
  if (errors.length > 0) {
    throw new Error(`Config validation failed:\n  ${errors.join('\n  ')}`);
  }

  if (runtimeProvider) config.setRuntimeProvider(runtimeProvider);
  if (embed) setEmbedEnabled(true);
  if (imageProcessing) setImageProcessingEnabled(true);
  if (browser) setBrowserEnabled(true);
  if (redis) setClient(redis);
  if (models) {
    modelService.addModels(models);
  }
  if (rules) {
    modelService.setRules(rules);
  }
  if (policy) {
    setBasePolicy(policy);
  }

  const context = createContextBuilder();
  context.setApplication(observeApplication());
  context.setProviders(observeProviders());

  return { config, modelService, context };
}

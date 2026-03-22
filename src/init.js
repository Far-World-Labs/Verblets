/**
 * Optional initialization entry point.
 *
 * Consumers can call init() to wire up runtime providers, Redis clients,
 * and model overrides in one place. Safe to call multiple times.
 *
 * @param {object} [options]
 * @param {object} [options.runtimeProvider] - Provider with get(key) → Promise<value|undefined>
 * @param {object} [options.redis] - Pre-configured Redis client instance
 * @param {Record<string, any>} [options.modelOverrides] - Per-key global overrides for model service
 * @returns {{ config: object, modelService: object, context: object }}
 */
import * as config from './lib/config/index.js';
import { validate } from './lib/config/index.js';
import modelService from './services/llm-model/index.js';
import { setClient } from './services/redis/index.js';
import { createContextBuilder, observeApplication, observeProviders } from './lib/context/index.js';

export default function init(options = {}) {
  const { redis, modelOverrides, runtimeProvider } = options;

  const errors = validate();
  if (errors.length > 0) {
    throw new Error(`Config validation failed:\n  ${errors.join('\n  ')}`);
  }

  if (runtimeProvider) config.setRuntimeProvider(runtimeProvider);
  if (redis) setClient(redis);
  if (modelOverrides) {
    for (const [key, value] of Object.entries(modelOverrides)) {
      modelService.setGlobalOverride(key, value);
    }
  }

  const context = createContextBuilder();
  context.setApplication(observeApplication());
  context.setProviders(observeProviders());

  return { config, modelService, context };
}

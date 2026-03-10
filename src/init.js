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
 * @returns {{ config: object, modelService: object }}
 */
import * as config from './lib/config/index.js';
import modelService from './services/llm-model/index.js';
import { setClient } from './services/redis/index.js';

export default function init(options = {}) {
  const { redis, modelOverrides, runtimeProvider } = options;

  if (runtimeProvider) config.setRuntimeProvider(runtimeProvider);
  if (redis) setClient(redis);
  if (modelOverrides) {
    for (const [key, value] of Object.entries(modelOverrides)) {
      modelService.setGlobalOverride(key, value);
    }
  }

  return { config, modelService };
}

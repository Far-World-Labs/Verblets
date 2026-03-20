/**
 * Scope config to an operation, enriching evalContext so policy
 * functions can target behavior by operation name.
 *
 * Composes hierarchically: when a chain delegates to another chain,
 * operations compose with `/` (e.g. 'document-shrink/score').
 *
 * @param {string} operation - Operation name (chain directory name, or name:purpose for sub-functions)
 * @param {object} options - The config object to scope
 * @returns {object} New config with enriched evalContext
 */
export function scopeOperation(operation, options) {
  const parent = options.evalContext?.operation;
  const composed = parent ? `${parent}/${operation}` : operation;
  return {
    now: new Date(),
    ...options,
    evalContext: { ...options.evalContext, operation: composed },
  };
}

/**
 * Get a config option, checking the policy channel then direct config then fallback.
 * Handles both sync and async policy functions transparently.
 *
 * Lookup order: policy[name] → config[name] → fallback
 *
 * @param {string} name - Option name
 * @param {object} config - Config object (from scopeOperation)
 * @param {*} fallback - Default value if nothing resolves
 * @returns {Promise<*>} Resolved value
 */
export async function getOption(name, config, fallback) {
  const fn = config.policy?.[name];
  if (typeof fn === 'function') {
    try {
      return (await fn(config.evalContext, { logger: config.logger })) ?? fallback;
    } catch {
      return fallback;
    }
  }

  return config[name] ?? fallback;
}

/**
 * Tag a mapper function as a policy resolver for use in getOptions spec objects.
 * Distinguishes policy entries from plain fallback objects.
 *
 * When override keys are provided, getOptions will automatically resolve each
 * sub-key from config using the mapper's output as fallback:
 *
 *   thoroughness: withPolicy(mapThoroughness, ['queryExpansion', 'llmScoring'])
 *
 * @param {function} fn - Pure mapper: (rawValue) => mappedValue
 * @param {string[]} [overrides] - Sub-keys that consumers can individually override
 * @returns {{ __policy: true, fn: function, overrides?: string[] }}
 */
export const withPolicy = (fn, overrides) => ({
  __policy: true,
  fn,
  ...(overrides ? { overrides } : {}),
});

const isPolicy = (v) => v !== null && typeof v === 'object' && v.__policy === true;

/**
 * Batch-get multiple options from a spec object.
 * Each entry is either a plain fallback (passed to getOption) or a withPolicy() wrapper.
 *
 * When a withPolicy entry has override keys, the mapper result's sub-properties are
 * individually resolvable — the consumer can override any sub-key on config directly.
 * Only the flattened sub-keys appear in the result; the parent key is not included.
 *
 * @param {object} config - Config object (from scopeOperation)
 * @param {object} spec - { name: fallback | withPolicy(mapperFn, overrides?), ... }
 * @returns {Promise<object>} Resolved values keyed by name (+ flattened override keys)
 */
export async function getOptions(config, spec) {
  const result = {};
  for (const [name, entry] of Object.entries(spec)) {
    if (isPolicy(entry)) {
      const raw = await getOption(name, config, undefined);
      const mapped = entry.fn(raw);

      if (entry.overrides) {
        // Resolve each sub-key individually — the parent aggregate stays internal
        for (const key of entry.overrides) {
          result[key] = await getOption(key, config, mapped?.[key]);
        }
      } else {
        result[name] = mapped;
      }
    } else {
      result[name] = await getOption(name, config, entry);
    }
  }
  return result;
}

/**
 * Combined scopeOperation + getOptions in one call.
 * Scopes the config to the named operation, resolves all options from the spec,
 * and returns both the scoped config and resolved values.
 *
 * @param {string} operation - Operation name
 * @param {object} inputConfig - The config object to scope
 * @param {object} [spec] - Option spec (same as getOptions spec). Omit if no options needed.
 * @returns {Promise<{ config: object, ...resolvedOptions }>}
 */
export async function initChain(operation, inputConfig, spec) {
  const config = scopeOperation(operation, inputConfig);
  const options = spec ? await getOptions(config, spec) : {};
  return { config, ...options };
}

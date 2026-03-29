import createProgressEmitter, { traceId, spanId } from '../progress/index.js';
import { DomainEvent, OptionSource } from '../progress/constants.js';

/**
 * Compose a step name onto the operation path and stamp the run time.
 * Pure config enrichment — no side effects. Used both for chain entry
 * points and sub-steps within chains.
 *
 * Generates trace context (OTel-aligned):
 *   traceId      — created on the first nameStep call, propagated to all descendants
 *   spanId       — unique per step, identifies this step's lifecycle
 *   parentSpanId — the spanId of the calling step
 *
 * @param {string} step - Step name to append
 * @param {object} config - Config object with operation path
 * @returns {object} New config with composed operation path, timestamp, and trace context
 */
export function nameStep(step, config) {
  const parent = config.operation;
  const composed = parent ? `${parent}/${step}` : step;
  return {
    ...config,
    operation: composed,
    now: config.now ?? new Date(),
    traceId: config.traceId ?? traceId(),
    parentSpanId: config.spanId,
    spanId: spanId(),
  };
}

/**
 * Get a config option, checking the policy channel then direct config then fallback.
 * Handles both sync and async policy functions transparently.
 *
 * Lookup order: policy[name] → config[name] → fallback
 *
 * Policy functions receive (context) where context contains
 * ambient chain data like `operation` (the hierarchical operation path).
 * Targeting attributes (domain, tenant, plan) are curried into the policy
 * function at definition time — they never appear on config.
 *
 * @param {string} name - Option name
 * @param {object} config - Config object
 * @param {*} fallback - Default value if nothing resolves
 * @returns {Promise<*>} Resolved value
 */
export async function getOption(name, config, fallback) {
  const fn = config.policy?.[name];
  if (typeof fn === 'function') {
    try {
      const context = { operation: config.operation };
      return (await fn(context)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  return config[name] ?? fallback;
}

/**
 * Get a config option with a decision trace detailing how the value was resolved.
 * Same lookup order as getOption: policy[name] → config[name] → fallback.
 *
 * The decision trace is emitted as an `option:resolve` telemetry event
 * so consumers like the option history analyzer can observe it through
 * the normal onProgress stream.
 *
 * @param {string} name - Option name
 * @param {object} config - Config object
 * @param {*} fallback - Default value if nothing resolves
 * @returns {Promise<{ value: *, detail: object }>}
 */
export async function getOptionDetail(name, config, fallback) {
  const detail = {
    option: name,
    operation: config.operation,
  };

  const fn = config.policy?.[name];
  if (typeof fn === 'function') {
    try {
      const context = { operation: config.operation };
      const raw = await fn(context);
      const value = raw ?? fallback;
      detail.source = OptionSource.policy;
      detail.value = value;
      detail.policyReturned = raw;
    } catch (err) {
      detail.source = OptionSource.fallback;
      detail.value = fallback;
      detail.error = err?.message;
    }
  } else if (config[name] !== undefined) {
    detail.source = OptionSource.config;
    detail.value = config[name];
  } else {
    detail.source = OptionSource.fallback;
    detail.value = fallback;
  }

  createProgressEmitter(name, config.onProgress, config).emit({
    event: DomainEvent.optionResolve,
    source: detail.source,
    value: detail.value,
    policyReturned: detail.policyReturned,
    ...(detail.error ? { error: { message: detail.error } } : {}),
  });

  return { value: detail.value, detail };
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

const isPolicy = (v) => typeof v === 'object' && v !== null && v.__policy === true;

/**
 * Batch-get multiple options from a spec object.
 * Each entry is either a plain fallback (passed to getOption) or a withPolicy() wrapper.
 *
 * When a withPolicy entry has override keys, the mapper result's sub-properties are
 * individually resolvable — the consumer can override any sub-key on config directly.
 * Only the flattened sub-keys appear in the result; the parent key is not included.
 *
 * @param {object} config - Config object
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

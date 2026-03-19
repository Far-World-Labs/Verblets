/**
 * Scope config to an operation, enriching evalContext so optionValue/optionAsyncValue
 * functions can target policy by operation name.
 *
 * Composes hierarchically: when a chain delegates to another chain,
 * operations compose with `/` (e.g. 'document-shrink/score').
 *
 * @param {string} operation - Operation name (chain directory name, or name:purpose for sub-functions)
 * @param {object} options - The config object to scope
 * @returns {object} New config with enriched evalContext
 */
export function withOperation(operation, options) {
  const parent = options.evalContext?.operation;
  const composed = parent ? `${parent}/${operation}` : operation;
  return {
    ...options,
    evalContext: { ...options.evalContext, operation: composed },
  };
}

export function resolveOption(name, options, fallback) {
  const fn = options.optionValue?.[name];
  if (typeof fn === 'function') {
    try {
      return fn(options.evalContext, { logger: options.logger }) ?? fallback;
    } catch {
      return fallback;
    }
  }
  return options[name] ?? fallback;
}

export async function resolve(name, options, fallback) {
  const asyncFn = options.optionAsyncValue?.[name];
  if (typeof asyncFn === 'function') {
    try {
      return (await asyncFn(options.evalContext, { logger: options.logger })) ?? fallback;
    } catch {
      return fallback;
    }
  }

  const syncFn = options.optionValue?.[name];
  if (typeof syncFn === 'function') {
    try {
      return syncFn(options.evalContext, { logger: options.logger }) ?? fallback;
    } catch {
      return fallback;
    }
  }

  return options[name] ?? fallback;
}

/**
 * Resolve an option and apply a mapper in one atomic step.
 * The mapper handles undefined → default, so no separate fallback is needed.
 * This is the standard way to resolve intensity-dial and mapped options.
 *
 * @param {string} name - Option name
 * @param {object} options - Config object (from withOperation)
 * @param {function} mapper - Pure function: (rawValue) => mappedValue
 * @returns {Promise<*>} Mapped value
 */
export async function resolveMapped(name, options, mapper) {
  return mapper(await resolve(name, options, undefined));
}

/**
 * Sync variant of resolveMapped for sync chains (dismantle, socratic, etc.).
 *
 * @param {string} name - Option name
 * @param {object} options - Config object (from withOperation)
 * @param {function} mapper - Pure function: (rawValue) => mappedValue
 * @returns {*} Mapped value
 */
export function resolveOptionMapped(name, options, mapper) {
  return mapper(resolveOption(name, options, undefined));
}

/**
 * Tag a mapper function for use in resolveAll spec objects.
 * Distinguishes mapper entries from plain fallback objects.
 *
 * @param {function} fn - Pure mapper: (rawValue) => mappedValue
 * @returns {{ __mapped: true, fn: function }}
 */
export const mapped = (fn) => ({ __mapped: true, fn });

const isMapped = (v) => v !== null && typeof v === 'object' && v.__mapped === true;

/**
 * Batch-resolve multiple options from a spec object.
 * Each entry is either a plain fallback (passed to resolve) or a mapped() wrapper
 * (passed to resolveMapped). Returns an object with the same keys, all resolved.
 *
 * @param {object} config - Config object (from withOperation)
 * @param {object} spec - { name: fallback | mapped(mapperFn), ... }
 * @returns {Promise<object>} Resolved values keyed by name
 */
export async function resolveAll(config, spec) {
  const result = {};
  for (const [name, entry] of Object.entries(spec)) {
    result[name] = isMapped(entry)
      ? await resolveMapped(name, config, entry.fn)
      : await resolve(name, config, entry);
  }
  return result;
}

export async function resolveAsyncOption(name, options, { fallback, timeout } = {}) {
  const fn = options.optionAsyncValue?.[name];
  if (typeof fn !== 'function') return options[name] ?? fallback;

  if (!timeout) {
    return (await fn(options.evalContext, { logger: options.logger })) ?? fallback;
  }

  let timer;
  const result = await Promise.race([
    fn(options.evalContext, { logger: options.logger }),
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`optionAsyncValue "${name}" timed out after ${timeout}ms`)),
        timeout
      );
    }),
  ]);
  clearTimeout(timer);
  return result ?? fallback;
}

import { debug } from '../debug/index.js';

const PREFIX = '[policy]';

/**
 * Evaluate a named policy function with debug tracing.
 *
 * Logs the invocation context, the raw return value, and the final
 * result (after undefined-coalescing with fallback) to stderr when
 * VERBLETS_DEBUG is enabled.
 *
 * @param {string} name - Policy option name
 * @param {function} fn - The policy function: (context, deps) => value
 * @param {{ operation?: string }} context - Evaluation context passed to fn
 * @param {object} deps - Dependencies bag ({ logger }) passed to fn
 * @param {*} [fallback] - Value returned when fn yields undefined
 * @returns {Promise<*>} Resolved policy value
 */
export async function evaluatePolicy(name, fn, context, deps, fallback) {
  debug(PREFIX, 'invoke', name, { operation: context.operation });

  const raw = await fn(context, deps);
  const value = raw ?? fallback;

  debug(PREFIX, 'result', name, {
    operation: context.operation,
    raw,
    fallback,
    value,
  });

  return value;
}

/**
 * Wrap a single policy function so every call is traced.
 *
 * Returns a new async function with the same (context, deps) signature
 * that logs inputs and outputs through the debug module.
 *
 * @param {string} name - Policy option name (used in log lines)
 * @param {function} fn - The policy function to wrap
 * @returns {function} Traced policy function
 */
export function tracePolicy(name, fn) {
  const traced = async (context, deps) => {
    debug(PREFIX, 'invoke', name, { operation: context.operation });

    const result = await fn(context, deps);

    debug(PREFIX, 'result', name, {
      operation: context.operation,
      result,
    });

    return result;
  };
  traced.displayName = `traced(${name})`;
  return traced;
}

/**
 * Wrap every function in a policy map with debug tracing.
 *
 * Non-function entries are preserved as-is. Returns undefined when
 * the input map is falsy (consistent with the project's no-null rule).
 *
 * @param {object} [policyMap] - { optionName: policyFn | staticValue, ... }
 * @returns {object|undefined} New map with traced policy functions
 */
export function tracePolicies(policyMap) {
  if (!policyMap) return undefined;

  const traced = {};
  for (const [name, value] of Object.entries(policyMap)) {
    traced[name] = typeof value === 'function' ? tracePolicy(name, value) : value;
  }

  debug(PREFIX, 'wrapped', Object.keys(traced).length, 'policies', {
    names: Object.keys(traced),
  });

  return traced;
}

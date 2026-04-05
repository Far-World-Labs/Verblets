/**
 * Bind a base config into a function's last-argument config slot.
 *
 * Every chain and verblet follows the convention: the last argument is a
 * plain options/config object.  This wrapper merges `baseConfig` under the
 * caller's config so instance-level services (modelService, getRedis, etc.)
 * flow automatically while per-call overrides still win.
 *
 * Rules:
 *   fn.length === 0  → pass through (variadic / no-arg — extra args would be consumed)
 *   class             → subclass whose constructor merges config
 *   function          → wrapper that merges config into last plain-object arg
 *   non-function      → pass through
 */

const SKIP_PROPS = new Set(['length', 'name', 'prototype', 'caller', 'arguments']);

const isPlainObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);

export default function withConfig(baseConfig, value) {
  if (typeof value !== 'function') return value;
  if (value.length === 0) return value;

  if (/^class\s/.test(value.toString())) {
    const Original = value;
    const Bound = class extends Original {
      constructor(...args) {
        const last = args[args.length - 1];
        if (args.length > 0 && isPlainObject(last)) {
          args[args.length - 1] = { ...baseConfig, ...last };
        } else {
          args.push({ ...baseConfig });
        }
        super(...args);
      }
    };
    Object.defineProperty(Bound, 'name', { value: Original.name });
    return Bound;
  }

  const bound = function (...args) {
    const last = args[args.length - 1];
    if (args.length > 0 && isPlainObject(last)) {
      args[args.length - 1] = { ...baseConfig, ...last };
    } else {
      args.push({ ...baseConfig });
    }
    return value.apply(this, args);
  };
  Object.defineProperty(bound, 'name', { value: value.name });

  // Copy and recursively wrap static methods (e.g. filter.with, sort.with)
  for (const key of Object.getOwnPropertyNames(value)) {
    if (SKIP_PROPS.has(key)) continue;
    const desc = Object.getOwnPropertyDescriptor(value, key);
    if (!desc?.configurable) continue;
    Object.defineProperty(bound, key, {
      ...desc,
      value: typeof value[key] === 'function' ? withConfig(baseConfig, value[key]) : value[key],
    });
  }

  return bound;
}

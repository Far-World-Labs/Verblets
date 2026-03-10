/**
 * Config Provider
 *
 * Synchronous get() for hot paths, async getAsync() for future runtime provider.
 *
 * Precedence (highest → lowest):
 *   1. Force overrides:  env vars prefixed VERBLETS_FORCE_*
 *   2. Runtime provider:  async source (future LD) — only via getAsync()
 *   3. Normal env vars:   via isomorphic env proxy
 *   4. Deprecated aliases: old CHATGPT_* names with one-shot warning
 *   5. Registry defaults:  from ENV_VARS
 */

import { ENV_VARS, CONSTRAINTS, DEPRECATED_VARS } from '../../constants/env-vars.js';
import { env } from '../env/index.js';
import { truthyValues, falsyValues } from '../../constants/common.js';

let runtimeProvider;

// ── Type coercion ────────────────────────────────────────────────────

const coerceBoolean = (raw) => {
  if (typeof raw === 'boolean') return raw;
  const str = String(raw);
  if (truthyValues.includes(str)) return true;
  if (falsyValues.includes(str)) return false;
  return undefined;
};

const coerceNumber = (raw) => {
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
};

const coerce = {
  string: String,
  number: coerceNumber,
  boolean: coerceBoolean,
};

// ── Deprecation ─────────────────────────────────────────────────────

// Reverse map: canonical name → old deprecated name
const canonicalToDeprecated = Object.fromEntries(
  Object.entries(DEPRECATED_VARS).map(([old, canonical]) => [canonical, old])
);

const warned = new Set();

function warnDeprecated(oldName, canonicalName) {
  if (warned.has(oldName)) return;
  warned.add(oldName);
  console.warn(`[verblets] env var "${oldName}" is deprecated — use "${canonicalName}" instead.`);
}

// ── Sync get ─────────────────────────────────────────────────────────

export function get(key) {
  const spec = ENV_VARS[key];
  const typeFn = coerce[spec?.type] ?? String;

  // 1. Force override
  const forceRaw = env[`VERBLETS_FORCE_${key}`];
  if (forceRaw !== undefined && forceRaw !== '') {
    const coerced = typeFn(forceRaw);
    if (coerced !== undefined) return coerced;
  }

  // 2. Normal env
  const raw = env[key];
  if (raw !== undefined && raw !== '') {
    const coerced = typeFn(raw);
    if (coerced !== undefined) return coerced;
  }

  // 3. Deprecated alias
  const deprecatedName = canonicalToDeprecated[key];
  if (deprecatedName) {
    const depRaw = env[deprecatedName];
    if (depRaw !== undefined && depRaw !== '') {
      const coerced = typeFn(depRaw);
      if (coerced !== undefined) {
        warnDeprecated(deprecatedName, key);
        return coerced;
      }
    }
  }

  // 4. Registry default
  return spec?.default;
}

// ── Async get (runtime provider slot) ────────────────────────────────

export async function getAsync(key) {
  const spec = ENV_VARS[key];
  const typeFn = coerce[spec?.type] ?? String;

  // 1. Force override (same as sync — force always wins)
  const forceRaw = env[`VERBLETS_FORCE_${key}`];
  if (forceRaw !== undefined && forceRaw !== '') {
    const coerced = typeFn(forceRaw);
    if (coerced !== undefined) return coerced;
  }

  // 2. Runtime provider
  if (runtimeProvider) {
    const val = await runtimeProvider.get(key);
    if (val !== undefined) return typeFn(val);
  }

  // 3. Fall through to sync chain
  return get(key);
}

// ── Provider management ──────────────────────────────────────────────

export function setRuntimeProvider(provider) {
  runtimeProvider = provider;
}

export function getRuntimeProvider() {
  return runtimeProvider;
}

// ── Convenience aliases ──────────────────────────────────────────────

export const getString = get;
export const getNumber = get;
export const getBoolean = get;

// ── Validation ──────────────────────────────────────────────────────

export function validate() {
  const errors = [];

  // Group constraints (oneOf)
  for (const constraint of CONSTRAINTS) {
    if (constraint.oneOf) {
      const hasAny = constraint.oneOf.some((key) => {
        const raw = env[key];
        return raw !== undefined && raw !== '';
      });
      if (!hasAny) {
        errors.push(`At least one of ${constraint.oneOf.join(', ')} is required`);
      }
    }
  }

  // Per-entry: requiredIf
  for (const [key, spec] of Object.entries(ENV_VARS)) {
    if (!spec.requiredIf) continue;
    const conditionRaw = env[spec.requiredIf];
    const conditionSet = conditionRaw !== undefined && conditionRaw !== '';
    const raw = env[key];
    const hasValue = raw !== undefined && raw !== '';
    if (conditionSet && !hasValue) {
      errors.push(`${key} is required when ${spec.requiredIf} is set`);
    }
  }

  return errors;
}

// ── Testing helpers ──────────────────────────────────────────────────

export function _resetWarnings() {
  warned.clear();
}

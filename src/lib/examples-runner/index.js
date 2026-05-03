/**
 * Table-driven examples runner.
 *
 * Lets specs declare an `examples` array of `{ name, inputs, check?, want?, vary? }`
 * objects and a single `process(inputs) → result` function. The runner
 * dispatches every example through the processor and asserts via either
 * a per-example `check` (fully composable) or — for legacy/simple cases —
 * a `want` shape that translates into the matching check.
 *
 * Composable model
 * ────────────────
 *
 *   { name, inputs, check }   ← preferred
 *
 * A `check` is `(ctx) => void | Promise<void>` where
 *
 *   ctx = { result, error, inputs, varied }
 *
 * `result` is the processor's return value (or `undefined` if it threw).
 * `error` is the thrown error (or `undefined` on success). Most check
 * builders operate on `result` and rethrow `error`; `throws()` does the
 * inverse.
 *
 * The library exposes a base set of check builders: `equals`, `eq`,
 * `contains`, `matches`, `partial`, `length`, `truthy`, `falsy`, `isNull`,
 * `isUndefined`, `throws`, `all`, `when`. Compose freely; reach for an
 * inline `(ctx) => { … }` when the row's assertion doesn't fit.
 *
 * Backward-compat `want` shapes
 * ─────────────────────────────
 *
 *   { name, inputs, want }    ← legacy / simple
 *
 * `want` accepts the same shapes the previous runner did:
 *  - literal value (deep-equal via `equals`)
 *  - function `(varied) => expected` (called per row, then `equals`)
 *  - `{ throws: true | string | RegExp }`
 *  - `{ eq: <ref> }`             — identity
 *  - `{ contains: x }`           — toContain
 *  - `{ matches: <string|RegExp> }` — toMatch
 *  - `{ partial: <object> }`     — toMatchObject
 *
 * These are translated to the corresponding check internally. New code can
 * use `want` for the simple cases and graduate to `check` when something
 * doesn't fit. Both forms can mix within a single `examples` array.
 *
 * Curried form
 * ────────────
 *
 *   const runMyTable = withRunner({ process, beforeEach });
 *   runMyTable({ describe: 'A', examples: aExamples });
 *   runMyTable({ describe: 'B', examples: bExamples });
 *
 * Useful when several tables share the same processor / setup.
 */

import {
  describe as vDescribe,
  it as vIt,
  expect as vExpect,
  beforeEach as vBeforeEach,
} from 'vitest';

// ─── expansion helpers ────────────────────────────────────────────────────

function cartesian(arrays) {
  return arrays.reduce((acc, arr) => acc.flatMap((combo) => arr.map((v) => [...combo, v])), [[]]);
}

function formatVal(v) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  const json = JSON.stringify(v);
  return json && json.length <= 30 ? json : `${typeof v}<${json?.slice(0, 28)}…>`;
}

function suffixFromVaried(varied) {
  return Object.entries(varied)
    .map(([k, v]) => `${k}=${formatVal(v)}`)
    .join(', ');
}

function resolveField(field, varied) {
  return typeof field === 'function' ? field(varied) : field;
}

/**
 * Cross-product `vary` axes into one row per combination. Examples without
 * `vary` (or empty axes) pass through unchanged. Returns a new array; never
 * mutates input.
 */
export function expandExamples(examples) {
  const out = [];
  for (const ex of examples) {
    const axes = ex.vary ? Object.entries(ex.vary).filter(([, vs]) => vs && vs.length) : [];
    if (axes.length === 0) {
      out.push({
        name: ex.name,
        inputs: resolveField(ex.inputs, {}),
        want: resolveField(ex.want, {}),
        check: ex.check,
        varied: {},
      });
      continue;
    }
    const combos = cartesian(axes.map(([, vs]) => vs));
    for (const combo of combos) {
      const varied = Object.fromEntries(axes.map(([name], i) => [name, combo[i]]));
      out.push({
        name: `${ex.name} (${suffixFromVaried(varied)})`,
        inputs: resolveField(ex.inputs, varied),
        want: resolveField(ex.want, varied),
        check: ex.check,
        varied,
      });
    }
  }
  return out;
}

// ─── check builders ───────────────────────────────────────────────────────
//
// Every check is `(ctx) => void | Promise<void>` where
// ctx = { result, error, inputs, varied }.

const ensureSuccess = (ctx) => {
  if (ctx.error !== undefined) throw ctx.error;
};

export const equals = (expected) => (ctx) => {
  ensureSuccess(ctx);
  vExpect(ctx.result).toEqual(expected);
};

export const eq = (expected) => (ctx) => {
  ensureSuccess(ctx);
  vExpect(ctx.result).toBe(expected);
};

export const contains = (expected) => (ctx) => {
  ensureSuccess(ctx);
  vExpect(ctx.result).toContain(expected);
};

export const matches = (expected) => (ctx) => {
  ensureSuccess(ctx);
  vExpect(ctx.result).toMatch(expected);
};

export const partial = (expected) => (ctx) => {
  ensureSuccess(ctx);
  vExpect(ctx.result).toMatchObject(expected);
};

export const length = (n) => (ctx) => {
  ensureSuccess(ctx);
  vExpect(ctx.result).toHaveLength(n);
};

export const truthy = () => (ctx) => {
  ensureSuccess(ctx);
  vExpect(ctx.result).toBeTruthy();
};

export const falsy = () => (ctx) => {
  ensureSuccess(ctx);
  vExpect(ctx.result).toBeFalsy();
};

export const isUndefined = () => (ctx) => {
  ensureSuccess(ctx);
  vExpect(ctx.result).toBeUndefined();
};

export const isNull = () => (ctx) => {
  ensureSuccess(ctx);
  vExpect(ctx.result).toBeNull();
};

/**
 * Assert the processor threw. Optional matcher narrows the message.
 *  - `true`  / undefined → any throw
 *  - string              → message must contain it
 *  - RegExp              → message must match
 */
export const throws = (matcher) => (ctx) => {
  if (ctx.error === undefined) {
    throw new Error(`expected processor to throw, but it returned: ${JSON.stringify(ctx.result)}`);
  }
  if (matcher === undefined || matcher === true) return;
  const msg = ctx.error?.message ?? String(ctx.error);
  if (typeof matcher === 'string') vExpect(msg).toContain(matcher);
  else if (matcher instanceof RegExp) vExpect(msg).toMatch(matcher);
};

/** Run several checks against the same context. */
export const all =
  (...checks) =>
  async (ctx) => {
    for (const c of checks) await c(ctx);
  };

/** Run `check` only when `predicate(ctx)` is truthy. */
export const when = (predicate, check) => async (ctx) => {
  if (predicate(ctx)) await check(ctx);
};

// ─── want → check translator (backward compat) ────────────────────────────

const WANT_MATCHERS = ['eq', 'contains', 'matches', 'partial'];

function wantToCheck(want) {
  if (want === null) return equals(null);
  if (want === undefined) return isUndefined();
  if (typeof want !== 'object' || Array.isArray(want)) return equals(want);

  // object — could be a matcher spec or a literal-object want
  if ('throws' in want) {
    // throws is exclusive — ignore other keys
    return throws(want.throws);
  }
  const checks = WANT_MATCHERS.filter((k) => Object.prototype.hasOwnProperty.call(want, k))
    .map((k) => {
      if (k === 'eq') return eq(want.eq);
      if (k === 'contains') return contains(want.contains);
      if (k === 'matches') return matches(want.matches);
      if (k === 'partial') return partial(want.partial);
      return null;
    })
    .filter(Boolean);
  if (checks.length === 0) {
    // literal object — deep equal
    return equals(want);
  }
  return all(...checks);
}

// ─── runTable ─────────────────────────────────────────────────────────────

async function runRow(processFn, example) {
  let result;
  let error;
  try {
    result = await processFn(example.inputs);
  } catch (e) {
    error = e;
  }
  return { result, error, inputs: example.inputs, varied: example.varied };
}

function resolveCheck(example) {
  if (example.check) return example.check;
  return wantToCheck(example.want);
}

/**
 * Run a table of examples through a processor.
 *
 * @param {object} config
 * @param {string} [config.describe]    Optional `describe` name. Omit to inline rows.
 * @param {Array} config.examples        Example rows (will be expanded by `vary`).
 * @param {Function} config.process      `(inputs) => result | Promise<result>`.
 * @param {Function} [config.beforeEach] Hook run before each row.
 * @param {Function} [config.it]         Custom `it` (e.g. from `getTestHelpers`
 *                                       for AI-reporter integration). Defaults
 *                                       to vitest's `it`.
 * @param {Function} [config.describeFn] Custom `describe`. Defaults to vitest's.
 *
 * Each row's assertion comes from `row.check` (a `(ctx) => …` function), or
 * a translated `row.want`. Compose checks via `all(...)`, narrow via `when(...)`,
 * or write inline when nothing in the base set fits.
 */
export function runTable({
  describe: describeName,
  examples,
  process: processFn,
  beforeEach,
  it: itFn = vIt,
  describeFn = vDescribe,
}) {
  const expanded = expandExamples(examples);

  const body = () => {
    if (beforeEach) vBeforeEach(beforeEach);
    for (const ex of expanded) {
      itFn(ex.name, async () => {
        const ctx = await runRow(processFn, ex);
        const check = resolveCheck(ex);
        await check(ctx);
      });
    }
  };

  if (describeName) describeFn(describeName, body);
  else body();
}

/**
 * Curry common config (`process`, `beforeEach`) for reuse across multiple tables.
 * Each invocation passes the per-table `describe` + `examples`.
 *
 *   const runScale = withRunner({ process: scaleProcessor, beforeEach: clearMocks });
 *   runScale({ describe: 'numbers', examples: numericExamples });
 *   runScale({ describe: 'strings', examples: stringExamples });
 */
export function withRunner(common) {
  return (rest) => runTable({ ...common, ...rest });
}

export default runTable;

/**
 * Table-driven examples runner.
 *
 * Each row is `{ name, inputs, mocks?, want?, vary? }`:
 *   - `inputs`  — args to the function under test
 *   - `mocks`   — declarative mock data (e.g. `{ llm: [val, val, err] }`)
 *   - `want`    — declarative expected outcome (e.g. `{ value, length, throws }`)
 *   - `vary`    — cross-product axes (one row → N rows)
 *
 * `runTable` declares one `expects(ctx)` function — its assertion vocabulary —
 * with `ctx = { result, error, inputs, mocks, want, varied }`. Rows differ
 * only in their data; rows whose assertion needs don't share a vocabulary
 * belong in a separate `runTable` call.
 *
 * `process({ inputs, mocks })` runs the function under test. It's responsible
 * for translating `mocks` data into actual mock-fn calls (the runner is
 * agnostic to which mock library you use).
 */

import { describe as vDescribe, it as vIt, beforeEach as vBeforeEach } from 'vitest';

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
 * `vary` (or empty axes) pass through unchanged.
 */
export function expandExamples(examples) {
  const out = [];
  for (const ex of examples) {
    const axes = ex.vary ? Object.entries(ex.vary).filter(([, vs]) => vs && vs.length) : [];
    if (axes.length === 0) {
      out.push({
        name: ex.name,
        inputs: resolveField(ex.inputs, {}),
        mocks: resolveField(ex.mocks, {}),
        want: resolveField(ex.want, {}),
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
        mocks: resolveField(ex.mocks, varied),
        want: resolveField(ex.want, varied),
        varied,
      });
    }
  }
  return out;
}

async function runRow(processFn, example) {
  let result;
  let error;
  try {
    result = await processFn({ inputs: example.inputs, mocks: example.mocks });
  } catch (e) {
    error = e;
  }
  return {
    result,
    error,
    inputs: example.inputs,
    mocks: example.mocks,
    want: example.want,
    varied: example.varied,
  };
}

/**
 * Apply a `mocks` data block to a registry of mock functions.
 *
 * Each entry under `data` keys a mock-name to a sequence of values. Each
 * value is queued via `mockResolvedValueOnce`, except `Error` instances
 * which are queued via `mockRejectedValueOnce`.
 *
 *   applyMocks({ llm: [spec, result, new Error('boom')] }, { llm });
 *
 * Authors call this from their `process` function with their file's mock
 * registry. The runner is agnostic.
 */
export function applyMocks(data, registry) {
  if (!data) return;
  for (const [name, sequence] of Object.entries(data)) {
    const fn = registry[name];
    if (!fn) throw new Error(`applyMocks: unknown mock "${name}"`);
    for (const value of sequence) {
      if (value instanceof Error) fn.mockRejectedValueOnce(value);
      else fn.mockResolvedValueOnce(value);
    }
  }
}

/**
 * Run a table of examples through a processor.
 *
 * @param {object} config
 * @param {string} [config.describe]    Optional `describe` name.
 * @param {Array} config.examples       Row definitions.
 * @param {Function} config.process     `({ inputs, mocks }) => result`.
 * @param {Function} config.expects     `(ctx) => void` — table assertion vocabulary.
 * @param {Function} [config.beforeEach] Hook run before each row.
 * @param {Function} [config.it]         Custom `it` (e.g. AI-reporter).
 * @param {Function} [config.describeFn] Custom `describe`.
 */
export function runTable({
  describe: describeName,
  examples,
  process: processFn,
  expects,
  beforeEach,
  it: itFn = vIt,
  describeFn = vDescribe,
}) {
  if (typeof expects !== 'function') {
    throw new Error('runTable requires an `expects(ctx)` function');
  }
  const expanded = expandExamples(examples);
  const body = () => {
    if (beforeEach) vBeforeEach(beforeEach);
    for (const ex of expanded) {
      itFn(ex.name, async () => {
        const ctx = await runRow(processFn, ex);
        await expects(ctx);
      });
    }
  };
  if (describeName) describeFn(describeName, body);
  else body();
}

/**
 * Curry common config (`process`, `expects`, `beforeEach`) for reuse across
 * multiple tables.
 */
export function withRunner(common) {
  return (rest) => runTable({ ...common, ...rest });
}

export default runTable;

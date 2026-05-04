/**
 * Table-driven examples runner.
 *
 * Each `runTable` call declares:
 *   - `examples` — rows of `{ name, inputs, vary? }`
 *   - `process(inputs)` — the function under test (may throw)
 *   - `expects(ctx)` — the table's assertion vocabulary, where
 *      `ctx = { result, error, inputs, varied }`
 *
 * The discipline: a single `expects` defines what this table checks. Rows
 * differ only in what they put in `inputs` — including control properties
 * (e.g. `want`, `throws`, `wantBatchCalls`) that `expects` reads to decide
 * which assertions fire. If a row needs assertions outside the table's
 * vocabulary, it belongs in a separate `runTable` call.
 *
 * `vary` cross-products its axes into one row per combination. `inputs`
 * may be a function `(varied) => inputs` so each combination gets a
 * freshly-built object.
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
 * `vary` (or empty axes) pass through unchanged. Returns a new array.
 */
export function expandExamples(examples) {
  const out = [];
  for (const ex of examples) {
    const axes = ex.vary ? Object.entries(ex.vary).filter(([, vs]) => vs && vs.length) : [];
    if (axes.length === 0) {
      out.push({ name: ex.name, inputs: resolveField(ex.inputs, {}), varied: {} });
      continue;
    }
    const combos = cartesian(axes.map(([, vs]) => vs));
    for (const combo of combos) {
      const varied = Object.fromEntries(axes.map(([name], i) => [name, combo[i]]));
      out.push({
        name: `${ex.name} (${suffixFromVaried(varied)})`,
        inputs: resolveField(ex.inputs, varied),
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
    result = await processFn(example.inputs);
  } catch (e) {
    error = e;
  }
  return { result, error, inputs: example.inputs, varied: example.varied };
}

/**
 * Run a table of examples through a processor.
 *
 * @param {object} config
 * @param {string} [config.describe]    Optional `describe` name.
 * @param {Array} config.examples        Row definitions.
 * @param {Function} config.process      `(inputs) => result | Promise<result>`.
 * @param {Function} config.expects      `(ctx) => void | Promise<void>` — the
 *                                       table-level assertion vocabulary.
 * @param {Function} [config.beforeEach] Hook run before each row.
 * @param {Function} [config.it]         Custom `it` (e.g. from `getTestHelpers`).
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
 * multiple tables. Each invocation passes the per-table `describe` + `examples`.
 *
 *   const runScale = withRunner({ process, expects, beforeEach });
 *   runScale({ describe: 'numbers', examples: numericExamples });
 *   runScale({ describe: 'strings', examples: stringExamples });
 */
export function withRunner(common) {
  return (rest) => runTable({ ...common, ...rest });
}

export default runTable;

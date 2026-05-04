/**
 * Table-driven examples runner.
 *
 * Lets specs declare an `examples` array of `{ name, inputs, want, vary? }`
 * objects and a single `process(inputs) → result` function. The runner
 * dispatches every example through the processor and asserts the result
 * against `want`.
 *
 * `vary` is optional. When set, `expandExamples` cross-products its axes
 * so one row becomes N rows — one per combination — with the varied
 * params merged into `inputs` and the row name suffixed for uniqueness.
 *
 * `want` may be:
 *  - a literal value: deep-equal compare via `expect(...).toEqual(...)`
 *  - a function `(varied) => expected`: called per row, then deep-equal
 *  - `{ throws: true }`: assert the processor throws (sync or async)
 *  - `{ throws: <string|RegExp> }`: assert the throw message matches
 *  - `{ eq: <value> }`: assert via `toBe` (reference/identity equality)
 *  - `{ contains: <value> }`: assert via `toContain` (substring, array element, etc.)
 *  - `{ matches: <string|RegExp> }`: assert via `toMatch`
 *  - `{ partial: <object> }`: assert via `toMatchObject` (subset match)
 *
 * Compound matchers may be combined: `{ contains: 'X', matches: /\d+/ }` runs
 * both checks. `throws` is exclusive — when set, the other matchers are ignored.
 *
 * `inputs` may be a literal value or a function `(varied) => inputs`.
 * The function form is what makes the future migration painless — when a
 * cross-product expands to many rows, every row gets its own freshly-built
 * inputs object.
 */

import {
  describe as vDescribe,
  it as vIt,
  expect as vExpect,
  beforeEach as vBeforeEach,
} from 'vitest';

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

function resolve(field, varied) {
  return typeof field === 'function' ? field(varied) : field;
}

/**
 * Expand an array of examples by cross-producting each example's `vary` axes.
 * Examples with no `vary` (or empty axes) pass through unchanged. Returns a
 * new array; never mutates input.
 *
 * @param {Array<{ name: string, inputs?: any, want?: any, vary?: object }>} examples
 * @returns {Array<{ name: string, inputs: any, want: any, varied: object }>}
 */
export function expandExamples(examples) {
  const out = [];
  for (const ex of examples) {
    const axes = ex.vary ? Object.entries(ex.vary).filter(([, vs]) => vs && vs.length) : [];
    if (axes.length === 0) {
      out.push({
        name: ex.name,
        inputs: resolve(ex.inputs, {}),
        want: resolve(ex.want, {}),
        varied: {},
      });
      continue;
    }
    const combos = cartesian(axes.map(([, vs]) => vs));
    for (const combo of combos) {
      const varied = Object.fromEntries(axes.map(([name], i) => [name, combo[i]]));
      out.push({
        name: `${ex.name} (${suffixFromVaried(varied)})`,
        inputs: resolve(ex.inputs, varied),
        want: resolve(ex.want, varied),
        varied,
      });
    }
  }
  return out;
}

const MATCHER_KEYS = ['eq', 'contains', 'matches', 'partial'];

function isThrowSpec(want) {
  return want && typeof want === 'object' && Object.prototype.hasOwnProperty.call(want, 'throws');
}

function matcherKeys(want) {
  if (!want || typeof want !== 'object' || Array.isArray(want)) return [];
  return MATCHER_KEYS.filter((k) => Object.prototype.hasOwnProperty.call(want, k));
}

async function assertThrows(thrower, throws) {
  let caught;
  try {
    await Promise.resolve(thrower());
  } catch (err) {
    caught = err;
  }
  if (!caught) {
    throw new Error('expected processor to throw, but it returned successfully');
  }
  if (throws === true) return;
  const msg = caught.message ?? String(caught);
  if (typeof throws === 'string') {
    vExpect(msg).toContain(throws);
  } else if (throws instanceof RegExp) {
    vExpect(msg).toMatch(throws);
  } else {
    // unrecognized throws spec — accept any throw, surface what we got
    vExpect(caught).toBeInstanceOf(Error);
  }
}

/**
 * Run a table of examples through a processor.
 *
 * @param {object} config
 * @param {string} [config.describe]   Optional `describe` name. Omit to inline rows.
 * @param {Array} config.examples       Array of example rows (will be expanded).
 * @param {Function} config.process     `(inputs) => result | Promise<result>`.
 * @param {Function} [config.beforeEach] Optional before-each hook.
 *
 * Tests are emitted via vitest's `it` and `expect`; this is not a generic
 * runner. A spec file using `runTable` must be discovered by vitest in the
 * usual way.
 */
export function runTable({ describe: describeName, examples, process, beforeEach }) {
  const expanded = expandExamples(examples);

  const body = () => {
    if (beforeEach) vBeforeEach(beforeEach);
    for (const ex of expanded) {
      vIt(ex.name, async () => {
        if (isThrowSpec(ex.want)) {
          await assertThrows(() => process(ex.inputs), ex.want.throws);
          return;
        }
        const result = await process(ex.inputs);
        const keys = matcherKeys(ex.want);
        if (keys.length === 0) {
          vExpect(result).toEqual(ex.want);
          return;
        }
        for (const key of keys) {
          if (key === 'eq') vExpect(result).toBe(ex.want.eq);
          else if (key === 'contains') vExpect(result).toContain(ex.want.contains);
          else if (key === 'matches') vExpect(result).toMatch(ex.want.matches);
          else if (key === 'partial') vExpect(result).toMatchObject(ex.want.partial);
        }
      });
    }
  };

  if (describeName) {
    vDescribe(describeName, body);
  } else {
    body();
  }
}

export default runTable;

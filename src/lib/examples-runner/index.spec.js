import { describe, expect, it } from 'vitest';
import { expandExamples, runTable } from './index.js';

// ─── expandExamples ────────────────────────────────────────────────────────
//
// Pure transform — verify cross-product expansion, function-form inputs/want,
// and pass-through for examples without `vary`.

const expandCases = [
  {
    name: 'pass through when vary is absent',
    inputs: {
      examples: [{ name: 'plain', inputs: { a: 1 }, want: { result: 2 } }],
    },
    want: [{ name: 'plain', inputs: { a: 1 }, want: { result: 2 }, varied: {} }],
  },
  {
    name: 'pass through when vary is empty object',
    inputs: {
      examples: [{ name: 'plain', inputs: { a: 1 }, want: 2, vary: {} }],
    },
    want: [{ name: 'plain', inputs: { a: 1 }, want: 2, varied: {} }],
  },
  {
    name: 'expand single-axis vary into N rows',
    inputs: {
      examples: [
        {
          name: 'increment',
          inputs: ({ x }) => ({ x }),
          want: ({ x }) => x + 1,
          vary: { x: [1, 2, 3] },
        },
      ],
    },
    want: [
      { name: 'increment (x=1)', inputs: { x: 1 }, want: 2, varied: { x: 1 } },
      { name: 'increment (x=2)', inputs: { x: 2 }, want: 3, varied: { x: 2 } },
      { name: 'increment (x=3)', inputs: { x: 3 }, want: 4, varied: { x: 3 } },
    ],
  },
  {
    name: 'expand two-axis vary into the cross product',
    inputs: {
      examples: [
        {
          name: 'add',
          inputs: ({ a, b }) => ({ a, b }),
          want: ({ a, b }) => a + b,
          vary: { a: [1, 2], b: [10, 20] },
        },
      ],
    },
    want: [
      { name: 'add (a=1, b=10)', inputs: { a: 1, b: 10 }, want: 11, varied: { a: 1, b: 10 } },
      { name: 'add (a=1, b=20)', inputs: { a: 1, b: 20 }, want: 21, varied: { a: 1, b: 20 } },
      { name: 'add (a=2, b=10)', inputs: { a: 2, b: 10 }, want: 12, varied: { a: 2, b: 10 } },
      { name: 'add (a=2, b=20)', inputs: { a: 2, b: 20 }, want: 22, varied: { a: 2, b: 20 } },
    ],
  },
  {
    name: 'static want reused across all combinations',
    inputs: {
      examples: [
        {
          name: 'identity is stable',
          inputs: ({ flag }) => ({ flag }),
          want: 'always',
          vary: { flag: [true, false] },
        },
      ],
    },
    want: [
      {
        name: 'identity is stable (flag=true)',
        inputs: { flag: true },
        want: 'always',
        varied: { flag: true },
      },
      {
        name: 'identity is stable (flag=false)',
        inputs: { flag: false },
        want: 'always',
        varied: { flag: false },
      },
    ],
  },
  {
    name: 'static inputs reused across all combinations',
    inputs: {
      examples: [
        {
          name: 'counts',
          inputs: { items: [1, 2, 3] },
          want: ({ batchSize }) => ({ items: [1, 2, 3], batchSize }),
          vary: { batchSize: [1, 5] },
        },
      ],
    },
    want: [
      {
        name: 'counts (batchSize=1)',
        inputs: { items: [1, 2, 3] },
        want: { items: [1, 2, 3], batchSize: 1 },
        varied: { batchSize: 1 },
      },
      {
        name: 'counts (batchSize=5)',
        inputs: { items: [1, 2, 3] },
        want: { items: [1, 2, 3], batchSize: 5 },
        varied: { batchSize: 5 },
      },
    ],
  },
  {
    name: 'empty axis values are skipped (cross-product would zero out otherwise)',
    inputs: {
      examples: [
        {
          name: 'partial',
          inputs: ({ a }) => ({ a }),
          want: ({ a }) => a,
          vary: { a: [1, 2], unused: [] },
        },
      ],
    },
    want: [
      { name: 'partial (a=1)', inputs: { a: 1 }, want: 1, varied: { a: 1 } },
      { name: 'partial (a=2)', inputs: { a: 2 }, want: 2, varied: { a: 2 } },
    ],
  },
];

describe('expandExamples', () => {
  for (const c of expandCases) {
    it(c.name, () => {
      expect(expandExamples(c.inputs.examples)).toEqual(c.want);
    });
  }

  it('does not mutate the input examples array', () => {
    const examples = [{ name: 'p', inputs: { a: 1 }, want: 2 }];
    const before = JSON.stringify(examples);
    expandExamples(examples);
    expect(JSON.stringify(examples)).toBe(before);
  });
});

// ─── runTable: identity, sync, deep-equal ──────────────────────────────────
//
// Eats its own dog food: the harness drives a tiny processor with a literal
// table. If these pass, the runner can drive vitest correctly. We mix
// throw-spec, eq-spec, deep-equal, and a vary-expanded row.

const sumProcessor = ({ a, b }) => a + b;
const identityProcessor = (x) => x;
const throwingProcessor = ({ msg }) => {
  throw new Error(msg);
};

runTable({
  describe: 'runTable: deep-equal default (sync)',
  examples: [
    { name: '1 + 2 = 3', inputs: { a: 1, b: 2 }, want: 3 },
    { name: '0 + 0 = 0', inputs: { a: 0, b: 0 }, want: 0 },
    { name: 'negatives', inputs: { a: -5, b: 3 }, want: -2 },
  ],
  process: sumProcessor,
});

// `{ eq }` exercises the toBe path. We use a frozen reference so toEqual would
// also pass — the spec is verifying the path runs, not distinguishing equality
// modes. Use cases where toBe vs toEqual diverge live in chain-level specs.
const SHARED_REF = Object.freeze({ a: 1 });
runTable({
  describe: 'runTable: identity equality via { eq } spec',
  examples: [{ name: 'same reference passes', inputs: SHARED_REF, want: { eq: SHARED_REF } }],
  process: identityProcessor,
});

runTable({
  describe: 'runTable: throws spec accepts true / string / RegExp',
  examples: [
    { name: 'throws=true accepts any error', inputs: { msg: 'boom' }, want: { throws: true } },
    {
      name: 'throws=string substring matches',
      inputs: { msg: 'kaboom now' },
      want: { throws: 'kaboom' },
    },
    {
      name: 'throws=regexp matches',
      inputs: { msg: 'rate limited (429)' },
      want: { throws: /\(\d+\)/ },
    },
  ],
  process: throwingProcessor,
});

runTable({
  describe: 'runTable: vary expands rows',
  examples: [
    {
      name: 'sum',
      inputs: ({ a, b }) => ({ a, b }),
      want: ({ a, b }) => a + b,
      vary: { a: [1, 2], b: [10, 100] },
    },
  ],
  process: sumProcessor,
});

// async processor coverage
runTable({
  describe: 'runTable: async processor',
  examples: [
    {
      name: 'awaits the result',
      inputs: { delay: 1, value: 42 },
      want: 42,
    },
  ],
  process: async ({ delay, value }) => {
    await new Promise((r) => setTimeout(r, delay));
    return value;
  },
});

// `{ contains }` — substring (string) and element (array)
runTable({
  describe: 'runTable: contains spec',
  examples: [
    { name: 'string contains substring', inputs: 'hello world', want: { contains: 'world' } },
    { name: 'array contains element', inputs: [1, 2, 3], want: { contains: 2 } },
  ],
  process: identityProcessor,
});

// `{ matches }` — string + RegExp
runTable({
  describe: 'runTable: matches spec',
  examples: [
    { name: 'matches RegExp', inputs: 'rate limited (429)', want: { matches: /\(\d+\)/ } },
    { name: 'matches string substring', inputs: 'hello world', want: { matches: 'world' } },
  ],
  process: identityProcessor,
});

// `{ partial }` — toMatchObject
runTable({
  describe: 'runTable: partial spec',
  examples: [
    {
      name: 'asserts only specific fields of a complex object',
      inputs: { a: 1, b: 2, c: 3, nested: { x: 10, y: 20 } },
      want: { partial: { a: 1, nested: { x: 10 } } },
    },
  ],
  process: identityProcessor,
});

// Compound matchers combine
runTable({
  describe: 'runTable: combined matchers',
  examples: [
    {
      name: 'contains + matches both apply',
      inputs: 'rate limited (429) on attempt 3',
      want: { contains: 'rate limited', matches: /\(\d+\)/ },
    },
  ],
  process: identityProcessor,
});

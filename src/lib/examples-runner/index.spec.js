import { describe, expect, it } from 'vitest';
import { expandExamples, runTable, withRunner } from './index.js';

// ─── expandExamples ───────────────────────────────────────────────────────

const expandCases = [
  {
    name: 'pass through when vary is absent',
    examples: [{ name: 'plain', inputs: { a: 1 } }],
    want: [{ name: 'plain', inputs: { a: 1 }, varied: {} }],
  },
  {
    name: 'pass through when vary is empty object',
    examples: [{ name: 'plain', inputs: { a: 1 }, vary: {} }],
    want: [{ name: 'plain', inputs: { a: 1 }, varied: {} }],
  },
  {
    name: 'expand single-axis vary into N rows',
    examples: [
      {
        name: 'increment',
        inputs: ({ x }) => ({ x }),
        vary: { x: [1, 2, 3] },
      },
    ],
    want: [
      { name: 'increment (x=1)', inputs: { x: 1 }, varied: { x: 1 } },
      { name: 'increment (x=2)', inputs: { x: 2 }, varied: { x: 2 } },
      { name: 'increment (x=3)', inputs: { x: 3 }, varied: { x: 3 } },
    ],
  },
  {
    name: 'expand two-axis vary into the cross product',
    examples: [
      {
        name: 'add',
        inputs: ({ a, b }) => ({ a, b }),
        vary: { a: [1, 2], b: [10, 20] },
      },
    ],
    want: [
      { name: 'add (a=1, b=10)', inputs: { a: 1, b: 10 }, varied: { a: 1, b: 10 } },
      { name: 'add (a=1, b=20)', inputs: { a: 1, b: 20 }, varied: { a: 1, b: 20 } },
      { name: 'add (a=2, b=10)', inputs: { a: 2, b: 10 }, varied: { a: 2, b: 10 } },
      { name: 'add (a=2, b=20)', inputs: { a: 2, b: 20 }, varied: { a: 2, b: 20 } },
    ],
  },
  {
    name: 'empty axis values are skipped',
    examples: [
      {
        name: 'partial',
        inputs: ({ a }) => ({ a }),
        vary: { a: [1, 2], unused: [] },
      },
    ],
    want: [
      { name: 'partial (a=1)', inputs: { a: 1 }, varied: { a: 1 } },
      { name: 'partial (a=2)', inputs: { a: 2 }, varied: { a: 2 } },
    ],
  },
];

describe('expandExamples', () => {
  for (const c of expandCases) {
    it(c.name, () => {
      expect(expandExamples(c.examples)).toEqual(c.want);
    });
  }

  it('does not mutate the input examples array', () => {
    const examples = [{ name: 'p', inputs: { a: 1 } }];
    const before = JSON.stringify(examples);
    expandExamples(examples);
    expect(JSON.stringify(examples)).toBe(before);
  });
});

// ─── runTable: basic dispatch ─────────────────────────────────────────────

runTable({
  describe: 'runTable: result assertions',
  examples: [
    { name: '1 + 2 = 3', inputs: { a: 1, b: 2, want: 3 } },
    { name: '4 + 5 = 9', inputs: { a: 4, b: 5, want: 9 } },
    { name: 'negatives', inputs: { a: -5, b: 3, want: -2 } },
  ],
  process: ({ a, b }) => a + b,
  expects: ({ result, inputs }) => {
    if ('want' in inputs) expect(result).toBe(inputs.want);
  },
});

// ─── runTable: throws via control property ────────────────────────────────

runTable({
  describe: 'runTable: throws via control property',
  examples: [
    { name: 'string substring', inputs: { msg: 'kaboom now', throws: 'kaboom' } },
    { name: 'regexp match', inputs: { msg: 'rate limited (429)', throws: /\(\d+\)/ } },
    { name: 'truthy any', inputs: { msg: 'boom', throws: true } },
  ],
  process: ({ msg }) => {
    throw new Error(msg);
  },
  expects: ({ error, inputs }) => {
    if ('throws' in inputs) {
      expect(error).toBeDefined();
      const matcher = inputs.throws;
      if (typeof matcher === 'string') expect(error.message).toContain(matcher);
      else if (matcher instanceof RegExp) expect(error.message).toMatch(matcher);
    }
  },
});

// ─── runTable: vary expansion ─────────────────────────────────────────────

runTable({
  describe: 'runTable: vary expands to one row per combination',
  examples: [
    {
      name: 'doubler',
      inputs: ({ x }) => ({ x, want: x * 2 }),
      vary: { x: [3, 4, 5] },
    },
  ],
  process: ({ x }) => x * 2,
  expects: ({ result, inputs, varied }) => {
    expect(result).toBe(inputs.want);
    expect(result).toBe(varied.x * 2);
  },
});

// ─── runTable: ctx exposure ───────────────────────────────────────────────

runTable({
  describe: 'runTable: ctx is { result, error, inputs, varied }',
  examples: [{ name: 'sees inputs and result', inputs: { x: 5 } }],
  process: ({ x }) => x * 2,
  expects: ({ result, error, inputs, varied }) => {
    expect(error).toBeUndefined();
    expect(inputs).toEqual({ x: 5 });
    expect(result).toBe(10);
    expect(varied).toEqual({});
  },
});

// ─── runTable: missing expects throws ─────────────────────────────────────

describe('runTable: validation', () => {
  it('throws when expects is missing', () => {
    expect(() =>
      runTable({
        examples: [{ name: 'x', inputs: 1 }],
        process: (x) => x,
      })
    ).toThrow(/expects/);
  });
});

// ─── withRunner: curried form ─────────────────────────────────────────────

const runMul = withRunner({
  process: ({ a, b }) => a * b,
  expects: ({ result, inputs }) => expect(result).toBe(inputs.want),
});

runMul({
  describe: 'withRunner: first table',
  examples: [
    { name: '2 × 3', inputs: { a: 2, b: 3, want: 6 } },
    { name: '4 × 5', inputs: { a: 4, b: 5, want: 20 } },
  ],
});

runMul({
  describe: 'withRunner: second table reuses processor + expects',
  examples: [
    { name: '0 × n', inputs: { a: 0, b: 99, want: 0 } },
    { name: '1 × n', inputs: { a: 1, b: 7, want: 7 } },
  ],
});

// ─── async expects ────────────────────────────────────────────────────────

runTable({
  describe: 'runTable: async expects',
  examples: [{ name: 'awaits', inputs: { want: 'result' } }],
  process: () => 'result',
  expects: async ({ result, inputs }) => {
    await new Promise((r) => setTimeout(r, 1));
    expect(result).toBe(inputs.want);
  },
});

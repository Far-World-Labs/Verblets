import { describe, expect, it, vi } from 'vitest';
import { expandExamples, runTable, withRunner, applyMocks } from './index.js';

// ─── expandExamples ───────────────────────────────────────────────────────

const expandCases = [
  {
    name: 'pass through when vary is absent',
    examples: [{ name: 'plain', inputs: { a: 1 }, want: { value: 2 } }],
    out: [{ name: 'plain', inputs: { a: 1 }, mocks: undefined, want: { value: 2 }, varied: {} }],
  },
  {
    name: 'pass through when vary is empty object',
    examples: [{ name: 'plain', inputs: { a: 1 }, vary: {} }],
    out: [{ name: 'plain', inputs: { a: 1 }, mocks: undefined, want: undefined, varied: {} }],
  },
  {
    name: 'expand single-axis vary into N rows',
    examples: [
      {
        name: 'increment',
        inputs: ({ x }) => ({ x }),
        want: ({ x }) => ({ value: x + 1 }),
        vary: { x: [1, 2, 3] },
      },
    ],
    out: [
      {
        name: 'increment (x=1)',
        inputs: { x: 1 },
        mocks: undefined,
        want: { value: 2 },
        varied: { x: 1 },
      },
      {
        name: 'increment (x=2)',
        inputs: { x: 2 },
        mocks: undefined,
        want: { value: 3 },
        varied: { x: 2 },
      },
      {
        name: 'increment (x=3)',
        inputs: { x: 3 },
        mocks: undefined,
        want: { value: 4 },
        varied: { x: 3 },
      },
    ],
  },
  {
    name: 'expand two-axis vary into the cross product',
    examples: [
      {
        name: 'add',
        inputs: ({ a, b }) => ({ a, b }),
        want: ({ a, b }) => ({ value: a + b }),
        vary: { a: [1, 2], b: [10, 20] },
      },
    ],
    out: [
      {
        name: 'add (a=1, b=10)',
        inputs: { a: 1, b: 10 },
        mocks: undefined,
        want: { value: 11 },
        varied: { a: 1, b: 10 },
      },
      {
        name: 'add (a=1, b=20)',
        inputs: { a: 1, b: 20 },
        mocks: undefined,
        want: { value: 21 },
        varied: { a: 1, b: 20 },
      },
      {
        name: 'add (a=2, b=10)',
        inputs: { a: 2, b: 10 },
        mocks: undefined,
        want: { value: 12 },
        varied: { a: 2, b: 10 },
      },
      {
        name: 'add (a=2, b=20)',
        inputs: { a: 2, b: 20 },
        mocks: undefined,
        want: { value: 22 },
        varied: { a: 2, b: 20 },
      },
    ],
  },
  {
    name: 'mocks block passes through',
    examples: [
      { name: 'with mocks', inputs: { x: 1 }, mocks: { llm: ['a'] }, want: { value: 'a' } },
    ],
    out: [
      {
        name: 'with mocks',
        inputs: { x: 1 },
        mocks: { llm: ['a'] },
        want: { value: 'a' },
        varied: {},
      },
    ],
  },
];

describe('expandExamples', () => {
  for (const c of expandCases) {
    it(c.name, () => {
      expect(expandExamples(c.examples)).toEqual(c.out);
    });
  }

  it('does not mutate the input examples array', () => {
    const examples = [{ name: 'p', inputs: { a: 1 }, want: { value: 2 } }];
    const before = JSON.stringify(examples);
    expandExamples(examples);
    expect(JSON.stringify(examples)).toBe(before);
  });
});

// ─── applyMocks ───────────────────────────────────────────────────────────

describe('applyMocks', () => {
  it('queues resolved values via mockResolvedValueOnce', () => {
    const fn = vi.fn();
    applyMocks({ fn: ['a', 'b'] }, { fn });
    // The vi.fn() mocks accumulate sequential resolves; calling fn twice
    // returns 'a' then 'b'.
    return Promise.all([fn(), fn()]).then(([first, second]) => {
      expect(first).toBe('a');
      expect(second).toBe('b');
    });
  });

  it('queues Error values via mockRejectedValueOnce', async () => {
    const fn = vi.fn();
    applyMocks({ fn: [new Error('boom')] }, { fn });
    await expect(fn()).rejects.toThrow('boom');
  });

  it('throws when registry is missing the named mock', () => {
    expect(() => applyMocks({ unknown: ['x'] }, {})).toThrow(/unknown mock "unknown"/);
  });

  it('no-op when data is null/undefined', () => {
    expect(() => applyMocks(undefined, {})).not.toThrow();
    expect(() => applyMocks(null, {})).not.toThrow();
  });
});

// ─── runTable: dispatch ───────────────────────────────────────────────────

runTable({
  describe: 'runTable: result via want.value',
  examples: [
    { name: '1 + 2 = 3', inputs: { a: 1, b: 2 }, want: { value: 3 } },
    { name: '4 + 5 = 9', inputs: { a: 4, b: 5 }, want: { value: 9 } },
  ],
  process: ({ inputs }) => inputs.a + inputs.b,
  expects: ({ result, want }) => expect(result).toBe(want.value),
});

runTable({
  describe: 'runTable: throws via want.throws',
  examples: [
    { name: 'string substring', inputs: { msg: 'kaboom now' }, want: { throws: 'kaboom' } },
    {
      name: 'regexp match',
      inputs: { msg: 'rate limited (429)' },
      want: { throws: /\(\d+\)/ },
    },
    { name: 'truthy any', inputs: { msg: 'boom' }, want: { throws: true } },
  ],
  process: ({ inputs }) => {
    throw new Error(inputs.msg);
  },
  expects: ({ error, want }) => {
    expect(error).toBeDefined();
    if (typeof want.throws === 'string') expect(error.message).toContain(want.throws);
    else if (want.throws instanceof RegExp) expect(error.message).toMatch(want.throws);
  },
});

runTable({
  describe: 'runTable: mocks data is applied via processor + applyMocks helper',
  examples: [
    {
      name: 'sequential resolves',
      inputs: { calls: 2 },
      mocks: { fake: ['first', 'second'] },
      want: { values: ['first', 'second'] },
    },
    {
      name: 'reject as error in sequence',
      inputs: { calls: 2 },
      mocks: { fake: ['ok', new Error('fail')] },
      want: { values: ['ok'], errorMessage: 'fail' },
    },
  ],
  process: async ({ inputs, mocks }) => {
    const fake = vi.fn();
    applyMocks(mocks, { fake });
    const values = [];
    let errorMessage;
    for (let i = 0; i < inputs.calls; i++) {
      try {
        values.push(await fake());
      } catch (e) {
        errorMessage = e.message;
      }
    }
    return { values, errorMessage };
  },
  expects: ({ result, want }) => {
    expect(result.values).toEqual(want.values);
    if (want.errorMessage) expect(result.errorMessage).toBe(want.errorMessage);
  },
});

// ─── runTable: vary expansion + ctx exposure ─────────────────────────────

runTable({
  describe: 'runTable: vary expands to one row per combination',
  examples: [
    {
      name: 'doubler',
      inputs: ({ x }) => ({ x }),
      want: ({ x }) => ({ value: x * 2 }),
      vary: { x: [3, 4, 5] },
    },
  ],
  process: ({ inputs }) => inputs.x * 2,
  expects: ({ result, want, varied }) => {
    expect(result).toBe(want.value);
    expect(result).toBe(varied.x * 2);
  },
});

runTable({
  describe: 'runTable: ctx exposes inputs, mocks, want, varied',
  examples: [
    { name: 'all blocks', inputs: { x: 5 }, mocks: { fake: ['hi'] }, want: { value: 10 } },
  ],
  process: ({ inputs }) => inputs.x * 2,
  expects: ({ inputs, mocks, want, varied, error }) => {
    expect(error).toBeUndefined();
    expect(inputs).toEqual({ x: 5 });
    expect(mocks).toEqual({ fake: ['hi'] });
    expect(want).toEqual({ value: 10 });
    expect(varied).toEqual({});
  },
});

// ─── runTable: validation ────────────────────────────────────────────────

describe('runTable: validation', () => {
  it('throws when expects is missing', () => {
    expect(() =>
      runTable({
        examples: [{ name: 'x', inputs: { v: 1 } }],
        process: ({ inputs }) => inputs.v,
      })
    ).toThrow(/expects/);
  });
});

// ─── withRunner: curried form ─────────────────────────────────────────────

const runMul = withRunner({
  process: ({ inputs }) => inputs.a * inputs.b,
  expects: ({ result, want }) => expect(result).toBe(want.value),
});

runMul({
  describe: 'withRunner: first table',
  examples: [
    { name: '2 × 3', inputs: { a: 2, b: 3 }, want: { value: 6 } },
    { name: '4 × 5', inputs: { a: 4, b: 5 }, want: { value: 20 } },
  ],
});

runMul({
  describe: 'withRunner: second table reuses processor + expects',
  examples: [
    { name: '0 × n', inputs: { a: 0, b: 99 }, want: { value: 0 } },
    { name: '1 × n', inputs: { a: 1, b: 7 }, want: { value: 7 } },
  ],
});

// ─── async expects ────────────────────────────────────────────────────────

runTable({
  describe: 'runTable: async expects',
  examples: [{ name: 'awaits', inputs: {}, want: { value: 'result' } }],
  process: () => 'result',
  expects: async ({ result, want }) => {
    await new Promise((r) => setTimeout(r, 1));
    expect(result).toBe(want.value);
  },
});

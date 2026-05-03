import { describe, expect, it, vi } from 'vitest';
import {
  expandExamples,
  runTable,
  withRunner,
  equals,
  eq,
  contains,
  matches,
  partial,
  length,
  truthy,
  falsy,
  isNull,
  isUndefined,
  throws,
  all,
  when,
} from './index.js';

// ─── expandExamples ────────────────────────────────────────────────────────

const expandCases = [
  {
    name: 'pass through when vary is absent',
    inputs: { examples: [{ name: 'plain', inputs: { a: 1 }, want: { result: 2 } }] },
    want: [{ name: 'plain', inputs: { a: 1 }, want: { result: 2 }, check: undefined, varied: {} }],
  },
  {
    name: 'pass through when vary is empty object',
    inputs: { examples: [{ name: 'plain', inputs: { a: 1 }, want: 2, vary: {} }] },
    want: [{ name: 'plain', inputs: { a: 1 }, want: 2, check: undefined, varied: {} }],
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
      { name: 'increment (x=1)', inputs: { x: 1 }, want: 2, check: undefined, varied: { x: 1 } },
      { name: 'increment (x=2)', inputs: { x: 2 }, want: 3, check: undefined, varied: { x: 2 } },
      { name: 'increment (x=3)', inputs: { x: 3 }, want: 4, check: undefined, varied: { x: 3 } },
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
      {
        name: 'add (a=1, b=10)',
        inputs: { a: 1, b: 10 },
        want: 11,
        check: undefined,
        varied: { a: 1, b: 10 },
      },
      {
        name: 'add (a=1, b=20)',
        inputs: { a: 1, b: 20 },
        want: 21,
        check: undefined,
        varied: { a: 1, b: 20 },
      },
      {
        name: 'add (a=2, b=10)',
        inputs: { a: 2, b: 10 },
        want: 12,
        check: undefined,
        varied: { a: 2, b: 10 },
      },
      {
        name: 'add (a=2, b=20)',
        inputs: { a: 2, b: 20 },
        want: 22,
        check: undefined,
        varied: { a: 2, b: 20 },
      },
    ],
  },
  {
    name: 'empty axis values are skipped',
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
      { name: 'partial (a=1)', inputs: { a: 1 }, want: 1, check: undefined, varied: { a: 1 } },
      { name: 'partial (a=2)', inputs: { a: 2 }, want: 2, check: undefined, varied: { a: 2 } },
    ],
  },
  {
    name: 'check passes through when present',
    inputs: {
      examples: [{ name: 'with-check', inputs: 1, check: equals(1) }],
    },
    want: [
      {
        name: 'with-check',
        inputs: 1,
        want: undefined,
        check: expect.any(Function),
        varied: {},
      },
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

// ─── check builders (eat-our-own-dogfood: drive checks of checks via runTable) ──

const sumProcessor = ({ a, b }) => a + b;
const identityProcessor = (x) => x;
const throwingProcessor = ({ msg }) => {
  throw new Error(msg);
};

runTable({
  describe: 'check builders: equals',
  examples: [{ name: 'equals matches deep-equal value', inputs: { a: 1, b: 2 }, check: equals(3) }],
  process: sumProcessor,
});

runTable({
  describe: 'check builders: eq',
  examples: [{ name: 'eq matches identity', inputs: 'x', check: eq('x') }],
  process: identityProcessor,
});

runTable({
  describe: 'check builders: contains / matches / partial / length',
  examples: [
    { name: 'contains substring', inputs: 'hello world', check: contains('world') },
    { name: 'contains array element', inputs: [1, 2, 3], check: contains(2) },
    { name: 'matches RegExp', inputs: 'rate limited (429)', check: matches(/\(\d+\)/) },
    {
      name: 'partial picks fields',
      inputs: { a: 1, b: 2, c: 3 },
      check: partial({ a: 1, c: 3 }),
    },
    { name: 'length n', inputs: [1, 2, 3, 4], check: length(4) },
  ],
  process: identityProcessor,
});

runTable({
  describe: 'check builders: truthy / falsy / isNull / isUndefined',
  examples: [
    { name: 'truthy on non-empty string', inputs: 'x', check: truthy() },
    { name: 'falsy on 0', inputs: 0, check: falsy() },
    { name: 'isNull on null', inputs: null, check: isNull() },
    { name: 'isUndefined on undefined', inputs: undefined, check: isUndefined() },
  ],
  process: identityProcessor,
});

runTable({
  describe: 'check builders: throws',
  examples: [
    { name: 'throws=true accepts any error', inputs: { msg: 'boom' }, check: throws(true) },
    { name: 'throws() with no arg accepts any error', inputs: { msg: 'boom' }, check: throws() },
    {
      name: 'throws=string substring matches',
      inputs: { msg: 'kaboom now' },
      check: throws('kaboom'),
    },
    {
      name: 'throws=regexp matches',
      inputs: { msg: 'rate limited (429)' },
      check: throws(/\(\d+\)/),
    },
  ],
  process: throwingProcessor,
});

runTable({
  describe: 'check builders: all + when',
  examples: [
    {
      name: 'all runs every check',
      inputs: 'rate limited (429)',
      check: all(contains('rate limited'), matches(/\(\d+\)/)),
    },
    {
      name: 'when fires only on matching predicate',
      inputs: 'noise',
      check: when((ctx) => ctx.result.includes('rate'), contains('limited')),
    },
  ],
  process: identityProcessor,
});

// ─── ctx exposure ─────────────────────────────────────────────────────────

runTable({
  describe: 'ctx is { result, error, inputs, varied }',
  examples: [
    {
      name: 'check sees inputs and result together',
      inputs: { x: 5 },
      check: ({ result, inputs }) => {
        expect(inputs).toEqual({ x: 5 });
        expect(result).toBe(10);
      },
    },
    {
      name: 'check sees varied for vary-expanded rows',
      inputs: ({ multiplier }) => ({ x: multiplier }),
      vary: { multiplier: [3, 4] },
      check: ({ result, varied }) => {
        expect(result).toBe(varied.multiplier * 2);
      },
    },
  ],
  process: ({ x }) => x * 2,
});

// ─── backward-compat: want shapes still work ──────────────────────────────

runTable({
  describe: 'want shapes still work (deep-equal)',
  examples: [
    { name: '1 + 2 = 3', inputs: { a: 1, b: 2 }, want: 3 },
    { name: 'negatives', inputs: { a: -5, b: 3 }, want: -2 },
  ],
  process: sumProcessor,
});

runTable({
  describe: 'want shapes still work (matchers)',
  examples: [
    { name: 'eq', inputs: 1, want: { eq: 1 } },
    { name: 'contains', inputs: 'foobar', want: { contains: 'oo' } },
    { name: 'matches', inputs: '429', want: { matches: /\d+/ } },
    { name: 'partial', inputs: { a: 1, b: 2 }, want: { partial: { a: 1 } } },
    { name: 'throws=true', inputs: { msg: 'boom' }, want: { throws: true } },
    { name: 'literal undefined', inputs: undefined, want: undefined },
    { name: 'literal null', inputs: null, want: null },
  ],
  process: (x) => (typeof x === 'object' && x?.msg ? throwingProcessor(x) : x),
});

// ─── curried form ─────────────────────────────────────────────────────────

const sharedProcessor = vi.fn(({ a, b }) => a * b);
const runShared = withRunner({ process: sharedProcessor });

runShared({
  describe: 'withRunner: first table',
  examples: [
    { name: '2 × 3', inputs: { a: 2, b: 3 }, check: equals(6) },
    { name: '4 × 5', inputs: { a: 4, b: 5 }, check: equals(20) },
  ],
});

runShared({
  describe: 'withRunner: second table reuses processor',
  examples: [
    { name: '0 × n is 0', inputs: { a: 0, b: 99 }, check: equals(0) },
    { name: '1 × n is n', inputs: { a: 1, b: 7 }, check: equals(7) },
  ],
});

// ─── async checks ─────────────────────────────────────────────────────────

runTable({
  describe: 'check can be async',
  examples: [
    {
      name: 'async check awaits',
      inputs: 'result',
      check: async (ctx) => {
        await new Promise((r) => setTimeout(r, 1));
        expect(ctx.result).toBe('result');
      },
    },
  ],
  process: identityProcessor,
});

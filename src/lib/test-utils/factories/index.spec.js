import { describe, expect, it } from 'vitest';
import { Factory } from 'fishery';
import {
  popReferenceFactory,
  popReferenceMatchFactory,
  popReferenceResponseFactory,
  popReferenceVariants,
  popReferenceWithCount,
  makeResponseVariants,
} from './index.js';
import { runTable } from '../../examples-runner/index.js';

// ─── pop-reference factories ───────────────────────────────────────────────
// Each factory is a relational test (sequence advances, override replaces)
// that doesn't reduce to a single result/want compare — kept as describe/it.

describe('popReferenceMatchFactory', () => {
  it('builds a match with text, start, end', () => {
    const m = popReferenceMatchFactory.build();
    expect(m).toEqual(
      expect.objectContaining({
        text: expect.any(String),
        start: expect.any(Number),
        end: expect.any(Number),
      })
    );
  });

  it('sequence advances on successive builds', () => {
    const a = popReferenceMatchFactory.build();
    const b = popReferenceMatchFactory.build();
    expect(b.start).toBeGreaterThan(a.start);
  });

  it('overrides take effect', () => {
    const m = popReferenceMatchFactory.build({ text: 'manual', start: 0, end: 6 });
    expect(m).toEqual({ text: 'manual', start: 0, end: 6 });
  });
});

describe('popReferenceFactory', () => {
  it('builds a reference with all required fields', () => {
    const r = popReferenceFactory.build();
    expect(r).toEqual(
      expect.objectContaining({
        reference: expect.any(String),
        source: expect.any(String),
        score: expect.any(Number),
        match: expect.objectContaining({
          text: expect.any(String),
          start: expect.any(Number),
          end: expect.any(Number),
        }),
      })
    );
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it('buildList(n) returns n distinct references', () => {
    const list = popReferenceFactory.buildList(4);
    expect(list).toHaveLength(4);
    const refs = new Set(list.map((r) => r.reference));
    expect(refs.size).toBe(4);
  });
});

describe('popReferenceResponseFactory', () => {
  it('builds a response with references[]', () => {
    const r = popReferenceResponseFactory.build();
    expect(Array.isArray(r.references)).toBe(true);
    expect(r.references.length).toBeGreaterThan(0);
  });

  it('overriding references replaces the array', () => {
    const r = popReferenceResponseFactory.build({ references: [] });
    expect(r.references).toEqual([]);
  });
});

// ─── popReferenceWithCount: parameterized via runTable ────────────────────

runTable({
  describe: 'popReferenceWithCount',
  examples: [
    { name: 'count=0', inputs: { count: 0 }, want: { length: 0 } },
    { name: 'count=1', inputs: { count: 1 }, want: { length: 1 } },
    { name: 'count=3', inputs: { count: 3 }, want: { length: 3 } },
    { name: 'count=7', inputs: { count: 7 }, want: { length: 7 } },
  ],
  process: ({ inputs }) => popReferenceWithCount(inputs.count).references.length,
  expects: ({ result, want }) => expect(result).toBe(want.length),
});

// ─── variants vocabulary (LlmMockResponse contract) ────────────────────────

const expectedVariantKeys = [
  'wellFormed',
  'empty',
  'isNull',
  'undefinedValue',
  'malformedShape',
  'rejected',
  'undersized',
  'oversized',
];

runTable({
  describe: 'popReferenceVariants — every variant exposed as function',
  examples: expectedVariantKeys.map((key) => ({
    name: `exposes ${key}`,
    inputs: { key },
    want: { type: 'function' },
  })),
  process: ({ inputs }) => typeof popReferenceVariants[inputs.key],
  expects: ({ result, want }) => expect(result).toBe(want.type),
});

describe('popReferenceVariants — value shape', () => {
  it('wellFormed returns the documented response shape', () => {
    const r = popReferenceVariants.wellFormed();
    expect(Array.isArray(r.references)).toBe(true);
  });

  it('empty returns { references: [] }', () => {
    expect(popReferenceVariants.empty()).toEqual({ references: [] });
  });

  it('isNull returns null', () => {
    expect(popReferenceVariants.isNull()).toBeNull();
  });

  it('undefinedValue returns undefined', () => {
    expect(popReferenceVariants.undefinedValue()).toBeUndefined();
  });

  it('malformedShape returns a deliberately wrong shape', () => {
    const r = popReferenceVariants.malformedShape();
    expect(r).not.toHaveProperty('references');
  });

  it('rejected throws the supplied error', () => {
    const err = new Error('rate limit');
    expect(() => popReferenceVariants.rejected(err)).toThrow('rate limit');
  });

  it('undersized returns an empty references array', () => {
    expect(popReferenceVariants.undersized().references).toEqual([]);
  });

  it('oversized returns more than the well-formed default', () => {
    const wellFormedSize = popReferenceVariants.wellFormed().references.length;
    expect(popReferenceVariants.oversized().references.length).toBeGreaterThan(wellFormedSize);
  });
});

// ─── makeResponseVariants helper ───────────────────────────────────────────

const exampleBase = Factory.define(() => ({ items: [{ id: 1 }] }));

runTable({
  describe: 'makeResponseVariants',
  examples: [
    {
      name: 'throws when base is not a fishery Factory',
      inputs: { args: { base: null } },
      want: { throws: 'fishery Factory' },
    },
    {
      name: 'returns full variants when arrayKey is set with makeArrayItem',
      inputs: {
        args: { base: exampleBase, arrayKey: 'items', makeArrayItem: () => ({ id: 2 }) },
      },
      want: {
        value: [
          'empty',
          'isNull',
          'malformedShape',
          'oversized',
          'rejected',
          'undefinedValue',
          'undersized',
          'wellFormed',
        ],
      },
    },
    {
      name: 'omits size variants when arrayKey is null',
      inputs: { args: { base: exampleBase, arrayKey: null } },
      want: {
        value: ['empty', 'isNull', 'malformedShape', 'rejected', 'undefinedValue', 'wellFormed'],
      },
    },
  ],
  process: ({ inputs }) => {
    const result = makeResponseVariants(inputs.args);
    return Object.keys(result).sort();
  },
  expects: ({ result, error, want }) => {
    if ('throws' in want) {
      expect(error?.message).toContain(want.throws);
      return;
    }
    if (error) throw error;
    expect(result).toEqual(want.value);
  },
});

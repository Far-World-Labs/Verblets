import { describe, expect, it } from 'vitest';
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
//
// Verify each fishery factory produces the documented shape, sequence
// counters advance, and overrides take effect.

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

describe('popReferenceWithCount', () => {
  it.each([0, 1, 3, 7])('produces a response with %i references', (n) => {
    expect(popReferenceWithCount(n).references).toHaveLength(n);
  });
});

// ─── variants vocabulary (LlmMockResponse contract) ────────────────────────
//
// The variants share names across chains, even when the payload shapes differ.
// These tests pin the contract for pop-reference; other chains will have
// equivalent specs using the same expected variant keys.

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

describe('popReferenceVariants', () => {
  it.each(expectedVariantKeys)('exposes %s', (key) => {
    expect(typeof popReferenceVariants[key]).toBe('function');
  });

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

// ─── makeResponseVariants helper itself ────────────────────────────────────
//
// Driven through runTable: confirms the helper rejects bad inputs and
// produces every expected variant key when the inputs are good.

import { Factory } from 'fishery';

const exampleBase = Factory.define(() => ({ items: [{ id: 1 }] }));

const variantsBuilderCases = [
  {
    name: 'throws when base is not a fishery Factory',
    inputs: { base: null },
    want: { throws: 'fishery Factory' },
  },
  {
    name: 'returns base variants when arrayKey is set with makeArrayItem',
    inputs: { base: exampleBase, arrayKey: 'items', makeArrayItem: () => ({ id: 2 }) },
    // Object.keys().sort() — alphabetical
    want: [
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
  {
    name: 'omits size variants when arrayKey is null',
    inputs: { base: exampleBase, arrayKey: null },
    want: ['empty', 'isNull', 'malformedShape', 'rejected', 'undefinedValue', 'wellFormed'],
  },
];

runTable({
  describe: 'makeResponseVariants',
  examples: variantsBuilderCases,
  process: (inputs) => {
    const result = makeResponseVariants(inputs);
    return Object.keys(result).sort();
  },
});

// The first case is a throw spec; the second/third assert sorted-key arrays —
// align the want arrays with sort order.

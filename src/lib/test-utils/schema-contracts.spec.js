import { describe, expect, it } from 'vitest';

// ==========================================
// Centralized Schema Contract Tests
// ==========================================
//
// All verblet schemas follow one of two auto-unwrapping contracts:
//   - **value**: single-value (`{ value: ... }`) — callLlm auto-unwraps to the value
//   - **items**: array (`{ items: [...] }`) — callLlm auto-unwraps to the array
//
// This file verifies every schema satisfies its contract in a data-driven
// test, replacing per-verblet "uses value/items schema for auto-unwrapping"
// tests.
//
// Chain-specific schema BEHAVIOR (e.g. enum values, custom properties)
// is tested in the verblet's own spec file.
// ==========================================

// --- Value schemas (single-value auto-unwrap) ---
import { embedRewriteQuerySchema } from '../../verblets/embed-rewrite-query/schema.js';
import { schema as embedRewriteToOutputDocSchema } from '../../verblets/embed-rewrite-to-output-doc/schema.js';
import { booleanSchema } from '../../verblets/bool/schema.js';
import { nameSchema } from '../../verblets/name/schema.js';
import { nameSimilarSchema } from '../../verblets/name-similar-to/schema.js';
import { numberSchema } from '../../verblets/number/schema.js';
import { sentimentSchema } from '../../verblets/sentiment/schema.js';

// --- Items schemas (array auto-unwrap) ---
import { embedSubquestionsSchema } from '../../verblets/embed-subquestions/schema.js';
import { embedStepBackSchema } from '../../verblets/embed-step-back/schema.js';
import { embedMultiQuerySchema } from '../../verblets/embed-multi-query/schema.js';

// --- Factory schemas (produce value schemas from arguments) ---
import { createEnumSchema } from '../../verblets/enum/schema.js';

const valueSchemas = [
  ['embedRewriteQuerySchema', embedRewriteQuerySchema],
  ['embedRewriteToOutputDocSchema', embedRewriteToOutputDocSchema],
  ['booleanSchema', booleanSchema],
  ['nameSchema', nameSchema],
  ['nameSimilarSchema', nameSimilarSchema],
  ['numberSchema', numberSchema],
  ['sentimentSchema', sentimentSchema],
];

const itemsSchemas = [
  ['embedSubquestionsSchema', embedSubquestionsSchema],
  ['embedStepBackSchema', embedStepBackSchema],
  ['embedMultiQuerySchema', embedMultiQuerySchema],
];

describe('value schema contract', () => {
  it.each(valueSchemas)(
    '%s: has value property in required object with no extras',
    (_name, schema) => {
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('value');
      expect(schema.required).toContain('value');
      expect(schema.additionalProperties).toBe(false);
    }
  );
});

describe('items schema contract', () => {
  it.each(itemsSchemas)(
    '%s: has items array property in required object with no extras',
    (_name, schema) => {
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('items');
      expect(schema.properties.items.type).toBe('array');
      expect(schema.properties.items.items.type).toBe('string');
      expect(schema.required).toContain('items');
      expect(schema.additionalProperties).toBe(false);
    }
  );
});

describe('factory schema contract', () => {
  it('createEnumSchema: produces valid value schema', () => {
    const schema = createEnumSchema({ red: 'Red', blue: 'Blue' });
    expect(schema.type).toBe('object');
    expect(schema.properties).toHaveProperty('value');
    expect(schema.properties.value.enum).toContain('red');
    expect(schema.properties.value.enum).toContain('blue');
    expect(schema.properties.value.enum).toContain('undefined');
    expect(schema.required).toContain('value');
    expect(schema.additionalProperties).toBe(false);
  });
});

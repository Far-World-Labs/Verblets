import { vi, expect } from 'vitest';
import relationItem, {
  relationSpec,
  relationInstructions,
  parseRDFLiteral,
  parseRelations,
  mapRelations,
  mapRelationsParallel,
} from './index.js';
import llm from '../../lib/llm/index.js';
import map from '../map/index.js';
import { runTable, equals, partial, throws } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn().mockImplementation((prompt, config) => {
    if (config?.responseFormat?.json_schema?.name === 'relation_result') {
      return Promise.resolve({
        items: [
          { subject: 'Apple', predicate: 'partnered with', object: 'Microsoft' },
          { subject: 'CEO', predicate: 'manages', object: 'company' },
          { subject: 'John', predicate: 'works for', object: 'Microsoft' },
          { subject: 'Amazon', predicate: 'acquired', object: 'Whole Foods' },
          { subject: 'Google', predicate: 'competes with', object: 'Apple' },
          { subject: 'Microsoft', predicate: 'acquired', object: 'GitHub' },
        ],
      });
    }
    if (
      prompt.includes('relation specification') ||
      prompt.includes('Analyze these relation extraction instructions')
    ) {
      return Promise.resolve('Extract subject-predicate-object relationships from text');
    }
    return Promise.resolve('Mock response');
  }),
}));

vi.mock('../../lib/parallel-batch/index.js', () => ({
  default: vi.fn(async (items, processor) => {
    for (let i = 0; i < items.length; i++) await processor(items[i], i);
  }),
}));

vi.mock('../map/index.js', () => ({ default: vi.fn() }));

// ─── relationSpec ─────────────────────────────────────────────────────────

runTable({
  describe: 'relationSpec',
  examples: [
    {
      name: 'generates spec from string instructions',
      inputs: { instructions: 'Extract causal relationships' },
      check: equals('Extract subject-predicate-object relationships from text'),
    },
    {
      name: 'handles object instructions with entities and predicates',
      inputs: {
        instructions: {
          relations: 'Extract business relationships',
          entities: [{ name: 'Apple', canonical: 'Apple Inc.' }],
          predicates: ['manages', 'reports to'],
        },
      },
      check: equals('Extract subject-predicate-object relationships from text'),
    },
  ],
  process: ({ instructions }) => relationSpec(instructions),
});

// ─── relationItem ─────────────────────────────────────────────────────────

runTable({
  describe: 'relationItem',
  examples: [
    {
      name: 'combines spec generation and extraction',
      inputs: {
        text: 'Amazon acquired Whole Foods for $13.7 billion.',
        instructions: 'Extract acquisitions',
      },
      check: ({ result }) => expect(result.length).toBeGreaterThan(0),
    },
  ],
  process: ({ text, instructions }) => relationItem(text, instructions),
});

// ─── relationInstructions ─────────────────────────────────────────────────

runTable({
  describe: 'relationInstructions',
  examples: [
    {
      name: 'returns instruction bundle with spec',
      inputs: { spec: 'Relation specification' },
      check: ({ result }) => {
        expect(result.text).toContain('relation specification');
        expect(result.spec).toBe('Relation specification');
      },
    },
    {
      name: 'passes through additional context keys',
      inputs: { spec: 'spec', entityContext: 'known entities' },
      check: partial({ entityContext: 'known entities' }),
    },
  ],
  process: (params) => relationInstructions(params),
});

// ─── parseRDFLiteral ──────────────────────────────────────────────────────

runTable({
  describe: 'parseRDFLiteral',
  examples: [
    { name: 'integer', inputs: { value: '42^^xsd:integer' }, check: equals(42) },
    { name: 'negative integer', inputs: { value: '-100^^xsd:int' }, check: equals(-100) },
    { name: 'decimal', inputs: { value: '3.14^^xsd:decimal' }, check: equals(3.14) },
    { name: 'double', inputs: { value: '1.5e10^^xsd:double' }, check: equals(1.5e10) },
    { name: 'true boolean', inputs: { value: 'true^^xsd:boolean' }, check: equals(true) },
    { name: 'false boolean', inputs: { value: 'false^^xsd:boolean' }, check: equals(false) },
    {
      name: 'string',
      inputs: { value: 'hello world^^xsd:string' },
      check: equals('hello world'),
    },
    {
      name: 'date literal',
      inputs: { value: '2024-01-15^^xsd:date' },
      check: ({ result }) => {
        expect(result instanceof Date).toBe(true);
        expect(result.toISOString()).toBe('2024-01-15T00:00:00.000Z');
      },
    },
    {
      name: 'dateTime literal',
      inputs: { value: '2024-01-15T14:30:00Z^^xsd:dateTime' },
      check: ({ result }) => expect(result.toISOString()).toBe('2024-01-15T14:30:00.000Z'),
    },
    {
      name: 'leaves plain string unchanged',
      inputs: { value: 'Apple Inc.' },
      check: equals('Apple Inc.'),
    },
    { name: 'leaves number unchanged', inputs: { value: 42 }, check: equals(42) },
    { name: 'leaves null unchanged', inputs: { value: null }, check: equals(null) },
    { name: 'leaves undefined unchanged', inputs: { value: undefined }, check: equals(undefined) },
  ],
  process: ({ value }) => parseRDFLiteral(value),
});

// ─── parseRelations ───────────────────────────────────────────────────────

runTable({
  describe: 'parseRelations',
  examples: [
    {
      name: 'parses RDF literals in object and metadata fields',
      inputs: {
        relations: [
          { subject: 'Apple', predicate: 'has revenue', object: '383000000000^^xsd:decimal' },
          { subject: 'Tim Cook', predicate: 'is CEO', object: 'true^^xsd:boolean' },
          {
            subject: 'Apple',
            predicate: 'acquired',
            object: 'Beats',
            metadata: { price: '3000000000^^xsd:decimal', year: '2014^^xsd:integer' },
          },
        ],
      },
      check: ({ result }) => {
        expect(result[0].object).toBe(383000000000);
        expect(result[1].object).toBe(true);
        expect(result[2].metadata.price).toBe(3000000000);
        expect(result[2].metadata.year).toBe(2014);
      },
    },
    {
      name: 'leaves entity references unchanged',
      inputs: {
        relations: [
          { subject: 'Apple Inc.', predicate: 'competes with', object: 'Microsoft Corporation' },
        ],
      },
      check: ({ result }) => expect(result[0].object).toBe('Microsoft Corporation'),
    },
  ],
  process: ({ relations }) => parseRelations(relations),
});

// ─── mapRelationsParallel ─────────────────────────────────────────────────

runTable({
  describe: 'mapRelationsParallel',
  examples: [
    {
      name: 'extracts relations per text and returns aligned arrays',
      inputs: { texts: ['First text.', 'Second text.'], instructions: 'Extract' },
      check: ({ result }) => {
        expect(result).toHaveLength(2);
        expect(Array.isArray(result[0])).toBe(true);
        expect(result[0][0]).toMatchObject({ subject: expect.any(String) });
      },
    },
    {
      name: 'skips spec generation when bundled',
      inputs: {
        texts: ['t1', 't2'],
        instructions: { text: 'x', spec: 'reused-spec' },
        preMock: () => vi.mocked(llm).mockClear(),
      },
      check: () => {
        const specCalls = vi
          .mocked(llm)
          .mock.calls.filter(([prompt]) => prompt.includes('Analyze these relation extraction'));
        expect(specCalls).toHaveLength(0);
      },
    },
    {
      name: 'throws when texts is not an array',
      inputs: { texts: 'not-an-array', instructions: 'x' },
      check: throws(/must be an array/),
    },
  ],
  process: async ({ texts, instructions, preMock }) => {
    if (preMock) preMock();
    return mapRelationsParallel(texts, instructions);
  },
});

// ─── mapRelations ─────────────────────────────────────────────────────────

runTable({
  describe: 'mapRelations',
  examples: [
    {
      name: 'routes through map() with the relations batch responseFormat',
      inputs: {
        texts: ['t1', 't2'],
        instructions: { text: 'x', spec: 'reused' },
        preMock: () =>
          vi
            .mocked(map)
            .mockResolvedValueOnce([
              { relations: [{ subject: 'A', predicate: 'is', object: 'thing' }] },
              { relations: [] },
            ]),
      },
      check: ({ result }) => {
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual([{ subject: 'A', predicate: 'is', object: 'thing' }]);
        expect(result[1]).toEqual([]);
        const mapConfig = vi.mocked(map).mock.calls[0][2];
        expect(mapConfig.responseFormat?.json_schema?.name).toBe('relation_batch');
      },
    },
    {
      name: 'parses RDF literals on per-text relations',
      inputs: {
        texts: ['t1'],
        instructions: { text: 'x', spec: 'reused' },
        preMock: () =>
          vi
            .mocked(map)
            .mockResolvedValueOnce([
              { relations: [{ subject: 'X', predicate: 'count', object: '42^^xsd:integer' }] },
            ]),
      },
      check: ({ result }) => expect(result[0][0].object).toBe(42),
    },
    {
      name: 'throws when texts is not an array',
      inputs: { texts: 'not-an-array', instructions: 'x' },
      check: throws(/must be an array/),
    },
  ],
  process: async ({ texts, instructions, preMock }) => {
    if (preMock) preMock();
    return mapRelations(texts, instructions);
  },
});

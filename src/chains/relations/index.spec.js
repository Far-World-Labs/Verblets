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
import { runTable } from '../../lib/examples-runner/index.js';

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

// ─── relationSpec ────────────────────────────────────────────────────────

runTable({
  describe: 'relationSpec',
  examples: [
    {
      name: 'generates spec from string instructions',
      inputs: {
        instructions: 'Extract causal relationships',
        want: 'Extract subject-predicate-object relationships from text',
      },
    },
    {
      name: 'handles object instructions with entities and predicates',
      inputs: {
        instructions: {
          relations: 'Extract business relationships',
          entities: [{ name: 'Apple', canonical: 'Apple Inc.' }],
          predicates: ['manages', 'reports to'],
        },
        want: 'Extract subject-predicate-object relationships from text',
      },
    },
  ],
  process: ({ instructions }) => relationSpec(instructions),
  expects: ({ result, inputs }) => expect(result).toEqual(inputs.want),
});

// ─── relationItem ────────────────────────────────────────────────────────

runTable({
  describe: 'relationItem',
  examples: [
    {
      name: 'combines spec generation and extraction',
      inputs: {
        text: 'Amazon acquired Whole Foods for $13.7 billion.',
        instructions: 'Extract acquisitions',
      },
    },
  ],
  process: ({ text, instructions }) => relationItem(text, instructions),
  expects: ({ result }) => expect(result.length).toBeGreaterThan(0),
});

// ─── relationInstructions ────────────────────────────────────────────────

runTable({
  describe: 'relationInstructions',
  examples: [
    {
      name: 'returns instruction bundle with spec',
      inputs: {
        spec: 'Relation specification',
        wantTextContains: 'relation specification',
      },
    },
    {
      name: 'passes through additional context keys',
      inputs: {
        spec: 'spec',
        entityContext: 'known entities',
        want: { entityContext: 'known entities' },
      },
    },
  ],
  process: (params) => relationInstructions(params),
  expects: ({ result, inputs }) => {
    if (inputs.wantTextContains) {
      expect(result.text).toContain(inputs.wantTextContains);
      expect(result.spec).toBe(inputs.spec);
    }
    if ('want' in inputs) expect(result).toMatchObject(inputs.want);
  },
});

// ─── parseRDFLiteral ─────────────────────────────────────────────────────

runTable({
  describe: 'parseRDFLiteral',
  examples: [
    { name: 'integer', inputs: { value: '42^^xsd:integer', want: 42 } },
    { name: 'negative integer', inputs: { value: '-100^^xsd:int', want: -100 } },
    { name: 'decimal', inputs: { value: '3.14^^xsd:decimal', want: 3.14 } },
    { name: 'double', inputs: { value: '1.5e10^^xsd:double', want: 1.5e10 } },
    { name: 'true boolean', inputs: { value: 'true^^xsd:boolean', want: true } },
    { name: 'false boolean', inputs: { value: 'false^^xsd:boolean', want: false } },
    { name: 'string', inputs: { value: 'hello world^^xsd:string', want: 'hello world' } },
    {
      name: 'date literal',
      inputs: { value: '2024-01-15^^xsd:date', wantIso: '2024-01-15T00:00:00.000Z' },
    },
    {
      name: 'dateTime literal',
      inputs: { value: '2024-01-15T14:30:00Z^^xsd:dateTime', wantIso: '2024-01-15T14:30:00.000Z' },
    },
    { name: 'leaves plain string unchanged', inputs: { value: 'Apple Inc.', want: 'Apple Inc.' } },
    { name: 'leaves number unchanged', inputs: { value: 42, want: 42 } },
    { name: 'leaves null unchanged', inputs: { value: null, want: null } },
    { name: 'leaves undefined unchanged', inputs: { value: undefined, want: undefined } },
  ],
  process: ({ value }) => parseRDFLiteral(value),
  expects: ({ result, inputs }) => {
    if (inputs.wantIso) {
      expect(result instanceof Date).toBe(true);
      expect(result.toISOString()).toBe(inputs.wantIso);
      return;
    }
    expect(result).toEqual(inputs.want);
  },
});

// ─── parseRelations ──────────────────────────────────────────────────────

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
        wantParsed: {
          0: { object: 383000000000 },
          1: { object: true },
          2: { metadata: { price: 3000000000, year: 2014 } },
        },
      },
    },
    {
      name: 'leaves entity references unchanged',
      inputs: {
        relations: [
          { subject: 'Apple Inc.', predicate: 'competes with', object: 'Microsoft Corporation' },
        ],
        wantParsed: { 0: { object: 'Microsoft Corporation' } },
      },
    },
  ],
  process: ({ relations }) => parseRelations(relations),
  expects: ({ result, inputs }) => {
    for (const [idx, shape] of Object.entries(inputs.wantParsed)) {
      expect(result[Number(idx)]).toMatchObject(shape);
    }
  },
});

// ─── mapRelationsParallel ────────────────────────────────────────────────

runTable({
  describe: 'mapRelationsParallel',
  examples: [
    {
      name: 'extracts relations per text and returns aligned arrays',
      inputs: {
        texts: ['First text.', 'Second text.'],
        instructions: 'Extract',
        wantLength: 2,
        wantFirstIsArray: true,
        wantFirstFirstHasSubject: true,
      },
    },
    {
      name: 'skips spec generation when bundled',
      inputs: {
        texts: ['t1', 't2'],
        instructions: { text: 'x', spec: 'reused-spec' },
        mock: () => vi.mocked(llm).mockClear(),
        wantNoSpecCalls: true,
      },
    },
    {
      name: 'throws when texts is not an array',
      inputs: { texts: 'not-an-array', instructions: 'x', throws: /must be an array/ },
    },
  ],
  process: async ({ texts, instructions, mock }) => {
    if (mock) mock();
    return mapRelationsParallel(texts, instructions);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('wantLength' in inputs) expect(result).toHaveLength(inputs.wantLength);
    if (inputs.wantFirstIsArray) expect(Array.isArray(result[0])).toBe(true);
    if (inputs.wantFirstFirstHasSubject) {
      expect(result[0][0]).toMatchObject({ subject: expect.any(String) });
    }
    if (inputs.wantNoSpecCalls) {
      const specCalls = vi
        .mocked(llm)
        .mock.calls.filter(([prompt]) => prompt.includes('Analyze these relation extraction'));
      expect(specCalls).toHaveLength(0);
    }
  },
});

// ─── mapRelations ────────────────────────────────────────────────────────

runTable({
  describe: 'mapRelations',
  examples: [
    {
      name: 'routes through map() with the relations batch responseFormat',
      inputs: {
        texts: ['t1', 't2'],
        instructions: { text: 'x', spec: 'reused' },
        mock: () =>
          vi
            .mocked(map)
            .mockResolvedValueOnce([
              { relations: [{ subject: 'A', predicate: 'is', object: 'thing' }] },
              { relations: [] },
            ]),
        want: [[{ subject: 'A', predicate: 'is', object: 'thing' }], []],
        wantSchemaName: 'relation_batch',
      },
    },
    {
      name: 'parses RDF literals on per-text relations',
      inputs: {
        texts: ['t1'],
        instructions: { text: 'x', spec: 'reused' },
        mock: () =>
          vi
            .mocked(map)
            .mockResolvedValueOnce([
              { relations: [{ subject: 'X', predicate: 'count', object: '42^^xsd:integer' }] },
            ]),
        wantParsedObject: 42,
      },
    },
    {
      name: 'throws when texts is not an array',
      inputs: { texts: 'not-an-array', instructions: 'x', throws: /must be an array/ },
    },
  ],
  process: async ({ texts, instructions, mock }) => {
    if (mock) mock();
    return mapRelations(texts, instructions);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if (inputs.wantSchemaName) {
      const mapConfig = vi.mocked(map).mock.calls[0][2];
      expect(mapConfig.responseFormat?.json_schema?.name).toBe(inputs.wantSchemaName);
    }
    if ('wantParsedObject' in inputs) {
      expect(result[0][0].object).toBe(inputs.wantParsedObject);
    }
  },
});

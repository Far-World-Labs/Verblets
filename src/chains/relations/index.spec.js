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
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

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

runTable({
  describe: 'relationSpec',
  examples: [
    {
      name: 'generates spec from string instructions',
      inputs: { instructions: 'Extract causal relationships' },
      want: { value: 'Extract subject-predicate-object relationships from text' },
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
      want: { value: 'Extract subject-predicate-object relationships from text' },
    },
  ],
  process: ({ inputs }) => relationSpec(inputs.instructions),
  expects: ({ result, want }) => expect(result).toEqual(want.value),
});

runTable({
  describe: 'relationItem',
  examples: [
    {
      name: 'combines spec generation and extraction',
      inputs: {
        text: 'Amazon acquired Whole Foods for $13.7 billion.',
        instructions: 'Extract acquisitions',
      },
      want: {},
    },
  ],
  process: ({ inputs }) => relationItem(inputs.text, inputs.instructions),
  expects: ({ result }) => expect(result.length).toBeGreaterThan(0),
});

runTable({
  describe: 'relationInstructions',
  examples: [
    {
      name: 'returns instruction bundle with spec',
      inputs: { spec: 'Relation specification' },
      want: { textContains: 'relation specification' },
    },
    {
      name: 'passes through additional context keys',
      inputs: { spec: 'spec', entityContext: 'known entities' },
      want: { matches: { entityContext: 'known entities' } },
    },
  ],
  process: ({ inputs }) => relationInstructions(inputs),
  expects: ({ result, inputs, want }) => {
    if (want.textContains) {
      expect(result.text).toContain(want.textContains);
      expect(result.spec).toBe(inputs.spec);
    }
    if (want.matches) expect(result).toMatchObject(want.matches);
  },
});

runTable({
  describe: 'parseRDFLiteral',
  examples: [
    { name: 'integer', inputs: { value: '42^^xsd:integer' }, want: { value: 42 } },
    { name: 'negative integer', inputs: { value: '-100^^xsd:int' }, want: { value: -100 } },
    { name: 'decimal', inputs: { value: '3.14^^xsd:decimal' }, want: { value: 3.14 } },
    { name: 'double', inputs: { value: '1.5e10^^xsd:double' }, want: { value: 1.5e10 } },
    { name: 'true boolean', inputs: { value: 'true^^xsd:boolean' }, want: { value: true } },
    { name: 'false boolean', inputs: { value: 'false^^xsd:boolean' }, want: { value: false } },
    {
      name: 'string',
      inputs: { value: 'hello world^^xsd:string' },
      want: { value: 'hello world' },
    },
    {
      name: 'date literal',
      inputs: { value: '2024-01-15^^xsd:date' },
      want: { iso: '2024-01-15T00:00:00.000Z' },
    },
    {
      name: 'dateTime literal',
      inputs: { value: '2024-01-15T14:30:00Z^^xsd:dateTime' },
      want: { iso: '2024-01-15T14:30:00.000Z' },
    },
    {
      name: 'leaves plain string unchanged',
      inputs: { value: 'Apple Inc.' },
      want: { value: 'Apple Inc.' },
    },
    { name: 'leaves number unchanged', inputs: { value: 42 }, want: { value: 42 } },
    { name: 'leaves null unchanged', inputs: { value: null }, want: { value: null } },
    {
      name: 'leaves undefined unchanged',
      inputs: { value: undefined },
      want: { value: undefined },
    },
  ],
  process: ({ inputs }) => parseRDFLiteral(inputs.value),
  expects: ({ result, want }) => {
    if (want.iso) {
      expect(result instanceof Date).toBe(true);
      expect(result.toISOString()).toBe(want.iso);
      return;
    }
    expect(result).toEqual(want.value);
  },
});

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
      want: {
        parsed: {
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
      },
      want: { parsed: { 0: { object: 'Microsoft Corporation' } } },
    },
  ],
  process: ({ inputs }) => parseRelations(inputs.relations),
  expects: ({ result, want }) => {
    for (const [idx, shape] of Object.entries(want.parsed)) {
      expect(result[Number(idx)]).toMatchObject(shape);
    }
  },
});

runTable({
  describe: 'mapRelationsParallel',
  examples: [
    {
      name: 'extracts relations per text and returns aligned arrays',
      inputs: { texts: ['First text.', 'Second text.'], instructions: 'Extract' },
      want: { length: 2, firstIsArray: true, firstFirstHasSubject: true },
    },
    {
      name: 'skips spec generation when bundled',
      inputs: {
        texts: ['t1', 't2'],
        instructions: { text: 'x', spec: 'reused-spec' },
        clearLlm: true,
      },
      want: { noSpecCalls: true },
    },
    {
      name: 'throws when texts is not an array',
      inputs: { texts: 'not-an-array', instructions: 'x' },
      want: { throws: /must be an array/ },
    },
  ],
  process: async ({ inputs }) => {
    if (inputs.clearLlm) vi.mocked(llm).mockClear();
    return mapRelationsParallel(inputs.texts, inputs.instructions);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('length' in want) expect(result).toHaveLength(want.length);
    if (want.firstIsArray) expect(Array.isArray(result[0])).toBe(true);
    if (want.firstFirstHasSubject) {
      expect(result[0][0]).toMatchObject({ subject: expect.any(String) });
    }
    if (want.noSpecCalls) {
      const specCalls = vi
        .mocked(llm)
        .mock.calls.filter(([prompt]) => prompt.includes('Analyze these relation extraction'));
      expect(specCalls).toHaveLength(0);
    }
  },
});

runTable({
  describe: 'mapRelations',
  examples: [
    {
      name: 'routes through map() with the relations batch responseFormat',
      inputs: { texts: ['t1', 't2'], instructions: { text: 'x', spec: 'reused' } },
      mocks: {
        map: [
          [{ relations: [{ subject: 'A', predicate: 'is', object: 'thing' }] }, { relations: [] }],
        ],
      },
      want: {
        value: [[{ subject: 'A', predicate: 'is', object: 'thing' }], []],
        schemaName: 'relation_batch',
      },
    },
    {
      name: 'parses RDF literals on per-text relations',
      inputs: { texts: ['t1'], instructions: { text: 'x', spec: 'reused' } },
      mocks: {
        map: [[{ relations: [{ subject: 'X', predicate: 'count', object: '42^^xsd:integer' }] }]],
      },
      want: { parsedObject: 42 },
    },
    {
      name: 'throws when texts is not an array',
      inputs: { texts: 'not-an-array', instructions: 'x' },
      want: { throws: /must be an array/ },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { map });
    return mapRelations(inputs.texts, inputs.instructions);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want) expect(result).toEqual(want.value);
    if (want.schemaName) {
      const mapConfig = vi.mocked(map).mock.calls[0][2];
      expect(mapConfig.responseFormat?.json_schema?.name).toBe(want.schemaName);
    }
    if ('parsedObject' in want) {
      expect(result[0][0].object).toBe(want.parsedObject);
    }
  },
});

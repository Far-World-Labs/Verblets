import { vi, beforeEach, expect } from 'vitest';
import entityItem, {
  entitySpec,
  entityInstructions,
  mapEntities,
  mapEntitiesParallel,
} from './index.js';
import map from '../map/index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../../lib/parallel-batch/index.js', () => ({
  default: vi.fn(async (items, processor) => {
    for (let i = 0; i < items.length; i++) await processor(items[i], i);
  }),
}));

vi.mock('../map/index.js', () => ({ default: vi.fn() }));

import llm from '../../lib/llm/index.js';

beforeEach(() => vi.clearAllMocks());

runTable({
  describe: 'entitySpec',
  examples: [
    {
      name: 'generates entity specification from instructions',
      inputs: { instructions: 'Extract people, companies, and locations' },
      mocks: { llm: ['Extract people, companies, and locations'] },
      want: {
        value: 'Extract people, companies, and locations',
        promptContains: 'Extract people, companies, and locations',
        systemContains: 'entity specification generator',
      },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    return entitySpec(inputs.instructions);
  },
  expects: ({ result, want }) => {
    expect(result).toEqual(want.value);
    expect(llm).toHaveBeenCalledWith(
      expect.stringContaining(want.promptContains),
      expect.objectContaining({
        systemPrompt: expect.stringContaining(want.systemContains),
      })
    );
  },
});

runTable({
  describe: 'entityItem',
  examples: [
    {
      name: 'chains spec generation and extraction',
      inputs: {
        text: 'Google and Amazon are major tech companies.',
        instructions: 'Extract all companies',
      },
      mocks: {
        llm: [
          'Specification for extracting companies',
          {
            entities: [
              { name: 'Google', type: 'company' },
              { name: 'Amazon', type: 'company' },
            ],
          },
        ],
      },
      want: { llmCalls: 2, entitiesLength: 2 },
    },
    {
      name: 'handles empty text',
      inputs: { text: '', instructions: 'Extract any entities' },
      mocks: { llm: ['Spec', { entities: [] }] },
      want: { entities: [] },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    return entityItem(inputs.text, inputs.instructions);
  },
  expects: ({ result, want }) => {
    if ('llmCalls' in want) expect(llm).toHaveBeenCalledTimes(want.llmCalls);
    if ('entitiesLength' in want) expect(result.entities).toHaveLength(want.entitiesLength);
    if (want.entities) expect(result.entities).toEqual(want.entities);
  },
});

runTable({
  describe: 'entityInstructions',
  examples: [
    {
      name: 'returns instruction bundle with spec',
      inputs: { spec: 'Entity specification' },
      want: { textContains: 'entity specification' },
    },
    {
      name: 'passes through additional context keys',
      inputs: { spec: 'spec', domain: 'legal contracts' },
      want: { matches: { domain: 'legal contracts' } },
    },
  ],
  process: ({ inputs }) => entityInstructions(inputs),
  expects: ({ result, inputs, want }) => {
    if (want.textContains) {
      expect(result.text).toContain(want.textContains);
      expect(result.spec).toBe(inputs.spec);
    }
    if (want.matches) expect(result).toMatchObject(want.matches);
  },
});

runTable({
  describe: 'mapEntitiesParallel',
  examples: [
    {
      name: 'extracts entities from each text, sharing one spec',
      inputs: { texts: ['Alice works.', 'Acme launched.'], instructions: 'Extract' },
      mocks: {
        llm: [
          'shared spec',
          { entities: [{ name: 'Alice', type: 'person' }] },
          { entities: [{ name: 'Acme', type: 'company' }] },
        ],
      },
      want: { length: 2, names: ['Alice', 'Acme'], llmCalls: 3 },
    },
    {
      name: 'skips spec generation when bundled',
      inputs: { texts: ['t1', 't2'], instructions: { text: 'x', spec: 'reused-spec' } },
      mocks: {
        llm: [
          { entities: [{ name: 'A', type: 'person' }] },
          { entities: [{ name: 'B', type: 'person' }] },
        ],
      },
      want: { length: 2, llmCalls: 2 },
    },
    {
      name: 'returns partial outcome when one text fails',
      inputs: {
        texts: ['ok', 'bad'],
        instructions: { text: 'x', spec: 'spec' },
        options: { maxAttempts: 1 },
        withEvents: true,
      },
      mocks: { llm: [{ entities: [{ name: 'A', type: 'p' }] }, new Error('boom')] },
      want: { partialOutcome: true },
    },
    {
      name: 'throws when texts is not an array',
      inputs: { texts: 'not-an-array', instructions: 'x' },
      want: { throws: /must be an array/ },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    if (inputs.withEvents) {
      const events = [];
      const value = await mapEntitiesParallel(inputs.texts, inputs.instructions, {
        ...inputs.options,
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return mapEntitiesParallel(inputs.texts, inputs.instructions, inputs.options);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('length' in want) expect(result).toHaveLength(want.length);
    if (want.names) {
      want.names.forEach((name, i) => {
        expect(result[i].entities[0].name).toBe(name);
      });
    }
    if ('llmCalls' in want) expect(llm).toHaveBeenCalledTimes(want.llmCalls);
    if (want.partialOutcome) {
      expect(result.value[0].entities).toHaveLength(1);
      expect(result.value[1]).toBeUndefined();
      const complete = result.events.find(
        (e) => e.event === 'chain:complete' && e.step === 'entities:parallel'
      );
      expect(complete.outcome).toBe('partial');
    }
  },
});

runTable({
  describe: 'mapEntities',
  examples: [
    {
      name: 'routes through map() with the entities batch responseFormat',
      inputs: { texts: ['t1', 't2'], instructions: { text: 'x', spec: 'reused' } },
      mocks: {
        map: [[{ entities: [{ name: 'A', type: 'p' }] }, { entities: [{ name: 'B', type: 'p' }] }]],
      },
      want: { length: 2, firstName: 'A', schemaName: 'entities_batch' },
    },
    {
      name: 'generates spec when not bundled',
      inputs: { texts: ['t'], instructions: 'extract' },
      mocks: { llm: ['shared spec'], map: [[{ entities: [] }]] },
      want: { llmCalls: 1 },
    },
    {
      name: 'throws when texts is not an array',
      inputs: { texts: 'not-an-array', instructions: 'x' },
      want: { throws: /must be an array/ },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm, map });
    return mapEntities(inputs.texts, inputs.instructions);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('length' in want) expect(result).toHaveLength(want.length);
    if (want.firstName) expect(result[0].entities[0].name).toBe(want.firstName);
    if (want.schemaName) {
      const mapConfig = vi.mocked(map).mock.calls[0][2];
      expect(mapConfig.responseFormat?.json_schema?.name).toBe(want.schemaName);
    }
    if ('llmCalls' in want) expect(llm).toHaveBeenCalledTimes(want.llmCalls);
  },
});

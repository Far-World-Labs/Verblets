import { vi, beforeEach, expect } from 'vitest';
import peopleSet, { mapPeopleSet, mapPeopleSetParallel } from './index.js';
import llm from '../../lib/llm/index.js';
import map from '../map/index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

beforeEach(() => vi.clearAllMocks());

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(async () => ({
    people: [
      { name: 'Alice Smith', bio: 'Experienced baker specializing in sourdough', age: 32 },
      { name: 'Bob Chen', bio: 'Pastry chef with 15 years experience', age: 45 },
      { name: 'Carol Davis', bio: 'Home baker turned entrepreneur', age: 28 },
    ],
  })),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn(async (fn) => fn()) }));

vi.mock('../../lib/parallel-batch/index.js', () => ({
  default: vi.fn(async (items, processor) => {
    for (let i = 0; i < items.length; i++) await processor(items[i], i);
  }),
}));

vi.mock('../map/index.js', () => ({ default: vi.fn() }));

runTable({
  describe: 'peopleSet (default)',
  examples: [
    {
      name: 'returns the people array from LLM response with count in prompt',
      inputs: { description: 'experienced bakers', count: 5 },
      want: {
        length: 3,
        first: {
          name: 'Alice Smith',
          bio: 'Experienced baker specializing in sourdough',
          age: 32,
        },
        promptContains: ['5', 'experienced bakers'],
      },
    },
    {
      name: 'defaults count to 3 when not specified',
      inputs: { description: 'teachers' },
      want: { promptContains: ['3 people'] },
    },
    {
      name: 'throws when count is 0',
      inputs: { description: 'x', count: 0 },
      want: { throws: /positive integer/ },
    },
    {
      name: 'throws when count is negative',
      inputs: { description: 'x', count: -1 },
      want: { throws: /positive integer/ },
    },
    {
      name: 'throws when count is non-integer',
      inputs: { description: 'x', count: 1.5 },
      want: { throws: /positive integer/ },
    },
  ],
  process: ({ inputs }) => peopleSet(inputs.description, inputs.count),
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('length' in want) expect(result).toHaveLength(want.length);
    if (want.first) expect(result[0]).toEqual(want.first);
    if (want.promptContains) {
      const prompt = llm.mock.calls[0][0];
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
    }
  },
});

runTable({
  describe: 'mapPeopleSetParallel',
  examples: [
    {
      name: 'runs peopleSet per description with one shared count',
      inputs: { descriptions: ['founders', 'engineers'], options: { count: 2 } },
      want: { length: 2, firstIsArray: true, llmCalls: 2, promptContains: ['2 people'] },
    },
    {
      name: 'throws when descriptions is not an array',
      inputs: { descriptions: 'not-an-array' },
      want: { throws: /must be an array/ },
    },
    {
      name: 'reports partial outcome when one description fails',
      inputs: {
        descriptions: ['ok', 'bad'],
        options: { maxAttempts: 1 },
        withEvents: true,
      },
      mocks: { llm: [{ people: [{ name: 'A' }] }, new Error('boom')] },
      want: { value: [[{ name: 'A' }], undefined], outcome: 'partial' },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    if (inputs.withEvents) {
      const events = [];
      const value = await mapPeopleSetParallel(inputs.descriptions, {
        ...inputs.options,
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return mapPeopleSetParallel(inputs.descriptions, inputs.options);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('length' in want) expect(result).toHaveLength(want.length);
    if (want.firstIsArray) expect(Array.isArray(result[0])).toBe(true);
    if ('llmCalls' in want) expect(llm).toHaveBeenCalledTimes(want.llmCalls);
    if (want.promptContains) {
      const prompt = llm.mock.calls[0][0];
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
    }
    if (want.value) {
      expect(result.value[0]).toEqual(want.value[0]);
      expect(result.value[1]).toBeUndefined();
    }
    if (want.outcome) {
      const complete = result.events.find(
        (e) => e.event === 'chain:complete' && e.step === 'people:parallel'
      );
      expect(complete.outcome).toBe(want.outcome);
    }
  },
});

runTable({
  describe: 'mapPeopleSet (batched)',
  examples: [
    {
      name: 'routes through map() with the people batch responseFormat',
      inputs: { descriptions: ['founders', 'engineers'] },
      mocks: { map: [[{ people: [{ name: 'A' }] }, { people: [{ name: 'B' }] }]] },
      want: { value: [[{ name: 'A' }], [{ name: 'B' }]], schemaName: 'people_batch' },
    },
    {
      name: 'serializes object descriptions before dispatching',
      inputs: { descriptions: [{ text: 'founders', _ctx: 'extra context' }] },
      mocks: { map: [[{ people: [{ name: 'X' }] }]] },
      want: { firstListContains: 'founders' },
    },
    {
      name: 'throws when descriptions is not an array',
      inputs: { descriptions: 'not-an-array' },
      want: { throws: /must be an array/ },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { map });
    return mapPeopleSet(inputs.descriptions);
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
    if (want.firstListContains) {
      const list = vi.mocked(map).mock.calls[0][0];
      expect(list[0]).toContain(want.firstListContains);
    }
  },
});

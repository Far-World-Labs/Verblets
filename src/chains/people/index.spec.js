import { vi, beforeEach, expect } from 'vitest';
import peopleSet, { mapPeopleSet, mapPeopleSetParallel } from './index.js';
import llm from '../../lib/llm/index.js';
import map from '../map/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

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

// ─── peopleSet ──────────────────────────────────────────────────────────

runTable({
  describe: 'peopleSet (default)',
  examples: [
    {
      name: 'returns the people array from LLM response with count in prompt',
      inputs: {
        description: 'experienced bakers',
        count: 5,
        wantLength: 3,
        wantFirst: {
          name: 'Alice Smith',
          bio: 'Experienced baker specializing in sourdough',
          age: 32,
        },
        wantPromptContains: ['5', 'experienced bakers'],
      },
    },
    {
      name: 'defaults count to 3 when not specified',
      inputs: { description: 'teachers', wantPromptContains: ['3 people'] },
    },
    {
      name: 'throws when count is 0',
      inputs: { description: 'x', count: 0, throws: /positive integer/ },
    },
    {
      name: 'throws when count is negative',
      inputs: { description: 'x', count: -1, throws: /positive integer/ },
    },
    {
      name: 'throws when count is non-integer',
      inputs: { description: 'x', count: 1.5, throws: /positive integer/ },
    },
  ],
  process: ({ description, count }) => peopleSet(description, count),
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('wantLength' in inputs) expect(result).toHaveLength(inputs.wantLength);
    if (inputs.wantFirst) expect(result[0]).toEqual(inputs.wantFirst);
    if (inputs.wantPromptContains) {
      const prompt = llm.mock.calls[0][0];
      for (const fragment of inputs.wantPromptContains) expect(prompt).toContain(fragment);
    }
  },
});

// ─── mapPeopleSetParallel ───────────────────────────────────────────────

runTable({
  describe: 'mapPeopleSetParallel',
  examples: [
    {
      name: 'runs peopleSet per description with one shared count',
      inputs: {
        descriptions: ['founders', 'engineers'],
        options: { count: 2 },
        wantLength: 2,
        wantFirstIsArray: true,
        wantLlmCalls: 2,
        wantPromptContains: ['2 people'],
      },
    },
    {
      name: 'throws when descriptions is not an array',
      inputs: { descriptions: 'not-an-array', throws: /must be an array/ },
    },
    {
      name: 'reports partial outcome when one description fails',
      inputs: {
        descriptions: ['ok', 'bad'],
        options: { maxAttempts: 1 },
        withEvents: true,
        mock: () =>
          llm
            .mockResolvedValueOnce({ people: [{ name: 'A' }] })
            .mockRejectedValueOnce(new Error('boom')),
        wantValue: [[{ name: 'A' }], undefined],
        wantOutcome: 'partial',
      },
    },
  ],
  process: async ({ descriptions, options, mock, withEvents }) => {
    if (mock) mock();
    if (withEvents) {
      const events = [];
      const value = await mapPeopleSetParallel(descriptions, {
        ...options,
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return mapPeopleSetParallel(descriptions, options);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('wantLength' in inputs) expect(result).toHaveLength(inputs.wantLength);
    if (inputs.wantFirstIsArray) expect(Array.isArray(result[0])).toBe(true);
    if ('wantLlmCalls' in inputs) expect(llm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
    if (inputs.wantPromptContains) {
      const prompt = llm.mock.calls[0][0];
      for (const fragment of inputs.wantPromptContains) expect(prompt).toContain(fragment);
    }
    if (inputs.wantValue) {
      expect(result.value[0]).toEqual(inputs.wantValue[0]);
      expect(result.value[1]).toBeUndefined();
    }
    if (inputs.wantOutcome) {
      const complete = result.events.find(
        (e) => e.event === 'chain:complete' && e.step === 'people:parallel'
      );
      expect(complete.outcome).toBe(inputs.wantOutcome);
    }
  },
});

// ─── mapPeopleSet (batched) ─────────────────────────────────────────────

runTable({
  describe: 'mapPeopleSet (batched)',
  examples: [
    {
      name: 'routes through map() with the people batch responseFormat',
      inputs: {
        descriptions: ['founders', 'engineers'],
        mock: () =>
          vi
            .mocked(map)
            .mockResolvedValueOnce([{ people: [{ name: 'A' }] }, { people: [{ name: 'B' }] }]),
        want: [[{ name: 'A' }], [{ name: 'B' }]],
        wantSchemaName: 'people_batch',
      },
    },
    {
      name: 'serializes object descriptions before dispatching',
      inputs: {
        descriptions: [{ text: 'founders', _ctx: 'extra context' }],
        mock: () => vi.mocked(map).mockResolvedValueOnce([{ people: [{ name: 'X' }] }]),
        wantFirstListContains: 'founders',
      },
    },
    {
      name: 'throws when descriptions is not an array',
      inputs: { descriptions: 'not-an-array', throws: /must be an array/ },
    },
  ],
  process: async ({ descriptions, mock }) => {
    if (mock) mock();
    return mapPeopleSet(descriptions);
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
    if (inputs.wantFirstListContains) {
      const list = vi.mocked(map).mock.calls[0][0];
      expect(list[0]).toContain(inputs.wantFirstListContains);
    }
  },
});

import { vi, beforeEach, expect } from 'vitest';
import peopleSet, { mapPeopleSet, mapPeopleSetParallel } from './index.js';
import llm from '../../lib/llm/index.js';
import map from '../map/index.js';
import { runTable, equals, all, throws } from '../../lib/examples-runner/index.js';

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

// ─── peopleSet ────────────────────────────────────────────────────────────

runTable({
  describe: 'peopleSet (default)',
  examples: [
    {
      name: 'returns the people array from LLM response with count in prompt',
      inputs: { description: 'experienced bakers', count: 5 },
      check: ({ result }) => {
        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({
          name: 'Alice Smith',
          bio: 'Experienced baker specializing in sourdough',
          age: 32,
        });
        const prompt = llm.mock.calls[0][0];
        expect(prompt).toContain('5');
        expect(prompt).toContain('experienced bakers');
      },
    },
    {
      name: 'defaults count to 3 when not specified',
      inputs: { description: 'teachers' },
      check: () => expect(llm.mock.calls[0][0]).toContain('3 people'),
    },
    {
      name: 'throws when count is 0',
      inputs: { description: 'x', count: 0 },
      check: throws(/positive integer/),
    },
    {
      name: 'throws when count is negative',
      inputs: { description: 'x', count: -1 },
      check: throws(/positive integer/),
    },
    {
      name: 'throws when count is non-integer',
      inputs: { description: 'x', count: 1.5 },
      check: throws(/positive integer/),
    },
  ],
  process: ({ description, count }) => peopleSet(description, count),
});

// ─── mapPeopleSetParallel ─────────────────────────────────────────────────

runTable({
  describe: 'mapPeopleSetParallel',
  examples: [
    {
      name: 'runs peopleSet per description with one shared count',
      inputs: { descriptions: ['founders', 'engineers'], options: { count: 2 } },
      check: ({ result }) => {
        expect(result).toHaveLength(2);
        expect(Array.isArray(result[0])).toBe(true);
        expect(llm).toHaveBeenCalledTimes(2);
        expect(llm.mock.calls[0][0]).toContain('2 people');
      },
    },
    {
      name: 'throws when descriptions is not an array',
      inputs: { descriptions: 'not-an-array' },
      check: throws(/must be an array/),
    },
    {
      name: 'reports partial outcome when one description fails',
      inputs: {
        descriptions: ['ok', 'bad'],
        options: { maxAttempts: 1 },
        withEvents: true,
        preMock: () =>
          llm
            .mockResolvedValueOnce({ people: [{ name: 'A' }] })
            .mockRejectedValueOnce(new Error('boom')),
      },
      check: ({ result }) => {
        expect(result.value[0]).toEqual([{ name: 'A' }]);
        expect(result.value[1]).toBeUndefined();
        const complete = result.events.find(
          (e) => e.event === 'chain:complete' && e.step === 'people:parallel'
        );
        expect(complete.outcome).toBe('partial');
      },
    },
  ],
  process: async ({ descriptions, options, preMock, withEvents }) => {
    if (preMock) preMock();
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
});

// ─── mapPeopleSet (batched) ───────────────────────────────────────────────

runTable({
  describe: 'mapPeopleSet (batched)',
  examples: [
    {
      name: 'routes through map() with the people batch responseFormat',
      inputs: {
        descriptions: ['founders', 'engineers'],
        preMock: () =>
          vi
            .mocked(map)
            .mockResolvedValueOnce([{ people: [{ name: 'A' }] }, { people: [{ name: 'B' }] }]),
      },
      check: all(equals([[{ name: 'A' }], [{ name: 'B' }]]), () => {
        const mapConfig = vi.mocked(map).mock.calls[0][2];
        expect(mapConfig.responseFormat?.json_schema?.name).toBe('people_batch');
      }),
    },
    {
      name: 'serializes object descriptions before dispatching',
      inputs: {
        descriptions: [{ text: 'founders', _ctx: 'extra context' }],
        preMock: () => vi.mocked(map).mockResolvedValueOnce([{ people: [{ name: 'X' }] }]),
      },
      check: () => {
        const list = vi.mocked(map).mock.calls[0][0];
        expect(list[0]).toContain('founders');
      },
    },
    {
      name: 'throws when descriptions is not an array',
      inputs: { descriptions: 'not-an-array' },
      check: throws(/must be an array/),
    },
  ],
  process: async ({ descriptions, preMock }) => {
    if (preMock) preMock();
    return mapPeopleSet(descriptions);
  },
});

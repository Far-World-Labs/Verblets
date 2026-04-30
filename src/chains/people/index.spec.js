import { describe, it, expect, vi, beforeEach } from 'vitest';
import peopleSet, { mapPeopleSet, mapPeopleSetParallel } from './index.js';
import llm from '../../lib/llm/index.js';
import map from '../map/index.js';

beforeEach(() => {
  vi.clearAllMocks();
});

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

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => fn()),
}));

vi.mock('../../lib/parallel-batch/index.js', () => ({
  default: vi.fn(async (items, processor) => {
    for (let i = 0; i < items.length; i++) {
      await processor(items[i], i);
    }
  }),
}));

vi.mock('../map/index.js', () => ({
  default: vi.fn(),
}));

describe('peopleSet (default)', () => {
  it('returns the people array from LLM response with count in prompt', async () => {
    const list = await peopleSet('experienced bakers', 5);

    expect(list).toHaveLength(3); // mock returns 3 regardless
    expect(list[0]).toStrictEqual({
      name: 'Alice Smith',
      bio: 'Experienced baker specializing in sourdough',
      age: 32,
    });

    const prompt = llm.mock.calls[0][0];
    expect(prompt).toContain('5');
    expect(prompt).toContain('experienced bakers');
  });

  it('defaults count to 3 when not specified', async () => {
    await peopleSet('teachers');

    const prompt = llm.mock.calls[0][0];
    expect(prompt).toContain('3 people');
  });

  it('throws when count is not a positive integer', async () => {
    await expect(peopleSet('x', 0)).rejects.toThrow(/positive integer/);
    await expect(peopleSet('x', -1)).rejects.toThrow(/positive integer/);
    await expect(peopleSet('x', 1.5)).rejects.toThrow(/positive integer/);
  });
});

describe('mapPeopleSetParallel', () => {
  it('runs peopleSet per description with one shared count', async () => {
    const result = await mapPeopleSetParallel(['founders', 'engineers'], { count: 2 });
    expect(result).toHaveLength(2);
    expect(Array.isArray(result[0])).toBe(true);
    expect(llm).toHaveBeenCalledTimes(2);
    const firstPrompt = llm.mock.calls[0][0];
    expect(firstPrompt).toContain('2 people');
  });

  it('throws when descriptions is not an array', async () => {
    await expect(mapPeopleSetParallel('not-an-array')).rejects.toThrow(/must be an array/);
  });

  it('reports partial outcome when one description fails', async () => {
    llm.mockResolvedValueOnce({ people: [{ name: 'A' }] }).mockRejectedValueOnce(new Error('boom'));
    const events = [];
    const result = await mapPeopleSetParallel(['ok', 'bad'], {
      maxAttempts: 1,
      onProgress: (e) => events.push(e),
    });
    expect(result[0]).toEqual([{ name: 'A' }]);
    expect(result[1]).toBeUndefined();
    const complete = events.find(
      (e) => e.event === 'chain:complete' && e.step === 'people:parallel'
    );
    expect(complete.outcome).toBe('partial');
  });
});

describe('mapPeopleSet (batched)', () => {
  it('routes through map() with the people batch responseFormat', async () => {
    vi.mocked(map).mockResolvedValueOnce([
      { people: [{ name: 'A' }] },
      { people: [{ name: 'B' }] },
    ]);
    const result = await mapPeopleSet(['founders', 'engineers']);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([{ name: 'A' }]);
    const mapConfig = vi.mocked(map).mock.calls[0][2];
    expect(mapConfig.responseFormat?.json_schema?.name).toBe('people_batch');
  });

  it('serializes object descriptions before dispatching', async () => {
    vi.mocked(map).mockResolvedValueOnce([{ people: [{ name: 'X' }] }]);
    await mapPeopleSet([{ text: 'founders', _ctx: 'extra context' }]);
    const list = vi.mocked(map).mock.calls[0][0];
    expect(list[0]).toContain('founders');
  });

  it('throws when descriptions is not an array', async () => {
    await expect(mapPeopleSet('not-an-array')).rejects.toThrow(/must be an array/);
  });
});

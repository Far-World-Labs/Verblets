import { describe, it, expect, vi, beforeEach } from 'vitest';
import popReferenceItem, { mapPopReference, mapPopReferenceParallel } from './index.js';
import llm from '../../lib/llm/index.js';
import map from '../map/index.js';

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

// Mock dependencies
vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

// Mock fs/promises for schema loading
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn().mockResolvedValue(
      JSON.stringify({
        type: 'object',
        properties: {
          references: {
            type: 'array',
            items: { type: 'object' },
          },
        },
        required: ['references'],
        additionalProperties: false,
      })
    ),
  },
  readFile: vi.fn().mockResolvedValue(
    JSON.stringify({
      type: 'object',
      properties: {
        references: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['references'],
      additionalProperties: false,
    })
  ),
}));

describe('popReferenceItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should find pop culture references for a sentence', async () => {
    const mockResponse = {
      references: [
        {
          reference: 'when Neo takes the red pill',
          source: 'The Matrix',
          context: 'he chooses uncomfortable truth over comforting illusion',
          score: 0.88,
          match: {
            text: 'finally made a decision',
            start: 12,
            end: 35,
          },
        },
      ],
    };

    llm.mockResolvedValue(mockResponse);

    const result = await popReferenceItem(
      'She finally made a decision after months of doubt',
      'pivotal moment of choosing clarity over comfort'
    );

    expect(result).toEqual(mockResponse.references);
    expect(llm).toHaveBeenCalledWith(
      expect.stringContaining('Find pop culture references'),
      expect.any(Object)
    );
  });

  it('should include specific sources when provided', async () => {
    const mockResponse = {
      references: [
        {
          reference: "Michael Scott's 'That's what she said'",
          source: 'The Office',
          score: 0.75,
          match: {
            text: 'awkward silence',
            start: 20,
            end: 35,
          },
        },
      ],
    };

    llm.mockResolvedValue(mockResponse);

    const result = await popReferenceItem(
      'There was an awkward silence after the joke',
      'uncomfortable social moment',
      {
        include: ['The Office', 'Parks and Recreation'],
      }
    );

    expect(result).toEqual(mockResponse.references);
    expect(llm).toHaveBeenCalledWith(expect.stringContaining('<sources>'), expect.any(Object));
  });

  it('should handle weighted sources', async () => {
    const mockResponse = {
      references: [
        {
          reference: "when the guy in the 'this is fine' meme just sits in the fire",
          source: 'Meme: This Is Fine',
          score: 0.83,
          match: {
            text: 'kept smiling',
            start: 5,
            end: 17,
          },
        },
      ],
    };

    llm.mockResolvedValue(mockResponse);

    const result = await popReferenceItem(
      'They kept smiling through the chaos',
      'maintaining composure during disaster',
      {
        include: [
          { reference: 'Internet Memes', percent: 80 },
          { reference: 'The Office', percent: 20 },
        ],
      }
    );

    expect(result).toEqual(mockResponse.references);
    expect(llm).toHaveBeenCalledWith(
      expect.stringContaining('Internet Memes (focus 80%)'),
      expect.any(Object)
    );
  });

  it('should respect referencesPerSource option', async () => {
    const mockResponse = {
      references: [
        {
          reference: "Harry's scar burning",
          source: 'Harry Potter',
          score: 0.8,
          match: { text: 'warning sign', start: 10, end: 22 },
        },
        {
          reference: 'Hermione raising her hand',
          source: 'Harry Potter',
          score: 0.7,
          match: { text: 'warning sign', start: 10, end: 22 },
        },
        {
          reference: "Ron's face when he sees spiders",
          source: 'Harry Potter',
          score: 0.65,
          match: { text: 'warning sign', start: 10, end: 22 },
        },
      ],
    };

    llm.mockResolvedValue(mockResponse);

    const result = await popReferenceItem(
      'It was a warning sign of things to come',
      'ominous foreshadowing',
      {
        include: ['Harry Potter'],
        referencesPerSource: 3,
      }
    );

    expect(result.length).toBe(3);
    expect(llm).toHaveBeenCalledWith(
      expect.stringContaining('Find 3 references per source'),
      expect.any(Object)
    );
  });

  it('should handle parsing errors gracefully', async () => {
    llm.mockResolvedValue('invalid json');

    await expect(popReferenceItem('Test', 'Description')).rejects.toThrow();
  });

  it('should handle empty reference arrays', async () => {
    llm.mockResolvedValue({ references: [] });

    const result = await popReferenceItem(
      'A very unique situation',
      'no clear pop culture parallels'
    );

    expect(result).toEqual([]);
  });
});

describe('mapPopReferenceParallel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs popReferenceItem per sentence with one shared description', async () => {
    llm
      .mockResolvedValueOnce({
        references: [
          { reference: 'A', source: 's', score: 1, match: { text: 't', start: 0, end: 1 } },
        ],
      })
      .mockResolvedValueOnce({ references: [] });
    const result = await mapPopReferenceParallel(['s1', 's2'], 'shared description');
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(1);
    expect(result[1]).toEqual([]);
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it('reports partial outcome when one sentence fails', async () => {
    llm.mockResolvedValueOnce({ references: [] }).mockRejectedValueOnce(new Error('boom'));
    const events = [];
    const result = await mapPopReferenceParallel(['ok', 'bad'], 'desc', {
      maxAttempts: 1,
      onProgress: (e) => events.push(e),
    });
    expect(result[0]).toEqual([]);
    expect(result[1]).toBeUndefined();
    const complete = events.find(
      (e) => e.event === 'chain:complete' && e.step === 'pop-reference:parallel'
    );
    expect(complete.outcome).toBe('partial');
  });

  it('throws when sentences is not an array', async () => {
    await expect(mapPopReferenceParallel('not-an-array', 'd')).rejects.toThrow(/must be an array/);
  });
});

describe('mapPopReference (batched)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes through map() with the pop-reference batch responseFormat', async () => {
    vi.mocked(map).mockResolvedValueOnce([
      {
        references: [
          { reference: 'A', source: 's', score: 1, match: { text: 't', start: 0, end: 1 } },
        ],
      },
      { references: [] },
    ]);
    const result = await mapPopReference(['s1', 's2'], 'description');
    expect(result).toHaveLength(2);
    expect(result[0][0].reference).toBe('A');
    expect(result[1]).toEqual([]);
    const mapConfig = vi.mocked(map).mock.calls[0][2];
    expect(mapConfig.responseFormat?.json_schema?.name).toBe('pop_reference_batch');
  });

  it('throws when sentences is not an array', async () => {
    await expect(mapPopReference('not-an-array', 'd')).rejects.toThrow(/must be an array/);
  });
});

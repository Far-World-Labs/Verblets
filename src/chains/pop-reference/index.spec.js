import { beforeEach, vi, expect } from 'vitest';
import popReferenceItem, { mapPopReference, mapPopReferenceParallel } from './index.js';
import {
  popReferenceVariants,
  popReferenceWithCount,
} from '../../lib/test-utils/factories/pop-reference.js';
import { runTable } from '../../lib/examples-runner/index.js';
import llm from '../../lib/llm/index.js';
import map from '../map/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../map/index.js', () => ({ default: vi.fn() }));

vi.mock('../../lib/parallel-batch/index.js', () => ({
  default: vi.fn(async (items, processor) => {
    for (let i = 0; i < items.length; i++) await processor(items[i], i);
  }),
}));

beforeEach(() => vi.clearAllMocks());

// ─── popReferenceItem: result count + throws ───────────────────────────

runTable({
  describe: 'popReferenceItem: result count',
  examples: [
    {
      name: 'returns each reference the LLM produced (single)',
      inputs: { mockResponse: () => popReferenceWithCount(1), wantLength: 1 },
    },
    {
      name: 'returns each reference the LLM produced (many)',
      inputs: { mockResponse: () => popReferenceWithCount(5), wantLength: 5 },
    },
    {
      name: 'returns empty array when the LLM finds nothing',
      inputs: { mockResponse: popReferenceVariants.empty, wantLength: 0 },
    },
    {
      name: 'throws when the LLM returns null',
      inputs: { mockResponse: popReferenceVariants.isNull, throws: 'object' },
    },
    {
      name: 'throws when the LLM returns a malformed shape',
      inputs: { mockResponse: popReferenceVariants.malformedShape, throws: 'array' },
    },
    {
      name: 'throws on empty sentence (boundary validation)',
      inputs: {
        sentence: '',
        mockResponse: popReferenceVariants.wellFormed,
        throws: 'sentence must be a non-empty string',
      },
    },
  ],
  process: async ({
    sentence = 'She finally made a decision',
    description = 'pivotal moment',
    options,
    mockResponse,
  }) => {
    llm.mockResolvedValue(mockResponse());
    return popReferenceItem(sentence, description, options);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toContain(inputs.throws);
      return;
    }
    if (error) throw error;
    expect(result).toHaveLength(inputs.wantLength);
  },
});

// ─── popReferenceItem: prompt construction ─────────────────────────────

runTable({
  describe: 'popReferenceItem: prompt construction',
  examples: [
    {
      name: 'mentions sources when include is provided',
      inputs: { options: { include: ['The Office'] }, wantContains: '<sources>' },
    },
    {
      name: 'formats weighted sources with focus percentage',
      inputs: {
        options: {
          include: [
            { reference: 'Internet Memes', percent: 80 },
            { reference: 'The Office', percent: 20 },
          ],
        },
        wantContains: 'Internet Memes (focus 80%)',
      },
    },
    {
      name: 'respects referencesPerSource',
      inputs: {
        options: { referencesPerSource: 3 },
        wantContains: 'Find 3 references per source',
      },
    },
  ],
  process: async ({ options }) => {
    llm.mockResolvedValue(popReferenceVariants.wellFormed());
    await popReferenceItem('any sentence', 'desc', options);
    return llm.mock.calls[0][0];
  },
  expects: ({ result, inputs }) => expect(result).toContain(inputs.wantContains),
});

// ─── mapPopReferenceParallel ───────────────────────────────────────────

runTable({
  describe: 'mapPopReferenceParallel',
  examples: [
    {
      name: 'runs popReferenceItem per sentence with one shared description',
      inputs: {
        sentences: ['s1', 's2'],
        description: 'shared description',
        options: undefined,
        mockResponses: [() => popReferenceWithCount(1), () => popReferenceVariants.empty()],
        wantShape: { length: 2, firstLength: 1, secondLength: 0, callCount: 2 },
      },
    },
    {
      name: 'reports partial outcome when one sentence fails',
      inputs: {
        sentences: ['ok', 'bad'],
        description: 'desc',
        options: { maxAttempts: 1 },
        mockResponses: [() => popReferenceVariants.empty(), popReferenceVariants.rejected],
        wantShape: { firstLength: 0, secondUndefined: true, outcome: 'partial' },
      },
    },
    {
      name: 'throws when sentences is not an array',
      inputs: {
        sentences: 'not-an-array',
        description: 'd',
        options: undefined,
        mockResponses: [],
        throws: 'must be an array',
      },
    },
  ],
  process: async ({ sentences, description, options, mockResponses }) => {
    for (const make of mockResponses) {
      if (make === popReferenceVariants.rejected) {
        llm.mockRejectedValueOnce(new Error('boom'));
      } else {
        llm.mockResolvedValueOnce(make());
      }
    }
    const events = [];
    const result = await mapPopReferenceParallel(sentences, description, {
      ...options,
      onProgress: (e) => events.push(e),
    });
    const complete = events.find(
      (e) => e.event === 'chain:complete' && e.step === 'pop-reference:parallel'
    );
    return {
      length: result.length,
      firstLength: result[0]?.length ?? 0,
      secondLength: result[1]?.length ?? 0,
      secondUndefined: result[1] === undefined,
      callCount: llm.mock.calls.length,
      outcome: complete?.outcome,
    };
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toContain(inputs.throws);
      return;
    }
    if (error) throw error;
    expect(result).toMatchObject(inputs.wantShape);
  },
});

// ─── mapPopReference (batched) ─────────────────────────────────────────

runTable({
  describe: 'mapPopReference (batched)',
  examples: [
    {
      name: 'routes through map() with the pop-reference batch responseFormat',
      inputs: {
        sentences: ['s1', 's2'],
        description: 'description',
        mapResults: [popReferenceWithCount(1), popReferenceVariants.empty()],
        wantShape: {
          length: 2,
          firstHasReference: true,
          secondLength: 0,
          schemaName: 'pop_reference_batch',
        },
      },
    },
    {
      name: 'throws when sentences is not an array',
      inputs: {
        sentences: 'not-an-array',
        description: 'd',
        mapResults: [],
        throws: 'must be an array',
      },
    },
  ],
  process: async ({ sentences, description, mapResults }) => {
    vi.mocked(map).mockResolvedValueOnce(mapResults);
    const result = await mapPopReference(sentences, description);
    return {
      length: result.length,
      firstHasReference: !!result[0]?.[0]?.reference,
      secondLength: result[1]?.length ?? 0,
      schemaName: vi.mocked(map).mock.calls[0]?.[2]?.responseFormat?.json_schema?.name,
    };
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toContain(inputs.throws);
      return;
    }
    if (error) throw error;
    expect(result).toMatchObject(inputs.wantShape);
  },
});

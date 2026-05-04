import { beforeEach, vi, expect } from 'vitest';
import popReferenceItem, { mapPopReference, mapPopReferenceParallel } from './index.js';
import {
  popReferenceVariants,
  popReferenceWithCount,
} from '../../lib/test-utils/factories/pop-reference.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';
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

runTable({
  describe: 'popReferenceItem: result count',
  examples: [
    {
      name: 'returns each reference the LLM produced (single)',
      inputs: {},
      mocks: { llm: [popReferenceWithCount(1)] },
      want: { length: 1 },
    },
    {
      name: 'returns each reference the LLM produced (many)',
      inputs: {},
      mocks: { llm: [popReferenceWithCount(5)] },
      want: { length: 5 },
    },
    {
      name: 'returns empty array when the LLM finds nothing',
      inputs: {},
      mocks: { llm: [popReferenceVariants.empty()] },
      want: { length: 0 },
    },
    {
      name: 'throws when the LLM returns null',
      inputs: {},
      mocks: { llm: [popReferenceVariants.isNull()] },
      want: { throws: 'object' },
    },
    {
      name: 'throws when the LLM returns a malformed shape',
      inputs: {},
      mocks: { llm: [popReferenceVariants.malformedShape()] },
      want: { throws: 'array' },
    },
    {
      name: 'throws on empty sentence (boundary validation)',
      inputs: { sentence: '' },
      mocks: { llm: [popReferenceVariants.wellFormed()] },
      want: { throws: 'sentence must be a non-empty string' },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    return popReferenceItem(
      inputs.sentence ?? 'She finally made a decision',
      'pivotal moment',
      inputs.options
    );
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toContain(want.throws);
      return;
    }
    if (error) throw error;
    expect(result).toHaveLength(want.length);
  },
});

runTable({
  describe: 'popReferenceItem: prompt construction',
  examples: [
    {
      name: 'mentions sources when include is provided',
      inputs: { options: { include: ['The Office'] } },
      want: { contains: '<sources>' },
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
      },
      want: { contains: 'Internet Memes (focus 80%)' },
    },
    {
      name: 'respects referencesPerSource',
      inputs: { options: { referencesPerSource: 3 } },
      want: { contains: 'Find 3 references per source' },
    },
  ],
  process: async ({ inputs }) => {
    llm.mockResolvedValue(popReferenceVariants.wellFormed());
    await popReferenceItem('any sentence', 'desc', inputs.options);
    return llm.mock.calls[0][0];
  },
  expects: ({ result, want }) => expect(result).toContain(want.contains),
});

runTable({
  describe: 'mapPopReferenceParallel',
  examples: [
    {
      name: 'runs popReferenceItem per sentence with one shared description',
      inputs: { sentences: ['s1', 's2'], description: 'shared description' },
      mocks: { llm: [popReferenceWithCount(1), popReferenceVariants.empty()] },
      want: { shape: { length: 2, firstLength: 1, secondLength: 0, callCount: 2 } },
    },
    {
      name: 'reports partial outcome when one sentence fails',
      inputs: { sentences: ['ok', 'bad'], description: 'desc', options: { maxAttempts: 1 } },
      mocks: { llm: [popReferenceVariants.empty(), new Error('boom')] },
      want: { shape: { firstLength: 0, secondUndefined: true, outcome: 'partial' } },
    },
    {
      name: 'throws when sentences is not an array',
      inputs: { sentences: 'not-an-array', description: 'd' },
      want: { throws: 'must be an array' },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    const events = [];
    const result = await mapPopReferenceParallel(inputs.sentences, inputs.description, {
      ...inputs.options,
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
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toContain(want.throws);
      return;
    }
    if (error) throw error;
    expect(result).toMatchObject(want.shape);
  },
});

runTable({
  describe: 'mapPopReference (batched)',
  examples: [
    {
      name: 'routes through map() with the pop-reference batch responseFormat',
      inputs: { sentences: ['s1', 's2'], description: 'description' },
      mocks: { map: [[popReferenceWithCount(1), popReferenceVariants.empty()]] },
      want: {
        shape: {
          length: 2,
          firstHasReference: true,
          secondLength: 0,
          schemaName: 'pop_reference_batch',
        },
      },
    },
    {
      name: 'throws when sentences is not an array',
      inputs: { sentences: 'not-an-array', description: 'd' },
      want: { throws: 'must be an array' },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { map });
    const result = await mapPopReference(inputs.sentences, inputs.description);
    return {
      length: result.length,
      firstHasReference: !!result[0]?.[0]?.reference,
      secondLength: result[1]?.length ?? 0,
      schemaName: vi.mocked(map).mock.calls[0]?.[2]?.responseFormat?.json_schema?.name,
    };
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toContain(want.throws);
      return;
    }
    if (error) throw error;
    expect(result).toMatchObject(want.shape);
  },
});

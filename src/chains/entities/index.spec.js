import { vi, beforeEach, expect } from 'vitest';
import entityItem, {
  entitySpec,
  entityInstructions,
  mapEntities,
  mapEntitiesParallel,
} from './index.js';
import map from '../map/index.js';
import { runTable, equals, all, partial, throws } from '../../lib/examples-runner/index.js';

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

// ─── entitySpec ───────────────────────────────────────────────────────────

runTable({
  describe: 'entitySpec',
  examples: [
    {
      name: 'generates entity specification from instructions',
      inputs: {
        instructions: 'Extract people, companies, and locations',
        preMock: () => llm.mockResolvedValueOnce('Extract people, companies, and locations'),
      },
      check: all(equals('Extract people, companies, and locations'), () =>
        expect(llm).toHaveBeenCalledWith(
          expect.stringContaining('Extract people, companies, and locations'),
          expect.objectContaining({
            systemPrompt: expect.stringContaining('entity specification generator'),
          })
        )
      ),
    },
  ],
  process: async ({ instructions, preMock }) => {
    if (preMock) preMock();
    return entitySpec(instructions);
  },
});

// ─── entityItem ───────────────────────────────────────────────────────────

runTable({
  describe: 'entityItem',
  examples: [
    {
      name: 'chains spec generation and extraction',
      inputs: {
        text: 'Google and Amazon are major tech companies.',
        instructions: 'Extract all companies',
        preMock: () =>
          llm
            .mockResolvedValueOnce('Specification for extracting companies')
            .mockResolvedValueOnce({
              entities: [
                { name: 'Google', type: 'company' },
                { name: 'Amazon', type: 'company' },
              ],
            }),
      },
      check: ({ result }) => {
        expect(llm).toHaveBeenCalledTimes(2);
        expect(result.entities).toHaveLength(2);
      },
    },
    {
      name: 'handles empty text',
      inputs: {
        text: '',
        instructions: 'Extract any entities',
        preMock: () => llm.mockResolvedValueOnce('Spec').mockResolvedValueOnce({ entities: [] }),
      },
      check: ({ result }) => expect(result.entities).toEqual([]),
    },
  ],
  process: async ({ text, instructions, preMock }) => {
    if (preMock) preMock();
    return entityItem(text, instructions);
  },
});

// ─── entityInstructions ───────────────────────────────────────────────────

runTable({
  describe: 'entityInstructions',
  examples: [
    {
      name: 'returns instruction bundle with spec',
      inputs: { spec: 'Entity specification' },
      check: ({ result, inputs }) => {
        expect(result.text).toContain('entity specification');
        expect(result.spec).toBe(inputs.spec);
      },
    },
    {
      name: 'passes through additional context keys',
      inputs: { spec: 'spec', domain: 'legal contracts' },
      check: partial({ domain: 'legal contracts' }),
    },
  ],
  process: (params) => entityInstructions(params),
});

// ─── mapEntitiesParallel ──────────────────────────────────────────────────

runTable({
  describe: 'mapEntitiesParallel',
  examples: [
    {
      name: 'extracts entities from each text, sharing one spec',
      inputs: {
        texts: ['Alice works.', 'Acme launched.'],
        instructions: 'Extract',
        preMock: () =>
          llm
            .mockResolvedValueOnce('shared spec')
            .mockResolvedValueOnce({ entities: [{ name: 'Alice', type: 'person' }] })
            .mockResolvedValueOnce({ entities: [{ name: 'Acme', type: 'company' }] }),
      },
      check: ({ result }) => {
        expect(result).toHaveLength(2);
        expect(result[0].entities[0].name).toBe('Alice');
        expect(result[1].entities[0].name).toBe('Acme');
        expect(llm).toHaveBeenCalledTimes(3);
      },
    },
    {
      name: 'skips spec generation when bundled',
      inputs: {
        texts: ['t1', 't2'],
        instructions: { text: 'x', spec: 'reused-spec' },
        preMock: () =>
          llm
            .mockResolvedValueOnce({ entities: [{ name: 'A', type: 'person' }] })
            .mockResolvedValueOnce({ entities: [{ name: 'B', type: 'person' }] }),
      },
      check: ({ result }) => {
        expect(result).toHaveLength(2);
        expect(llm).toHaveBeenCalledTimes(2);
      },
    },
    {
      name: 'returns partial outcome when one text fails',
      inputs: {
        texts: ['ok', 'bad'],
        instructions: { text: 'x', spec: 'spec' },
        options: { maxAttempts: 1 },
        withEvents: true,
        preMock: () =>
          llm
            .mockResolvedValueOnce({ entities: [{ name: 'A', type: 'p' }] })
            .mockRejectedValueOnce(new Error('boom')),
      },
      check: ({ result }) => {
        expect(result.value[0].entities).toHaveLength(1);
        expect(result.value[1]).toBeUndefined();
        const complete = result.events.find(
          (e) => e.event === 'chain:complete' && e.step === 'entities:parallel'
        );
        expect(complete.outcome).toBe('partial');
      },
    },
    {
      name: 'throws when texts is not an array',
      inputs: { texts: 'not-an-array', instructions: 'x' },
      check: throws(/must be an array/),
    },
  ],
  process: async ({ texts, instructions, options, preMock, withEvents }) => {
    if (preMock) preMock();
    if (withEvents) {
      const events = [];
      const value = await mapEntitiesParallel(texts, instructions, {
        ...options,
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return mapEntitiesParallel(texts, instructions, options);
  },
});

// ─── mapEntities ──────────────────────────────────────────────────────────

runTable({
  describe: 'mapEntities',
  examples: [
    {
      name: 'routes through map() with the entities batch responseFormat',
      inputs: {
        texts: ['t1', 't2'],
        instructions: { text: 'x', spec: 'reused' },
        preMock: () =>
          vi
            .mocked(map)
            .mockResolvedValueOnce([
              { entities: [{ name: 'A', type: 'p' }] },
              { entities: [{ name: 'B', type: 'p' }] },
            ]),
      },
      check: ({ result }) => {
        expect(result).toHaveLength(2);
        expect(result[0].entities[0].name).toBe('A');
        const mapConfig = vi.mocked(map).mock.calls[0][2];
        expect(mapConfig.responseFormat?.json_schema?.name).toBe('entities_batch');
      },
    },
    {
      name: 'generates spec when not bundled',
      inputs: {
        texts: ['t'],
        instructions: 'extract',
        preMock: () => {
          llm.mockResolvedValueOnce('shared spec');
          vi.mocked(map).mockResolvedValueOnce([{ entities: [] }]);
        },
      },
      check: () => expect(llm).toHaveBeenCalledTimes(1),
    },
    {
      name: 'throws when texts is not an array',
      inputs: { texts: 'not-an-array', instructions: 'x' },
      check: throws(/must be an array/),
    },
  ],
  process: async ({ texts, instructions, preMock }) => {
    if (preMock) preMock();
    return mapEntities(texts, instructions);
  },
});

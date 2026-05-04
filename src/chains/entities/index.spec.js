import { vi, beforeEach, expect } from 'vitest';
import entityItem, {
  entitySpec,
  entityInstructions,
  mapEntities,
  mapEntitiesParallel,
} from './index.js';
import map from '../map/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

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

// ─── entitySpec ──────────────────────────────────────────────────────────

runTable({
  describe: 'entitySpec',
  examples: [
    {
      name: 'generates entity specification from instructions',
      inputs: {
        instructions: 'Extract people, companies, and locations',
        mock: () => llm.mockResolvedValueOnce('Extract people, companies, and locations'),
        want: 'Extract people, companies, and locations',
        wantPromptContains: 'Extract people, companies, and locations',
        wantSystemContains: 'entity specification generator',
      },
    },
  ],
  process: async ({ instructions, mock }) => {
    if (mock) mock();
    return entitySpec(instructions);
  },
  expects: ({ result, inputs }) => {
    expect(result).toEqual(inputs.want);
    expect(llm).toHaveBeenCalledWith(
      expect.stringContaining(inputs.wantPromptContains),
      expect.objectContaining({
        systemPrompt: expect.stringContaining(inputs.wantSystemContains),
      })
    );
  },
});

// ─── entityItem ──────────────────────────────────────────────────────────

runTable({
  describe: 'entityItem',
  examples: [
    {
      name: 'chains spec generation and extraction',
      inputs: {
        text: 'Google and Amazon are major tech companies.',
        instructions: 'Extract all companies',
        mock: () =>
          llm
            .mockResolvedValueOnce('Specification for extracting companies')
            .mockResolvedValueOnce({
              entities: [
                { name: 'Google', type: 'company' },
                { name: 'Amazon', type: 'company' },
              ],
            }),
        wantLlmCalls: 2,
        wantEntitiesLength: 2,
      },
    },
    {
      name: 'handles empty text',
      inputs: {
        text: '',
        instructions: 'Extract any entities',
        mock: () => llm.mockResolvedValueOnce('Spec').mockResolvedValueOnce({ entities: [] }),
        wantEntities: [],
      },
    },
  ],
  process: async ({ text, instructions, mock }) => {
    if (mock) mock();
    return entityItem(text, instructions);
  },
  expects: ({ result, inputs }) => {
    if ('wantLlmCalls' in inputs) expect(llm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
    if ('wantEntitiesLength' in inputs) {
      expect(result.entities).toHaveLength(inputs.wantEntitiesLength);
    }
    if (inputs.wantEntities) expect(result.entities).toEqual(inputs.wantEntities);
  },
});

// ─── entityInstructions ──────────────────────────────────────────────────

runTable({
  describe: 'entityInstructions',
  examples: [
    {
      name: 'returns instruction bundle with spec',
      inputs: { spec: 'Entity specification', wantTextContains: 'entity specification' },
    },
    {
      name: 'passes through additional context keys',
      inputs: { spec: 'spec', domain: 'legal contracts', want: { domain: 'legal contracts' } },
    },
  ],
  process: (params) => entityInstructions(params),
  expects: ({ result, inputs }) => {
    if (inputs.wantTextContains) {
      expect(result.text).toContain(inputs.wantTextContains);
      expect(result.spec).toBe(inputs.spec);
    }
    if ('want' in inputs) expect(result).toMatchObject(inputs.want);
  },
});

// ─── mapEntitiesParallel ─────────────────────────────────────────────────

runTable({
  describe: 'mapEntitiesParallel',
  examples: [
    {
      name: 'extracts entities from each text, sharing one spec',
      inputs: {
        texts: ['Alice works.', 'Acme launched.'],
        instructions: 'Extract',
        mock: () =>
          llm
            .mockResolvedValueOnce('shared spec')
            .mockResolvedValueOnce({ entities: [{ name: 'Alice', type: 'person' }] })
            .mockResolvedValueOnce({ entities: [{ name: 'Acme', type: 'company' }] }),
        wantLength: 2,
        wantNames: ['Alice', 'Acme'],
        wantLlmCalls: 3,
      },
    },
    {
      name: 'skips spec generation when bundled',
      inputs: {
        texts: ['t1', 't2'],
        instructions: { text: 'x', spec: 'reused-spec' },
        mock: () =>
          llm
            .mockResolvedValueOnce({ entities: [{ name: 'A', type: 'person' }] })
            .mockResolvedValueOnce({ entities: [{ name: 'B', type: 'person' }] }),
        wantLength: 2,
        wantLlmCalls: 2,
      },
    },
    {
      name: 'returns partial outcome when one text fails',
      inputs: {
        texts: ['ok', 'bad'],
        instructions: { text: 'x', spec: 'spec' },
        options: { maxAttempts: 1 },
        withEvents: true,
        mock: () =>
          llm
            .mockResolvedValueOnce({ entities: [{ name: 'A', type: 'p' }] })
            .mockRejectedValueOnce(new Error('boom')),
        wantPartialOutcome: true,
      },
    },
    {
      name: 'throws when texts is not an array',
      inputs: { texts: 'not-an-array', instructions: 'x', throws: /must be an array/ },
    },
  ],
  process: async ({ texts, instructions, options, mock, withEvents }) => {
    if (mock) mock();
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
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('wantLength' in inputs) expect(result).toHaveLength(inputs.wantLength);
    if (inputs.wantNames) {
      inputs.wantNames.forEach((name, i) => {
        expect(result[i].entities[0].name).toBe(name);
      });
    }
    if ('wantLlmCalls' in inputs) expect(llm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
    if (inputs.wantPartialOutcome) {
      expect(result.value[0].entities).toHaveLength(1);
      expect(result.value[1]).toBeUndefined();
      const complete = result.events.find(
        (e) => e.event === 'chain:complete' && e.step === 'entities:parallel'
      );
      expect(complete.outcome).toBe('partial');
    }
  },
});

// ─── mapEntities ─────────────────────────────────────────────────────────

runTable({
  describe: 'mapEntities',
  examples: [
    {
      name: 'routes through map() with the entities batch responseFormat',
      inputs: {
        texts: ['t1', 't2'],
        instructions: { text: 'x', spec: 'reused' },
        mock: () =>
          vi
            .mocked(map)
            .mockResolvedValueOnce([
              { entities: [{ name: 'A', type: 'p' }] },
              { entities: [{ name: 'B', type: 'p' }] },
            ]),
        wantLength: 2,
        wantFirstName: 'A',
        wantSchemaName: 'entities_batch',
      },
    },
    {
      name: 'generates spec when not bundled',
      inputs: {
        texts: ['t'],
        instructions: 'extract',
        mock: () => {
          llm.mockResolvedValueOnce('shared spec');
          vi.mocked(map).mockResolvedValueOnce([{ entities: [] }]);
        },
        wantLlmCalls: 1,
      },
    },
    {
      name: 'throws when texts is not an array',
      inputs: { texts: 'not-an-array', instructions: 'x', throws: /must be an array/ },
    },
  ],
  process: async ({ texts, instructions, mock }) => {
    if (mock) mock();
    return mapEntities(texts, instructions);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('wantLength' in inputs) expect(result).toHaveLength(inputs.wantLength);
    if (inputs.wantFirstName) expect(result[0].entities[0].name).toBe(inputs.wantFirstName);
    if (inputs.wantSchemaName) {
      const mapConfig = vi.mocked(map).mock.calls[0][2];
      expect(mapConfig.responseFormat?.json_schema?.name).toBe(inputs.wantSchemaName);
    }
    if ('wantLlmCalls' in inputs) expect(llm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
  },
});

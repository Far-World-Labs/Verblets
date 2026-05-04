import { vi, beforeEach, expect } from 'vitest';
import extractBlocks, { validateBlockResponse } from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));
vi.mock('../../lib/retry/index.js');

import llm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';

beforeEach(() => {
  vi.clearAllMocks();
  retry.mockImplementation(async (fn) => fn());
});

const retryOnce = () => async (impl) => {
  try {
    return await impl();
  } catch {
    return await impl();
  }
};

runTable({
  describe: 'extract-blocks',
  examples: [
    {
      name: 'extracts blocks from text with clear boundaries',
      inputs: {
        text: `Entry 1: Title
Line 2 of entry 1
Line 3 of entry 1

Entry 2: Another Title
Line 2 of entry 2
Line 3 of entry 2
Line 4 of entry 2

Entry 3: Final Title
Line 2 of entry 3`,
        instructions:
          'Identify entries that start with "Entry N:" and end before the next entry or at document end',
        options: { windowSize: 50, overlapSize: 10 },
        setupMock: () =>
          llm.mockResolvedValue({
            blocks: [
              { startLine: 0, endLine: 2 },
              { startLine: 4, endLine: 7 },
              { startLine: 9, endLine: 10 },
            ],
          }),
      },
      want: { threeEntries: true },
    },
    {
      name: 'handles overlapping windows and deduplicates blocks',
      inputs: {
        text: `Line 1
Line 2
Line 3
Line 4
Line 5`,
        instructions: 'Find blocks',
        options: { windowSize: 3, overlapSize: 1, maxParallel: 1 },
        setupMock: () =>
          llm
            .mockResolvedValueOnce({ blocks: [{ startLine: 1, endLine: 2 }] })
            .mockResolvedValueOnce({ blocks: [{ startLine: 1, endLine: 3 }] })
            .mockResolvedValueOnce({ blocks: [] }),
      },
      want: { value: [['Line 2', 'Line 3', 'Line 4']] },
    },
    {
      name: 'handles empty text',
      inputs: { text: '', instructions: 'Find blocks' },
      want: { value: [], llmCalls: 0 },
    },
    {
      name: 'merges adjacent overlapping blocks',
      inputs: {
        text: `Block 1 start
Block 1 content
Block 2 start
Block 2 content
Block 3 start
Block 3 content`,
        instructions: 'Find blocks',
        setupMock: () =>
          llm.mockResolvedValue({
            blocks: [
              { startLine: 0, endLine: 1 },
              { startLine: 1, endLine: 3 },
              { startLine: 4, endLine: 5 },
            ],
          }),
      },
      want: {
        value: [
          ['Block 1 start', 'Block 1 content', 'Block 2 start', 'Block 2 content'],
          ['Block 3 start', 'Block 3 content'],
        ],
      },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return extractBlocks(inputs.text, inputs.instructions, inputs.options);
  },
  expects: ({ result, want }) => {
    if (want.threeEntries) {
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(['Entry 1: Title', 'Line 2 of entry 1', 'Line 3 of entry 1']);
      expect(result[1]).toEqual([
        'Entry 2: Another Title',
        'Line 2 of entry 2',
        'Line 3 of entry 2',
        'Line 4 of entry 2',
      ]);
      expect(result[2]).toEqual(['Entry 3: Final Title', 'Line 2 of entry 3']);
    }
    if ('value' in want) expect(result).toEqual(want.value);
    if ('llmCalls' in want) expect(llm).toHaveBeenCalledTimes(want.llmCalls);
  },
});

runTable({
  describe: 'extract-blocks — precision option',
  examples: [
    {
      name: 'precision option controls window granularity (high > low)',
      inputs: {},
      want: { highGtLow: true },
    },
  ],
  process: async () => {
    const lines = Array(100)
      .fill('Line')
      .map((_, i) => `Line ${i + 1}`);
    const text = lines.join('\n');

    llm.mockResolvedValue({ blocks: [] });
    await extractBlocks(text, 'Find blocks', { precision: 'low', maxParallel: 1 });
    const lowCalls = llm.mock.calls.length;

    llm.mockClear();
    llm.mockResolvedValue({ blocks: [] });
    await extractBlocks(text, 'Find blocks', { precision: 'high', maxParallel: 1 });
    const highCalls = llm.mock.calls.length;

    return { lowCalls, highCalls };
  },
  expects: ({ result, want }) => {
    if (want.highGtLow) expect(result.highCalls).toBeGreaterThan(result.lowCalls);
  },
});

runTable({
  describe: 'validateBlockResponse',
  examples: [
    {
      name: 'returns blocks array for valid response with single block',
      inputs: { response: { blocks: [{ startLine: 0, endLine: 5 }] } },
      want: { value: [{ startLine: 0, endLine: 5 }] },
    },
    {
      name: 'returns blocks array for valid response with multiple blocks',
      inputs: {
        response: {
          blocks: [
            { startLine: 0, endLine: 2 },
            { startLine: 5, endLine: 10 },
            { startLine: 15, endLine: 20 },
          ],
        },
      },
      want: {
        length: 3,
        first: { startLine: 0, endLine: 2 },
        third: { startLine: 15, endLine: 20 },
      },
    },
    {
      name: 'accepts empty blocks array',
      inputs: { response: { blocks: [] } },
      want: { value: [] },
    },
    {
      name: 'throws for undefined response',
      inputs: { response: undefined },
      want: { throws: /Block extraction response missing required "blocks" array/ },
    },
    {
      name: 'throws for null response',
      inputs: { response: null },
      want: { throws: /Block extraction response missing required "blocks" array/ },
    },
    {
      name: 'throws for response without blocks key',
      inputs: { response: { data: [] } },
      want: { throws: /Block extraction response missing required "blocks" array/ },
    },
    {
      name: 'throws for non-array blocks value',
      inputs: { response: { blocks: 'not an array' } },
      want: { throws: /Block extraction response missing required "blocks" array/ },
    },
    {
      name: 'throws for block with non-numeric startLine',
      inputs: { response: { blocks: [{ startLine: '0', endLine: 5 }] } },
      want: { throws: /Invalid block: "startLine" must be number, got string/ },
    },
    {
      name: 'throws for block with non-numeric endLine',
      inputs: { response: { blocks: [{ startLine: 0, endLine: '5' }] } },
      want: { throws: /Invalid block: "endLine" must be number, got string/ },
    },
    {
      name: 'throws for block missing startLine',
      inputs: { response: { blocks: [{ endLine: 5 }] } },
      want: { throws: /Invalid block: "startLine" must be number, got undefined/ },
    },
    {
      name: 'throws for block missing endLine',
      inputs: { response: { blocks: [{ startLine: 0 }] } },
      want: { throws: /Invalid block: "endLine" must be number, got undefined/ },
    },
    {
      name: 'validates all blocks — fails on second invalid block',
      inputs: {
        response: {
          blocks: [
            { startLine: 0, endLine: 2 },
            { startLine: 'bad', endLine: 5 },
          ],
        },
      },
      want: { throws: /Invalid block: "startLine" must be number, got string/ },
    },
  ],
  process: ({ inputs }) => validateBlockResponse(inputs.response),
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want) expect(result).toEqual(want.value);
    if ('length' in want) expect(result).toHaveLength(want.length);
    if (want.first) expect(result[0]).toEqual(want.first);
    if (want.third) expect(result[2]).toEqual(want.third);
  },
});

runTable({
  describe: 'extract-blocks — retry integration',
  examples: [
    {
      name: 'passes blockExtractionSchema as responseFormat to LLM',
      inputs: {
        text: 'Line 0\nLine 1',
        options: { windowSize: 50 },
        setupMock: () => llm.mockResolvedValue({ blocks: [{ startLine: 0, endLine: 1 }] }),
      },
      want: { responseFormat: { type: 'json_schema', name: 'block_boundaries' } },
    },
    {
      name: 'passes resolved retry options to retry wrapper',
      inputs: {
        text: 'Line 0\nLine 1',
        options: { maxAttempts: 5, retryMode: 'strict', retryOnAll: false, windowSize: 50 },
        setupMock: () => llm.mockResolvedValue({ blocks: [{ startLine: 0, endLine: 1 }] }),
      },
      want: {
        retryOpts: {
          label: 'extract-blocks:window',
          maxAttempts: 5,
          retryMode: 'strict',
          retryOnAll: false,
        },
      },
    },
    {
      name: 'defaults retryOnAll to true for validation error recovery',
      inputs: {
        text: 'Line 0\nLine 1',
        options: { windowSize: 50 },
        setupMock: () => llm.mockResolvedValue({ blocks: [{ startLine: 0, endLine: 1 }] }),
      },
      want: { retryOnAllTrue: true },
    },
    {
      name: 'retries when LLM returns malformed response then succeeds',
      inputs: {
        text: 'Line 0\nLine 1',
        options: { windowSize: 50 },
        setupMock: () => {
          retry.mockImplementation(retryOnce());
          llm
            .mockResolvedValueOnce({ malformed: true })
            .mockResolvedValueOnce({ blocks: [{ startLine: 0, endLine: 1 }] });
        },
      },
      want: { value: [['Line 0', 'Line 1']], llmCalls: 2 },
    },
    {
      name: 'retries when LLM returns blocks with wrong types then succeeds',
      inputs: {
        text: 'Line 0\nLine 1',
        options: { windowSize: 50 },
        setupMock: () => {
          retry.mockImplementation(retryOnce());
          llm
            .mockResolvedValueOnce({ blocks: [{ startLine: '0', endLine: '1' }] })
            .mockResolvedValueOnce({ blocks: [{ startLine: 0, endLine: 1 }] });
        },
      },
      want: { value: [['Line 0', 'Line 1']], llmCalls: 2 },
    },
    {
      name: 'succeeds after transient LLM error on first attempt',
      inputs: {
        text: 'Line 0\nLine 1',
        options: { windowSize: 50 },
        setupMock: () => {
          retry.mockImplementation(retryOnce());
          const err = new Error('Service unavailable');
          err.httpStatus = 503;
          llm
            .mockRejectedValueOnce(err)
            .mockResolvedValueOnce({ blocks: [{ startLine: 0, endLine: 1 }] });
        },
      },
      want: { value: [['Line 0', 'Line 1']], llmCalls: 2 },
    },
    {
      name: 'propagates validation error when retry exhausts all attempts',
      inputs: {
        text: 'Line 0\nLine 1',
        options: { windowSize: 50 },
        setupMock: () => {
          retry.mockImplementation(async (fn) => {
            let lastErr;
            for (let i = 0; i < 3; i++) {
              try {
                return await fn();
              } catch (e) {
                lastErr = e;
              }
            }
            throw lastErr;
          });
          llm.mockResolvedValue({ malformed: true });
        },
      },
      want: {
        throws: /Block extraction response missing required "blocks" array/,
        llmCalls: 3,
      },
    },
    {
      name: 'propagates LLM error when retry exhausts all attempts',
      inputs: {
        text: 'Line 0\nLine 1',
        options: { windowSize: 50 },
        setupMock: () => {
          retry.mockImplementation(async (fn) => {
            let lastErr;
            for (let i = 0; i < 2; i++) {
              try {
                return await fn();
              } catch (e) {
                lastErr = e;
              }
            }
            throw lastErr;
          });
          const err = new Error('Internal server error');
          err.httpStatus = 500;
          llm.mockRejectedValue(err);
        },
      },
      want: { throws: /Internal server error/, llmCalls: 2 },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return extractBlocks(inputs.text, 'Find blocks', inputs.options);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      if ('llmCalls' in want) expect(llm).toHaveBeenCalledTimes(want.llmCalls);
      return;
    }
    if (error) throw error;
    if (want.responseFormat) {
      const opts = llm.mock.calls[0][1];
      expect(opts.responseFormat.type).toBe(want.responseFormat.type);
      expect(opts.responseFormat.json_schema.name).toBe(want.responseFormat.name);
    }
    if (want.retryOpts) {
      const opts = retry.mock.calls[0][1];
      expect(opts).toMatchObject(want.retryOpts);
    }
    if (want.retryOnAllTrue) expect(retry.mock.calls[0][1].retryOnAll).toBe(true);
    if ('value' in want) expect(result).toEqual(want.value);
    if ('llmCalls' in want) expect(llm).toHaveBeenCalledTimes(want.llmCalls);
  },
});

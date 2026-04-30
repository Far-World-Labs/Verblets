import { describe, it, expect, vi, beforeEach } from 'vitest';
import extractBlocks, { validateBlockResponse } from './index.js';

// Mock the dependencies — provide real jsonSchema so block-schema.js can build the schema envelope
vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));
vi.mock('../../lib/retry/index.js');

import llm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';

describe('extract-blocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // retry calls fn() — callers close over their own args
    retry.mockImplementation(async (fn) => fn());
  });

  it('should extract blocks from text with clear boundaries', async () => {
    const text = `Entry 1: Title
Line 2 of entry 1
Line 3 of entry 1

Entry 2: Another Title
Line 2 of entry 2
Line 3 of entry 2
Line 4 of entry 2

Entry 3: Final Title
Line 2 of entry 3`;

    const instructions =
      'Identify entries that start with "Entry N:" and end before the next entry or at document end';

    // Mock llm to return block boundaries
    llm.mockResolvedValue({
      blocks: [
        { startLine: 0, endLine: 2 }, // Entry 1
        { startLine: 4, endLine: 7 }, // Entry 2
        { startLine: 9, endLine: 10 }, // Entry 3
      ],
    });

    const result = await extractBlocks(text, instructions, {
      windowSize: 50,
      overlapSize: 10,
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(['Entry 1: Title', 'Line 2 of entry 1', 'Line 3 of entry 1']);
    expect(result[1]).toEqual([
      'Entry 2: Another Title',
      'Line 2 of entry 2',
      'Line 3 of entry 2',
      'Line 4 of entry 2',
    ]);
    expect(result[2]).toEqual(['Entry 3: Final Title', 'Line 2 of entry 3']);
  });

  it('should handle overlapping windows and deduplicate blocks', async () => {
    const text = `Line 1
Line 2
Line 3
Line 4
Line 5`;

    const instructions = 'Find blocks';

    // Three windows will be created: [0-2], [2-4], [4-4]
    // First window returns a block
    // Second overlapping window returns same block with extended end
    // Third window returns nothing
    llm
      .mockResolvedValueOnce({
        blocks: [{ startLine: 1, endLine: 2 }],
      })
      .mockResolvedValueOnce({
        blocks: [{ startLine: 1, endLine: 3 }], // Extended version
      })
      .mockResolvedValueOnce({
        blocks: [], // Last window has no blocks
      });

    const result = await extractBlocks(text, instructions, {
      windowSize: 3,
      overlapSize: 1,
      maxParallel: 1,
    });

    // Should keep the longer version
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(['Line 2', 'Line 3', 'Line 4']);
  });

  it('should handle empty text', async () => {
    const result = await extractBlocks('', 'Find blocks');

    expect(result).toEqual([]);
    expect(llm).toHaveBeenCalledTimes(0);
  });

  it('precision option controls window granularity', async () => {
    const lines = Array(100)
      .fill('Line')
      .map((l, i) => `${l} ${i + 1}`);
    const text = lines.join('\n');

    llm.mockResolvedValue({ blocks: [] });
    await extractBlocks(text, 'Find blocks', { precision: 'low', maxParallel: 1 });
    const lowCalls = llm.mock.calls.length;

    llm.mockClear();
    llm.mockResolvedValue({ blocks: [] });
    await extractBlocks(text, 'Find blocks', { precision: 'high', maxParallel: 1 });
    const highCalls = llm.mock.calls.length;

    expect(highCalls).toBeGreaterThan(lowCalls);
  });

  it('should merge adjacent overlapping blocks', async () => {
    const text = `Block 1 start
Block 1 content
Block 2 start
Block 2 content
Block 3 start
Block 3 content`;

    llm.mockResolvedValue({
      blocks: [
        { startLine: 0, endLine: 1 },
        { startLine: 1, endLine: 3 }, // Overlaps with previous
        { startLine: 4, endLine: 5 },
      ],
    });

    const result = await extractBlocks(text, 'Find blocks');

    // First two should be merged
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([
      'Block 1 start',
      'Block 1 content',
      'Block 2 start',
      'Block 2 content',
    ]);
    expect(result[1]).toEqual(['Block 3 start', 'Block 3 content']);
  });

  describe('validateBlockResponse', () => {
    it('returns blocks array for valid response with single block', () => {
      const response = { blocks: [{ startLine: 0, endLine: 5 }] };
      const result = validateBlockResponse(response);
      expect(result).toEqual([{ startLine: 0, endLine: 5 }]);
    });

    it('returns blocks array for valid response with multiple blocks', () => {
      const response = {
        blocks: [
          { startLine: 0, endLine: 2 },
          { startLine: 5, endLine: 10 },
          { startLine: 15, endLine: 20 },
        ],
      };
      const result = validateBlockResponse(response);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ startLine: 0, endLine: 2 });
      expect(result[2]).toEqual({ startLine: 15, endLine: 20 });
    });

    it('accepts empty blocks array', () => {
      expect(validateBlockResponse({ blocks: [] })).toEqual([]);
    });

    it('throws for undefined response', () => {
      expect(() => validateBlockResponse(undefined)).toThrow(
        'Block extraction response missing required "blocks" array'
      );
    });

    it('throws for null response', () => {
      expect(() => validateBlockResponse(null)).toThrow(
        'Block extraction response missing required "blocks" array'
      );
    });

    it('throws for response without blocks key', () => {
      expect(() => validateBlockResponse({ data: [] })).toThrow(
        'Block extraction response missing required "blocks" array'
      );
    });

    it('throws for non-array blocks value', () => {
      expect(() => validateBlockResponse({ blocks: 'not an array' })).toThrow(
        'Block extraction response missing required "blocks" array'
      );
    });

    it('throws for block with non-numeric startLine', () => {
      expect(() => validateBlockResponse({ blocks: [{ startLine: '0', endLine: 5 }] })).toThrow(
        'Invalid block: "startLine" must be number, got string'
      );
    });

    it('throws for block with non-numeric endLine', () => {
      expect(() => validateBlockResponse({ blocks: [{ startLine: 0, endLine: '5' }] })).toThrow(
        'Invalid block: "endLine" must be number, got string'
      );
    });

    it('throws for block missing startLine', () => {
      expect(() => validateBlockResponse({ blocks: [{ endLine: 5 }] })).toThrow(
        'Invalid block: "startLine" must be number, got undefined'
      );
    });

    it('throws for block missing endLine', () => {
      expect(() => validateBlockResponse({ blocks: [{ startLine: 0 }] })).toThrow(
        'Invalid block: "endLine" must be number, got undefined'
      );
    });

    it('validates all blocks — fails on second invalid block', () => {
      expect(() =>
        validateBlockResponse({
          blocks: [
            { startLine: 0, endLine: 2 },
            { startLine: 'bad', endLine: 5 },
          ],
        })
      ).toThrow('Invalid block: "startLine" must be number, got string');
    });
  });

  describe('retry integration', () => {
    it('passes blockExtractionSchema as responseFormat to LLM', async () => {
      const text = 'Line 0\nLine 1';
      llm.mockResolvedValue({ blocks: [{ startLine: 0, endLine: 1 }] });

      await extractBlocks(text, 'Find blocks', { windowSize: 50 });

      const llmOptions = llm.mock.calls[0][1];
      expect(llmOptions.responseFormat).toBeDefined();
      expect(llmOptions.responseFormat.type).toBe('json_schema');
      expect(llmOptions.responseFormat.json_schema.name).toBe('block_boundaries');
    });

    it('passes resolved retry options to retry wrapper', async () => {
      const text = 'Line 0\nLine 1';
      llm.mockResolvedValue({ blocks: [{ startLine: 0, endLine: 1 }] });

      await extractBlocks(text, 'Find blocks', {
        maxAttempts: 5,
        retryMode: 'strict',
        retryOnAll: false,
        windowSize: 50,
      });

      const retryOpts = retry.mock.calls[0][1];
      expect(retryOpts.label).toBe('extract-blocks:window');
      expect(retryOpts.maxAttempts).toBe(5);
      expect(retryOpts.retryMode).toBe('strict');
      expect(retryOpts.retryOnAll).toBe(false);
    });

    it('defaults retryOnAll to true for validation error recovery', async () => {
      const text = 'Line 0\nLine 1';
      llm.mockResolvedValue({ blocks: [{ startLine: 0, endLine: 1 }] });

      await extractBlocks(text, 'Find blocks', { windowSize: 50 });

      const retryOpts = retry.mock.calls[0][1];
      expect(retryOpts.retryOnAll).toBe(true);
    });

    it('retries when LLM returns malformed response then succeeds', async () => {
      const text = 'Line 0\nLine 1';

      retry.mockImplementation(async (fn) => {
        try {
          return await fn();
        } catch {
          return await fn();
        }
      });

      llm
        .mockResolvedValueOnce({ malformed: true })
        .mockResolvedValueOnce({ blocks: [{ startLine: 0, endLine: 1 }] });

      const result = await extractBlocks(text, 'Find blocks', { windowSize: 50 });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(['Line 0', 'Line 1']);
      expect(llm).toHaveBeenCalledTimes(2);
    });

    it('retries when LLM returns blocks with wrong types then succeeds', async () => {
      const text = 'Line 0\nLine 1';

      retry.mockImplementation(async (fn) => {
        try {
          return await fn();
        } catch {
          return await fn();
        }
      });

      llm
        .mockResolvedValueOnce({ blocks: [{ startLine: '0', endLine: '1' }] })
        .mockResolvedValueOnce({ blocks: [{ startLine: 0, endLine: 1 }] });

      const result = await extractBlocks(text, 'Find blocks', { windowSize: 50 });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(['Line 0', 'Line 1']);
      expect(llm).toHaveBeenCalledTimes(2);
    });

    it('succeeds after transient LLM error on first attempt', async () => {
      const text = 'Line 0\nLine 1';

      retry.mockImplementation(async (fn) => {
        try {
          return await fn();
        } catch {
          return await fn();
        }
      });

      const transientError = new Error('Service unavailable');
      transientError.httpStatus = 503;

      llm
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce({ blocks: [{ startLine: 0, endLine: 1 }] });

      const result = await extractBlocks(text, 'Find blocks', { windowSize: 50 });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(['Line 0', 'Line 1']);
      expect(llm).toHaveBeenCalledTimes(2);
    });

    it('propagates validation error when retry exhausts all attempts', async () => {
      const text = 'Line 0\nLine 1';

      retry.mockImplementation(async (fn) => {
        let lastErr;
        for (let i = 0; i < 3; i++) {
          try {
            return await fn();
          } catch (err) {
            lastErr = err;
          }
        }
        throw lastErr;
      });

      llm.mockResolvedValue({ malformed: true });

      await expect(extractBlocks(text, 'Find blocks', { windowSize: 50 })).rejects.toThrow(
        'Block extraction response missing required "blocks" array'
      );

      expect(llm).toHaveBeenCalledTimes(3);
    });

    it('propagates LLM error when retry exhausts all attempts', async () => {
      const text = 'Line 0\nLine 1';

      const serverError = new Error('Internal server error');
      serverError.httpStatus = 500;

      retry.mockImplementation(async (fn) => {
        let lastErr;
        for (let i = 0; i < 2; i++) {
          try {
            return await fn();
          } catch (err) {
            lastErr = err;
          }
        }
        throw lastErr;
      });

      llm.mockRejectedValue(serverError);

      await expect(extractBlocks(text, 'Find blocks', { windowSize: 50 })).rejects.toThrow(
        'Internal server error'
      );

      expect(llm).toHaveBeenCalledTimes(2);
    });
  });
});

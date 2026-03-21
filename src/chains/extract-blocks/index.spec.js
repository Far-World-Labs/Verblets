import { describe, it, expect, vi, beforeEach } from 'vitest';
import extractBlocks from './index.js';

// Mock the dependencies
vi.mock('../../lib/llm/index.js');
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
});

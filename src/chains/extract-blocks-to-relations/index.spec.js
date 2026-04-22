import { describe, it, expect, vi, beforeEach } from 'vitest';
import extractBlocksToRelations, { mapThoroughness } from './index.js';

vi.mock('../extract-blocks/index.js');
vi.mock('../relations/index.js');
vi.mock('../../lib/retry/index.js');

import extractBlocks from '../extract-blocks/index.js';
import extractRelations, { relationSpec } from '../relations/index.js';

describe('extract-blocks-to-relations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapThoroughness', () => {
    it('returns default for undefined', () => {
      const result = mapThoroughness(undefined);
      expect(result).toEqual({ sharedSpec: true, maxParallel: 3 });
    });

    it('passes through object values', () => {
      const custom = { sharedSpec: false, maxParallel: 10 };
      expect(mapThoroughness(custom)).toBe(custom);
    });

    it('maps low to no shared spec and higher parallelism', () => {
      const result = mapThoroughness('low');
      expect(result.sharedSpec).toBe(false);
      expect(result.maxParallel).toBeGreaterThan(mapThoroughness('high').maxParallel);
    });

    it('maps high to shared spec and lower parallelism', () => {
      const result = mapThoroughness('high');
      expect(result.sharedSpec).toBe(true);
      expect(result.maxParallel).toBeLessThan(mapThoroughness('low').maxParallel);
    });

    it('falls back to default for unknown string', () => {
      expect(mapThoroughness('unknown')).toEqual(mapThoroughness(undefined));
    });
  });

  describe('extractBlocksToRelations', () => {
    const sampleText = `## Meeting Notes - Jan 15
Alice presented the Q4 results.
Bob raised concerns about budget.

## Meeting Notes - Jan 22
Charlie proposed the new architecture.
Diana approved the timeline.`;

    const block1 = [
      '## Meeting Notes - Jan 15',
      'Alice presented the Q4 results.',
      'Bob raised concerns about budget.',
    ];
    const block2 = [
      '## Meeting Notes - Jan 22',
      'Charlie proposed the new architecture.',
      'Diana approved the timeline.',
    ];

    const relations1 = [
      { subject: 'Alice', predicate: 'presented', object: 'Q4 results' },
      { subject: 'Bob', predicate: 'raised concerns about', object: 'budget' },
    ];
    const relations2 = [
      { subject: 'Charlie', predicate: 'proposed', object: 'new architecture' },
      { subject: 'Diana', predicate: 'approved', object: 'timeline' },
    ];

    it('extracts blocks then extracts relations from each block', async () => {
      extractBlocks.mockResolvedValue([block1, block2]);
      relationSpec.mockResolvedValue('Extract person-action-topic triples');
      extractRelations.mockResolvedValueOnce(relations1).mockResolvedValueOnce(relations2);

      const result = await extractBlocksToRelations(
        sampleText,
        'Extract who did what in each meeting section'
      );

      expect(extractBlocks).toHaveBeenCalledTimes(1);
      expect(extractBlocks).toHaveBeenCalledWith(
        sampleText,
        'Extract who did what in each meeting section',
        expect.objectContaining({
          operation: expect.stringContaining('extract-blocks-to-relations'),
        })
      );

      expect(relationSpec).toHaveBeenCalledTimes(1);

      expect(extractRelations).toHaveBeenCalledTimes(2);
      expect(extractRelations).toHaveBeenCalledWith(
        block1.join('\n'),
        expect.objectContaining({ spec: 'Extract person-action-topic triples' }),
        expect.objectContaining({
          operation: expect.stringContaining('extract-blocks-to-relations'),
        })
      );

      expect(result).toHaveLength(2);
      expect(result[0].block).toEqual(block1);
      expect(result[0].relations).toEqual(relations1);
      expect(result[1].block).toEqual(block2);
      expect(result[1].relations).toEqual(relations2);
    });

    it('returns empty array when extractBlocks finds no blocks', async () => {
      extractBlocks.mockResolvedValue([]);

      const result = await extractBlocksToRelations('no structure here', 'Find blocks');

      expect(result).toEqual([]);
      expect(extractRelations).not.toHaveBeenCalled();
      expect(relationSpec).not.toHaveBeenCalled();
    });

    it('skips shared spec generation when thoroughness is low', async () => {
      extractBlocks.mockResolvedValue([block1]);
      extractRelations.mockResolvedValue(relations1);

      const result = await extractBlocksToRelations(sampleText, 'Extract relations', {
        thoroughness: 'low',
      });

      expect(relationSpec).not.toHaveBeenCalled();
      expect(extractRelations).toHaveBeenCalledWith(
        block1.join('\n'),
        'Extract relations',
        expect.any(Object)
      );

      expect(result).toHaveLength(1);
      expect(result[0].relations).toEqual(relations1);
    });

    it('uses pre-supplied spec from known instruction key', async () => {
      extractBlocks.mockResolvedValue([block1]);
      extractRelations.mockResolvedValue(relations1);

      const result = await extractBlocksToRelations(sampleText, {
        text: 'Extract relations',
        spec: 'Pre-built relation specification',
      });

      expect(relationSpec).not.toHaveBeenCalled();
      expect(extractRelations).toHaveBeenCalledWith(
        block1.join('\n'),
        expect.objectContaining({ spec: 'Pre-built relation specification' }),
        expect.any(Object)
      );
      expect(result[0].relations).toEqual(relations1);
    });

    it('uses separate blockInstructions and relationInstructions when provided', async () => {
      extractBlocks.mockResolvedValue([block1]);
      relationSpec.mockResolvedValue('Generated spec');
      extractRelations.mockResolvedValue(relations1);

      await extractBlocksToRelations(sampleText, {
        text: 'general instructions',
        blockInstructions: 'Split on meeting headers',
        relationInstructions: 'Extract person-action triples',
      });

      expect(extractBlocks).toHaveBeenCalledWith(
        sampleText,
        'Split on meeting headers',
        expect.any(Object)
      );
      expect(relationSpec).toHaveBeenCalledWith(
        'Extract person-action triples',
        expect.any(Object)
      );
    });

    it('forwards config options to sub-chains', async () => {
      extractBlocks.mockResolvedValue([block1]);
      relationSpec.mockResolvedValue('spec');
      extractRelations.mockResolvedValue(relations1);

      const onProgress = vi.fn();
      await extractBlocksToRelations(sampleText, 'Extract relations', {
        onProgress,
        llm: 'fastGood',
      });

      const extractBlocksConfig = extractBlocks.mock.calls[0][2];
      expect(extractBlocksConfig).toHaveProperty('onProgress');
      expect(extractBlocksConfig.operation).toContain('extract-blocks-to-relations');

      const relationsConfig = extractRelations.mock.calls[0][2];
      expect(relationsConfig.operation).toContain('extract-blocks-to-relations');
    });

    it('propagates extractBlocks errors', async () => {
      const error = new Error('Block extraction failed');
      extractBlocks.mockRejectedValue(error);

      await expect(extractBlocksToRelations(sampleText, 'Extract relations')).rejects.toThrow(
        'Block extraction failed'
      );
    });

    it('tolerates individual block relation failures with resilient posture', async () => {
      extractBlocks.mockResolvedValue([block1, block2]);
      relationSpec.mockResolvedValue('spec');
      extractRelations
        .mockRejectedValueOnce(new Error('LLM timeout'))
        .mockResolvedValueOnce(relations2);

      const result = await extractBlocksToRelations(sampleText, 'Extract relations');

      // First block failed, second succeeded — resilient posture filters undefined
      const validResults = result.filter(Boolean);
      expect(validResults.length).toBeGreaterThanOrEqual(1);
      expect(validResults.some((r) => r.relations === relations2)).toBe(true);
    });

    it('resolveArgs shifts config when instructions omitted', async () => {
      extractBlocks.mockResolvedValue([]);

      await extractBlocksToRelations('some text', { onProgress: vi.fn() });

      expect(extractBlocks).toHaveBeenCalledWith(
        'some text',
        undefined,
        expect.objectContaining({
          operation: expect.stringContaining('extract-blocks-to-relations'),
        })
      );
    });
  });
});

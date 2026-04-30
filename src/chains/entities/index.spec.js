import { describe, expect, it, vi, beforeEach } from 'vitest';
import entityItem, {
  entitySpec,
  entityInstructions,
  mapEntities,
  mapEntitiesParallel,
} from './index.js';
import map from '../map/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
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

import llm from '../../lib/llm/index.js';

describe('entities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('entitySpec', () => {
    it('generates entity specification from instructions', async () => {
      const mockSpec = 'Extract people, companies, and locations';
      llm.mockResolvedValueOnce(mockSpec);

      const spec = await entitySpec('Extract people, companies, and locations');

      expect(llm).toHaveBeenCalledWith(
        expect.stringContaining('Extract people, companies, and locations'),
        expect.objectContaining({
          systemPrompt: expect.stringContaining('entity specification generator'),
        })
      );
      expect(spec).toBe(mockSpec);
    });
  });

  describe('entityItem', () => {
    it('chains spec generation and extraction', async () => {
      llm.mockResolvedValueOnce('Specification for extracting companies').mockResolvedValueOnce({
        entities: [
          { name: 'Google', type: 'company' },
          { name: 'Amazon', type: 'company' },
        ],
      });

      const result = await entityItem(
        'Google and Amazon are major tech companies.',
        'Extract all companies'
      );

      expect(llm).toHaveBeenCalledTimes(2);
      expect(result.entities).toHaveLength(2);
    });

    it('handles empty text', async () => {
      llm.mockResolvedValueOnce('Spec').mockResolvedValueOnce({ entities: [] });

      const result = await entityItem('', 'Extract any entities');

      expect(result.entities).toEqual([]);
    });
  });

  describe('entityInstructions', () => {
    it('returns instruction bundle with spec', () => {
      const bundle = entityInstructions({ spec: 'Entity specification' });

      expect(bundle.text).toContain('entity specification');
      expect(bundle.spec).toBe('Entity specification');
    });

    it('passes through additional context keys', () => {
      const bundle = entityInstructions({ spec: 'spec', domain: 'legal contracts' });

      expect(bundle.domain).toBe('legal contracts');
    });
  });

  describe('mapEntitiesParallel', () => {
    it('extracts entities from each text, sharing one spec', async () => {
      llm
        .mockResolvedValueOnce('shared spec')
        .mockResolvedValueOnce({ entities: [{ name: 'Alice', type: 'person' }] })
        .mockResolvedValueOnce({ entities: [{ name: 'Acme', type: 'company' }] });

      const result = await mapEntitiesParallel(['Alice works.', 'Acme launched.'], 'Extract');
      expect(result).toHaveLength(2);
      expect(result[0].entities[0].name).toBe('Alice');
      expect(result[1].entities[0].name).toBe('Acme');
      expect(llm).toHaveBeenCalledTimes(3);
    });

    it('skips spec generation when bundled', async () => {
      llm
        .mockResolvedValueOnce({ entities: [{ name: 'A', type: 'person' }] })
        .mockResolvedValueOnce({ entities: [{ name: 'B', type: 'person' }] });
      const result = await mapEntitiesParallel(['t1', 't2'], { text: 'x', spec: 'reused-spec' });
      expect(result).toHaveLength(2);
      expect(llm).toHaveBeenCalledTimes(2);
    });

    it('returns partial outcome when one text fails', async () => {
      llm
        .mockResolvedValueOnce({ entities: [{ name: 'A', type: 'p' }] })
        .mockRejectedValueOnce(new Error('boom'));
      const events = [];
      const result = await mapEntitiesParallel(
        ['ok', 'bad'],
        { text: 'x', spec: 'spec' },
        { onProgress: (e) => events.push(e), maxAttempts: 1 }
      );
      expect(result[0].entities).toHaveLength(1);
      expect(result[1]).toBeUndefined();
      const complete = events.find(
        (e) => e.event === 'chain:complete' && e.step === 'entities:parallel'
      );
      expect(complete.outcome).toBe('partial');
    });

    it('throws when texts is not an array', async () => {
      await expect(mapEntitiesParallel('not-an-array', 'x')).rejects.toThrow(/must be an array/);
    });
  });

  describe('mapEntities', () => {
    it('routes through map() with the entities batch responseFormat', async () => {
      vi.mocked(map).mockResolvedValueOnce([
        { entities: [{ name: 'A', type: 'p' }] },
        { entities: [{ name: 'B', type: 'p' }] },
      ]);
      const result = await mapEntities(['t1', 't2'], { text: 'x', spec: 'reused' });
      expect(result).toHaveLength(2);
      expect(result[0].entities[0].name).toBe('A');
      const mapConfig = vi.mocked(map).mock.calls[0][2];
      expect(mapConfig.responseFormat?.json_schema?.name).toBe('entities_batch');
    });

    it('generates spec when not bundled', async () => {
      llm.mockResolvedValueOnce('shared spec');
      vi.mocked(map).mockResolvedValueOnce([{ entities: [] }]);
      await mapEntities(['t'], 'extract');
      expect(llm).toHaveBeenCalledTimes(1);
    });

    it('throws when texts is not an array', async () => {
      await expect(mapEntities('not-an-array', 'x')).rejects.toThrow(/must be an array/);
    });
  });
});

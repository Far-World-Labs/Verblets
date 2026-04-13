import { describe, expect, it, vi, beforeEach } from 'vitest';
import extractEntities, { entitySpec, entityInstructions } from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
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

  describe('extractEntities', () => {
    it('chains spec generation and extraction', async () => {
      llm.mockResolvedValueOnce('Specification for extracting companies').mockResolvedValueOnce({
        entities: [
          { name: 'Google', type: 'company' },
          { name: 'Amazon', type: 'company' },
        ],
      });

      const result = await extractEntities(
        'Google and Amazon are major tech companies.',
        'Extract all companies'
      );

      expect(llm).toHaveBeenCalledTimes(2);
      expect(result.entities).toHaveLength(2);
    });

    it('handles empty text', async () => {
      llm.mockResolvedValueOnce('Spec').mockResolvedValueOnce({ entities: [] });

      const result = await extractEntities('', 'Extract any entities');

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
});

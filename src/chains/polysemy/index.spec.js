import { beforeEach, describe, expect, it, vi } from 'vitest';
import polysemy, { chunkByTokens } from './index.js';
import { bulkMapRetry } from '../bulk-map/index.js';
import modelService from '../../services/llm-model/index.js';

vi.mock('../bulk-map/index.js', () => ({
  bulkMapRetry: vi.fn(),
}));

vi.mock('../../services/llm-model/index.js', () => ({
  default: {
    getBestPublicModel: vi.fn().mockReturnValue({
      toTokens: (text) => text.split(/\s+/),
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('polysemy chain', () => {
  it('chunks text by tokens', () => {
    const model = modelService.getBestPublicModel();
    const chunks = chunkByTokens('a b c d e', 2, model);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('returns ranked terms', async () => {
    bulkMapRetry.mockResolvedValue(['bank, port', 'port, note', undefined]);
    const result = await polysemy('irrelevant', { topN: 2 });
    expect(result).toStrictEqual(['port', 'bank']);
    expect(bulkMapRetry).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from 'vitest';
import bulkConversationSummary from './index.js';
import { bulkMapRetry } from '../bulk-map/index.js';

vi.mock('../bulk-map/index.js', () => ({
  bulkMapRetry: vi.fn(async () => ['sum a', 'sum b']),
}));

describe('bulkConversationSummary', () => {
  it('maps speakers to summaries', async () => {
    const speakers = [{ id: 'a' }, { id: 'b' }];
    const result = await bulkConversationSummary({ speakers, topic: 't' });
    expect(result).toEqual(['sum a', 'sum b']);
    expect(bulkMapRetry).toHaveBeenCalled();
  });
});

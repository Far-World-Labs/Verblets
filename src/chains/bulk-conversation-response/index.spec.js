import { describe, it, expect, vi } from 'vitest';
import bulkConversationResponse from './index.js';
import { bulkMapRetry } from '../bulk-map/index.js';

vi.mock('../bulk-map/index.js', () => ({
  bulkMapRetry: vi.fn(async () => ['hi a', 'hi b']),
}));

describe('bulkConversationResponse', () => {
  it('maps speakers to comments', async () => {
    const speakers = [{ id: 'a' }, { id: 'b' }];
    const result = await bulkConversationResponse({ speakers, topic: 't' });
    expect(result).toEqual(['hi a', 'hi b']);
    expect(bulkMapRetry).toHaveBeenCalled();
  });
});

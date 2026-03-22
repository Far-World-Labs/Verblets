import { describe, expect, it, vi } from 'vitest';

import schemaOrg from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/Kyoto \(location\)/.test(text)) {
      // Nothing is done with the result
      // so returning something complicated only introduces complexity
      return {};
    }
    return undefined;
  }),
}));

describe('Schema.org verblet', () => {
  it('returns structured schema object from text', async () => {
    const result = await schemaOrg('Kyoto (location)');
    expect(result).toStrictEqual({});
  });
});

import { describe, expect, it, vi } from 'vitest';
import listExpand from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn(async (prompt) => {
    const match = prompt.match(/<list>\n([\s\S]*?)\n<\/list>/);
    const lines = match ? match[1].split('\n') : [];
    const extras = lines.map((l) => `${l}-extra`);
    return { items: [...lines, ...extras] };
  }),
}));

describe('list-expand verblet', () => {
  it('expands items to at least the requested count', async () => {
    const result = await listExpand(['alpha', 'beta'], 4);
    expect(result).toStrictEqual(['alpha', 'beta', 'alpha-extra', 'beta-extra']);
  });
});

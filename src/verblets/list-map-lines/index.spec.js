import { describe, expect, it, vi } from 'vitest';
import listMap from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async (prompt) => {
    const match = prompt.match(/<list>\n([\s\S]*?)\n<\/list>/);
    const lines = match ? match[1].split('\n') : [];
    return lines.map((l) => l.toUpperCase()).join('\n');
  }),
}));

describe('list-map verblet', () => {
  it('maps items using instructions', async () => {
    const result = await listMap(['alpha', 'beta'], 'uppercase');
    expect(result).toStrictEqual(['ALPHA', 'BETA']);
  });
});

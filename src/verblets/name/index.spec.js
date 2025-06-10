import { describe, it, expect, vi } from 'vitest';
import name from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockResolvedValue('travelSnacks'),
}));

describe('name verblet', () => {
  it('suggests a short name', async () => {
    const result = await name('List of snacks I tried while traveling');
    expect(result).toBe('travelSnacks');
  });
});

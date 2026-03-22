import { beforeEach, describe, expect, it, vi } from 'vitest';
import join from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
}));

import llm from '../../lib/llm/index.js';

beforeEach(() => {
  vi.clearAllMocks();
  llm.mockImplementation((prompt) => {
    if (prompt.includes('Hello') && prompt.includes('world') && prompt.includes('today')) {
      return 'Hello and world and today';
    }
    if (prompt.includes('a') && prompt.includes('b') && prompt.includes('c')) {
      return 'a and b and c';
    }
    if (prompt.includes('SECTION A') || prompt.includes('Stitch')) {
      return 'Hello and world and today';
    }
    return 'joined result';
  });
});

describe('join chain', () => {
  it('joins fragments via LLM with transitions', async () => {
    const result = await join(['Hello', 'world', 'today'], 'Connect with simple words');

    expect(result).toContain('Hello');
    expect(result).toContain('world');
    expect(result).toContain('today');
    expect(llm).toHaveBeenCalled();
  });

  it('applies windowed processing when configured', async () => {
    const result = await join(['a', 'b', 'c'], 'Simple connections', { windowSize: 2 });

    expect(result.length).toBeGreaterThan(0);
    expect(llm).toHaveBeenCalled();
  });

  it('returns empty string for empty array, raw item for single', async () => {
    expect(await join([])).toBe('');
    expect(await join(['only'])).toBe('only');
    expect(llm).not.toHaveBeenCalled();
  });
});

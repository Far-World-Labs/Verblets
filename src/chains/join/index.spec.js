import { beforeEach, describe, expect, it, vi } from 'vitest';
import join from './index.js';

// Mock the ChatGPT function to avoid actual API calls
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(),
}));

import chatGPT from '../../lib/chatgpt/index.js';

beforeEach(() => {
  vi.clearAllMocks();
  // Mock ChatGPT to return joined text
  chatGPT.mockImplementation((prompt) => {
    // Simple mock that joins fragments mentioned in the prompt
    if (prompt.includes('Hello') && prompt.includes('world') && prompt.includes('today')) {
      return 'Hello and world and today';
    }
    if (prompt.includes('a') && prompt.includes('b') && prompt.includes('c')) {
      return 'a and b and c';
    }
    // For stitching operations, return a reasonable joined result
    if (prompt.includes('SECTION A') || prompt.includes('Stitch')) {
      return 'Hello and world and today';
    }
    // Default fallback
    return 'joined result';
  });
});

describe('join chain', () => {
  it('joins fragments with AI-generated transitions', async () => {
    const result = await join(['Hello', 'world', 'today'], 'Connect with simple words');

    expect(typeof result).toBe('string');
    expect(result).toContain('Hello');
    expect(result).toContain('world');
    expect(result).toContain('today');
    expect(chatGPT).toHaveBeenCalled();
  });

  it('applies windowed processing with configuration', async () => {
    const result = await join(['a', 'b', 'c'], 'Simple connections', { windowSize: 2 });

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(chatGPT).toHaveBeenCalled();
  });

  it('handles empty and single item arrays', async () => {
    const emptyResult = await join([]);
    expect(emptyResult).toBe('');

    const singleResult = await join(['only']);
    expect(singleResult).toBe('only');

    // Should not call ChatGPT for edge cases
    expect(chatGPT).not.toHaveBeenCalled();
  });
});

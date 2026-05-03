import { beforeEach, vi, expect } from 'vitest';
import join from './index.js';
import { runTable, contains, all } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({ default: vi.fn() }));

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

runTable({
  describe: 'join chain',
  examples: [
    {
      name: 'joins fragments via LLM with transitions',
      inputs: { items: ['Hello', 'world', 'today'], instructions: 'Connect with simple words' },
      check: all(contains('Hello'), contains('world'), contains('today'), () =>
        expect(llm).toHaveBeenCalled()
      ),
    },
    {
      name: 'applies windowed processing when configured',
      inputs: {
        items: ['a', 'b', 'c'],
        instructions: 'Simple connections',
        options: { windowSize: 2 },
      },
      check: ({ result }) => {
        expect(result.length).toBeGreaterThan(0);
        expect(llm).toHaveBeenCalled();
      },
    },
    {
      name: 'returns empty string for empty array',
      inputs: { items: [] },
      check: ({ result }) => {
        expect(result).toBe('');
        expect(llm).not.toHaveBeenCalled();
      },
    },
    {
      name: 'returns raw item for single-element array',
      inputs: { items: ['only'] },
      check: ({ result }) => {
        expect(result).toBe('only');
        expect(llm).not.toHaveBeenCalled();
      },
    },
  ],
  process: ({ items, instructions, options }) => join(items, instructions, options),
});

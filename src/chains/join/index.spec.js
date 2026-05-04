import { beforeEach, vi, expect } from 'vitest';
import join from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

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
      inputs: {
        items: ['Hello', 'world', 'today'],
        instructions: 'Connect with simple words',
        wantContains: ['Hello', 'world', 'today'],
        wantLlmCalled: true,
      },
    },
    {
      name: 'applies windowed processing when configured',
      inputs: {
        items: ['a', 'b', 'c'],
        instructions: 'Simple connections',
        options: { windowSize: 2 },
        wantNonEmpty: true,
        wantLlmCalled: true,
      },
    },
    {
      name: 'returns empty string for empty array',
      inputs: { items: [], want: '', wantNoLlm: true },
    },
    {
      name: 'returns raw item for single-element array',
      inputs: { items: ['only'], want: 'only', wantNoLlm: true },
    },
  ],
  process: ({ items, instructions, options }) => join(items, instructions, options),
  expects: ({ result, inputs }) => {
    if ('want' in inputs) expect(result).toBe(inputs.want);
    if (inputs.wantContains) {
      for (const fragment of inputs.wantContains) expect(result).toContain(fragment);
    }
    if (inputs.wantNonEmpty) expect(result.length).toBeGreaterThan(0);
    if (inputs.wantLlmCalled) expect(llm).toHaveBeenCalled();
    if (inputs.wantNoLlm) expect(llm).not.toHaveBeenCalled();
  },
});

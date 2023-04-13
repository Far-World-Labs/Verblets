import { describe, expect, it, vi } from 'vitest';

import questions from './index.js';

vi.mock('../../lib/openai/completions.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/a prompt toolkit/.test(text)) {
      return '{}';
    } else {
      return 'undefined';
    }
  }),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: {
      text: 'Writing a prompt toolkit for ChatGPT',
      searchBreadth: 0.5,
    },
    want: {}
  }
];

describe.skip('Questions verblet', () => {
  // Testing TBD. Randomness makes it challenging.
});
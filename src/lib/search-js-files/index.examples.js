import { describe, expect, it } from 'vitest';

import search from './index.js';

const examples = [
  {
    inputs: { filename: './src/lib/chatgpt/index.js' },
    want: { foundFiles: 30 },
  },
];

describe('Scan JS repo with best-first search', () => {
  examples.forEach((example) => {
    it(example.inputs.text, async () => {
      const result = await search({ node: example.inputs });

      if (example.want.foundFiles) {
        expect(result.visited.size).toBeGreaterThan(example.want.foundFiles);
      }
    });
  });
});

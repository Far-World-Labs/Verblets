import { describe, expect, it } from 'vitest';
import join from './index.js';
import chatGPT from '../../lib/chatgpt/index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('join examples', () => {
  it(
    'joins fragments using AI grouping',
    async () => {
      const fragments = ['One', 'two', 'Three', 'four'];
      const paragraphs = await join(fragments, ' ', (parts) => {
        return chatGPT(`Combine: ${parts.join(' ')}`);
      });
      expect(paragraphs.length).toBeGreaterThan(0);
    },
    longTestTimeout
  );
});

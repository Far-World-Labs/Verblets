import { describe, expect, it } from 'vitest';
import find from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('find examples', () => {
  it(
    'finds the best match across batches',
    async () => {
      const titles = [
        'ancient mystery',
        'space odyssey',
        'underwater adventure',
        'future tech thriller',
      ];
      const result = await find(titles, 'Which title feels most futuristic?', { chunkSize: 2 });
      expect(result).toBeDefined();
    },
    longTestTimeout
  );
});

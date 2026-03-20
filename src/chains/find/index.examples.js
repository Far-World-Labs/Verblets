import { describe } from 'vitest';
import find from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect } = getTestHelpers('Find chain');

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
      const result = await find(titles, 'Which title feels most futuristic?', { batchSize: 2 });
      expect(result).toBeDefined();
    },
    longTestTimeout
  );
});

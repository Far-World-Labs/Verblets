import group from './index.js';
import { describe } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect } = getTestHelpers('Group chain');

describe('group examples', () => {
  it(
    'groups a long list',
    async () => {
      const items = ['dog', 'fish', 'cat', 'whale', 'bird', 'shark', 'horse', 'dolphin'];
      const result = await group(items, 'Is each creature terrestrial or aquatic?', {
        batchSize: 4,
      });
      expect(typeof result).toBe('object');
      expect(Object.keys(result).length).toBeGreaterThan(0);
    },
    longTestTimeout
  );
});

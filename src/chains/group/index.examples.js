import group from './index.js';
import { describe, it, expect } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';

describe('group examples', () => {
  it(
    'groups a long list',
    async () => {
      const items = ['dog', 'fish', 'cat', 'whale', 'bird', 'shark', 'horse', 'dolphin'];
      const result = await group(items, 'Is each creature terrestrial or aquatic?', {
        chunkSize: 4,
      });
      expect(typeof result).toBe('object');
      expect(Object.keys(result).length).toBeGreaterThan(0);
    },
    longTestTimeout
  );
});

import { describe, it, expect } from 'vitest';
import listGroup from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('list-group examples', () => {
  it(
    'groups a list into categories',
    async () => {
      const items = ['apple', 'beer', 'orange', 'wine', 'banana'];
      const result = await listGroup(items, 'Group as drinks or food', ['drink', 'food']);
      expect(typeof result).toBe('object');
      expect(Object.keys(result).length).toBeGreaterThan(0);
    },
    longTestTimeout
  );
});

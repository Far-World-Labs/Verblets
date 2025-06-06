import { describe, it, expect } from 'vitest';
import listExpand from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('list-expand examples', () => {
  it(
    'expands a short list of fruits',
    async () => {
      const result = await listExpand(['apple', 'banana'], 5);
      expect(result.length).toBeGreaterThanOrEqual(5);
    },
    longTestTimeout
  );
});

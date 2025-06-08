import { describe, it, expect } from 'vitest';
import intersection from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('intersection examples', () => {
  it(
    'finds commonalities among devices',
    async () => {
      const result = await intersection(['smartphone', 'laptop', 'tablet']);
      expect(Array.isArray(result)).toBe(true);
    },
    longTestTimeout
  );
});

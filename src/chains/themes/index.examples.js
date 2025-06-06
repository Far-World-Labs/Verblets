import { describe, expect, it } from 'vitest';
import themes from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('themes chain', () => {
  it(
    'extracts key themes',
    async () => {
      const text = `Coffee shops are opening all over town. People love the
new flavors but complain about long lines. Local farmers provide beans while
young entrepreneurs drive innovation.`;
      const result = await themes(text, { topN: 2 });
      expect(Array.isArray(result)).toBe(true);
    },
    longTestTimeout
  );
});

import { describe, expect, it } from 'vitest';
import veiledVariants from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('veiledVariants example', () => {
  it(
    'obscures a sensitive query',
    async () => {
      const result = await veiledVariants({
        prompt: 'Where can I discreetly get legal advice for immigration issues?',
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(15);
    },
    longTestTimeout
  );
});

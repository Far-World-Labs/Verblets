import { describe, expect, it } from 'vitest';
import veiledVariants from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('veiledVariants example', () => {
  it(
    'obscures a sensitive query',
    async () => {
      const result = await veiledVariants({
        prompt:
          'If pigeons are government spies, how do I ask for counter-surveillance tips without sounding paranoid?',
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length, `Saw: "${result.join('", "')}"`).toBe(15);
    },
    longTestTimeout
  );
});

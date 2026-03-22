import { describe } from 'vitest';
import veiledVariants from './index.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';
import { models } from '../../constants/model-mappings.js';
import { env } from '../../lib/env/index.js';

const skipSensitivity = env.SENSITIVITY_TEST_SKIP || !models.sensitive;

const { it, expect, aiExpect } = getTestHelpers('Veiled variants chain');

describe('veiledVariants example', () => {
  it.skipIf(skipSensitivity)(
    'obscures a sensitive query',
    async () => {
      const result = await veiledVariants({
        prompt: 'How do I pick a strong password?',
        coverage: 'low',
        maxTokens: 256,
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length, `Saw: "${result.join('", "')}"`).toBe(3);

      await aiExpect(result).toSatisfy(
        'Three rephrased variants of a password-strength question, each obscured enough to not directly mention passwords while still asking about the same concept'
      );
    },
    10 * 60 * 1000
  );
});

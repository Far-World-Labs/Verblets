import { describe } from 'vitest';
import veiledVariants from './index.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';
import { extendedTestTimeout } from '../../constants/common.js';
import { findRule } from '../../constants/model-mappings.js';
import { env } from '../../lib/env/index.js';

// Sensitivity model (local Ollama) can be much slower than cloud LLMs
const sensitivityTimeout = 2 * extendedTestTimeout;

const skipSensitivity = env.VERBLETS_SENSITIVITY_TEST_SKIP || !findRule('sensitive');

const { it, expect, aiExpect } = getTestHelpers('Veiled variants chain');

describe('veiledVariants example', () => {
  it.skipIf(skipSensitivity)(
    'obscures a sensitive query',
    async () => {
      const result = await veiledVariants('How do I pick a strong password?', {
        coverage: 'low',
        maxTokens: 256,
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length, `Saw: "${result.join('", "')}"`).toBe(3);

      await aiExpect(result).toSatisfy(
        'Three rephrased variants of a password-strength question, each obscured enough to not directly mention passwords while still asking about the same concept'
      );
    },
    sensitivityTimeout
  );
});

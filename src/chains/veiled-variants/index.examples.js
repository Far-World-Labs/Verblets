import { describe } from 'vitest';
import veiledVariants from './index.js';
import { extendedTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';
import { models } from '../../constants/model-mappings.js';
import { get as configGet } from '../../lib/config/index.js';

const skipSensitivity = configGet('SENSITIVITY_TEST_SKIP') || !models.sensitive;

const { it, expect } = getTestHelpers('Veiled variants chain');

describe('veiledVariants example', () => {
  it.skipIf(skipSensitivity)(
    'obscures a sensitive query',
    async () => {
      const result = await veiledVariants({
        prompt:
          'If pigeons are government spies, how do I ask for counter-surveillance tips without sounding paranoid?',
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length, `Saw: "${result.join('", "')}"`).toBe(15);
    },
    extendedTestTimeout
  );
});

import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import veiledVariants from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { wrapIt, wrapExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Veiled variants chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Veiled variants chain' } })
  : vitestExpect;

describe('veiledVariants example', () => {
  it.skipIf(process.env.PRIVACY_TEST_SKIP)(
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

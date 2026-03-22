import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import sensitivityAudit from './index.js';
import { wrapIt, wrapExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';
import { extendedTestTimeout } from '../../constants/common.js';
import { models } from '../../constants/models.js';

const skipSensitivity = process.env.SENSITIVITY_TEST_SKIP || !models.sensitive;

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Sensitivity audit' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Sensitivity audit' } })
  : vitestExpect;

describe('Sensitivity audit examples', () => {
  it.skipIf(skipSensitivity)(
    'batch audit: scan and classify multiple texts with summary',
    { timeout: extendedTestTimeout },
    async () => {
      const texts = [
        'The quarterly revenue report shows 15% growth in the APAC region.',
        'Employee Sarah Lee (SSN: 123-45-6789) filed a complaint on March 3rd.',
        'The new React 19 release includes improved server component hydration.',
        'Patient James Wu, diagnosed with stage 2 hypertension, prescribed lisinopril 10mg.',
        'Meeting notes: discussed Q3 roadmap priorities and sprint velocity targets.',
      ];

      const result = await sensitivityAudit(texts, { threshold: 0.35 });

      expect(result.items).toHaveLength(5);
      expect(result.summary.totalItems).toBe(5);
      expect(result.summary.flaggedCount).toBeGreaterThan(0);
      expect(result.summary.flaggedCount).toBeLessThan(5);

      // Items with PII/medical data should be flagged
      const flaggedTexts = result.items
        .filter((item) => item.classification.level !== 'none')
        .map((item) => item.text);

      expect(flaggedTexts.length).toBeGreaterThan(0);
    }
  );
});

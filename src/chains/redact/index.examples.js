import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import redact, { redactSpec, applyRedact, createRedactor } from './index.js';
import sensitivityScan from '../sensitivity-scan/index.js';
import vitestAiExpect from '../expect/index.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';
import { extendedTestTimeout } from '../../constants/common.js';
import { models } from '../../constants/models.js';
import { get as configGet } from '../../lib/config/index.js';

const skipSensitivity = configGet('SENSITIVITY_TEST_SKIP') || !models.sensitive;

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Redact chain' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Redact chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Redact chain' } })
  : vitestAiExpect;

const customerServiceEmail = `Dear Support,

My name is Rebecca Torres and I'm writing about order #A-29841. My credit card
ending in 4532 was charged twice on 2024-11-18. Please refund the duplicate
charge to my account. You can reach me at rebecca.torres@outlook.com or
(512) 555-0147. My billing address is 2847 Elm Creek Drive, Austin, TX 78704.

Thank you,
Rebecca Torres`;

describe('Redact examples', () => {
  it.skipIf(skipSensitivity)(
    'scan-guided redaction: detect then redact with placeholders',
    { timeout: extendedTestTimeout },
    async () => {
      const scan = await sensitivityScan(customerServiceEmail);
      const result = await redact(customerServiceEmail, { scan, mode: 'placeholder' });

      expect(result.text).toBeDefined();
      expect(result.replacements.length).toBeGreaterThan(0);
      expect(result.text).not.toContain('Rebecca Torres');
      expect(result.text).not.toContain('rebecca.torres@outlook.com');
      expect(result.text).not.toContain('(512) 555-0147');

      await aiExpect(result.text).toSatisfy(
        'a customer service email with personal identifiers replaced by category placeholders like [PERSON_1], [EMAIL_1], etc., while preserving the email structure and business content'
      );
    }
  );

  it.skipIf(skipSensitivity)(
    'generalize mode: replace PII with natural-language descriptions',
    { timeout: extendedTestTimeout },
    async () => {
      const medicalIntake = `Patient Michael Okafor (DOB: 1978-06-22, MRN: MED-8847213) presents
with chronic lower back pain. Referring physician: Dr. Linda Zhao, Northwestern Memorial
Hospital. Insurance: BlueCross policy #BC-445-992-1187.`;

      const result = await redact(medicalIntake, { mode: 'generalize' });

      expect(result.text).not.toContain('Michael Okafor');
      expect(result.text).not.toContain('1978-06-22');
      expect(result.text).not.toContain('MED-8847213');

      await aiExpect(result.text).toSatisfy(
        'a medical intake note where personal identifiers are replaced with natural-language generalizations (e.g. "a patient", "a date of birth") while preserving the clinical content about chronic lower back pain'
      );
    }
  );

  it.skipIf(skipSensitivity)(
    'spec/apply pattern: generate HIPAA rules then apply to multiple records',
    { timeout: extendedTestTimeout },
    async () => {
      const spec = await redactSpec(
        'HIPAA Safe Harbor: redact all 18 PHI identifiers. Use placeholder mode with category-specific counters. Treat partial names combined with medical context as PHI.'
      );

      expect(spec).toHaveProperty('mode');
      expect(spec).toHaveProperty('targetCategories');
      expect(spec).toHaveProperty('replacementRules');

      const records = [
        'Emma Liu, age 34, diagnosed with gestational diabetes. Contact: emma.liu@gmail.com.',
        'Carlos Mendez (SSN: 987-65-4321) admitted for cardiac catheterization on 2024-03-15.',
      ];

      const results = await Promise.all(records.map((record) => applyRedact(record, spec)));

      for (const result of results) {
        expect(result.replacements.length).toBeGreaterThan(0);
        await aiExpect(result.text).toSatisfy(
          'a medical record with personal identifiers replaced by placeholders, preserving medical diagnoses and procedures'
        );
      }
    }
  );

  it.skipIf(skipSensitivity)(
    'createRedactor: reusable factory for consistent redaction',
    { timeout: extendedTestTimeout },
    async () => {
      const spec = await redactSpec(
        'Financial compliance: redact account numbers, SSNs, and full names. Use placeholder mode. Preserve transaction amounts and dates.'
      );

      const redactor = createRedactor(spec);
      expect(redactor.specification).toBe(spec);

      const result = await redactor(
        'Transfer of $12,500 from James Park (acct #8834-2291-0045) to Lisa Wang (acct #7712-3340-8891) on 2024-09-03.'
      );

      expect(result.text).not.toContain('James Park');
      expect(result.text).not.toContain('Lisa Wang');

      await aiExpect(result.text).toSatisfy(
        'a financial transaction record with names and account numbers replaced by placeholders, but dollar amounts and dates preserved'
      );
    }
  );
});

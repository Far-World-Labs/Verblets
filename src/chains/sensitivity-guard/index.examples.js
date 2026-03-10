import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import sensitivityScan from '../sensitivity-scan/index.js';
import sensitivityClassify, { policyFromAudit } from '../../lib/sensitivity-classify/index.js';
import sensitivityGuard, { createSensitivityGuard } from './index.js';
import sensitivityAudit from '../sensitivity-audit/index.js';
import { sensitivityPolicy } from '../../constants/sensitivity-policy.js';
import { applyEntities } from '../entities/index.js';
import map from '../map/index.js';
import score from '../score/index.js';
import filter from '../filter/index.js';
import vitestAiExpect from '../expect/index.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';
import { extendedTestTimeout } from '../../constants/common.js';
import { models } from '../../constants/models.js';
import { get as configGet } from '../../lib/config/index.js';

const skipSensitivity = configGet('SENSITIVITY_TEST_SKIP') || !models.sensitive;

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Sensitivity composition' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Sensitivity composition' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Sensitivity composition' } })
  : vitestAiExpect;

const medicalNote = `Patient Sarah Chen (DOB: 1985-03-14, SSN: 456-78-9012) presented with
persistent migraine headaches. Dr. James Rivera prescribed sumatriptan 50mg.
Emergency contact: Michael Chen at (415) 555-0198 or mchen@gmail.com.`;

const mixedContent = [
  'The quarterly revenue report shows 15% growth in the APAC region.',
  'Employee Sarah Lee (SSN: 123-45-6789) filed a harassment complaint on March 3rd.',
  'The new React 19 release includes improved server component hydration.',
  'Patient record #4421: James Wu, diagnosed with stage 2 hypertension, prescribed lisinopril 10mg.',
  'Meeting notes: discussed Q3 roadmap priorities and sprint velocity targets.',
];

describe('Sensitivity composition examples', () => {
  it.skipIf(skipSensitivity)(
    'scan → classify → route: assess risk before deciding on protection',
    { timeout: extendedTestTimeout },
    async () => {
      const scan = await sensitivityScan(medicalNote);
      const classification = sensitivityClassify(scan);

      expect(scan.flagged).toBe(true);
      expect(classification.level).toBeDefined();
      expect(Object.keys(classification.categories).length).toBeGreaterThan(0);
      expect(classification.summary).toContain('detected');

      await aiExpect(classification.summary).toSatisfy(
        'indicates sensitivity risk involving medical or identity data'
      );
    }
  );

  it.skipIf(skipSensitivity)(
    'policy presets with sensitivityGuard: HIPAA categories and threshold applied',
    { timeout: extendedTestTimeout },
    async () => {
      // Spread HIPAA preset — categories (16 PHI types) and threshold (0.3) applied
      // Override method/verify for test speed (strict = 3 stages, balanced = 2)
      const result = await sensitivityGuard(
        'Sarah Chen (SSN: 456-78-9012) prescribed sumatriptan.',
        { ...sensitivityPolicy.HIPAA, method: 'balanced', verify: false }
      );

      expect(result.flagged).toBe(true);
      expect(result.text).toBeDefined();
      expect(result.text).not.toContain('Sarah Chen');
      expect(result.text).not.toContain('456-78-9012');

      await aiExpect(result.text).toSatisfy(
        'medical text with personal identifiers removed or replaced'
      );
    }
  );

  it.skipIf(skipSensitivity)(
    'PII entity extraction: scan then extract with sensitive model',
    { timeout: extendedTestTimeout },
    async () => {
      // Gate with sensitivity scan, then extract entities using sensitive model
      // (structured output fallback enables JSON schemas on local models)
      const scan = await sensitivityScan(medicalNote);
      expect(scan.flagged).toBe(true);

      const { entities } = await applyEntities(
        medicalNote,
        'Extract all personally identifiable information: names, dates of birth, SSNs, phone numbers, email addresses',
        { llm: { sensitive: true } }
      );

      expect(entities.length).toBeGreaterThan(0);

      const entityNames = entities.map((e) => e.name);
      await aiExpect(entityNames.join(', ')).toSatisfy(
        'contains personal identifiers like names, SSNs, phone numbers, or email addresses'
      );
    }
  );

  it.skipIf(skipSensitivity)(
    'batch anonymization: map records to remove PII with sensitive model',
    { timeout: extendedTestTimeout },
    async () => {
      const records = [
        'John Martinez, age 42, diagnosed with Type 2 diabetes. Contact: john.m@email.com.',
        'Emily Park, SSN 321-54-8765, treated for anxiety disorder.',
        'Robert Williams called from (303) 555-0234 regarding his MRI results.',
      ];

      const anonymized = await map(
        records,
        'Rewrite each record replacing all personal information (names, SSNs, emails, phone numbers) with generic placeholders while preserving medical facts',
        { batchSize: 1, llm: { sensitive: true } }
      );

      expect(anonymized).toHaveLength(records.length);

      for (const record of anonymized) {
        expect(record).toBeDefined();
        await aiExpect(record).toSatisfy(
          'a medical record with personal identifiers replaced by placeholders or generic terms'
        );
      }
    }
  );

  it.skipIf(skipSensitivity)(
    'sensitivity risk scoring: rate items by sensitivity level with sensitive model',
    { timeout: extendedTestTimeout },
    async () => {
      const scores = await score(
        mixedContent,
        'Rate how much personally identifiable or sensitive personal information this text contains, from 0 (none) to 10 (highly sensitive PII)',
        { llm: { sensitive: true } }
      );

      expect(scores).toHaveLength(mixedContent.length);
      scores.forEach((s) => expect(typeof s).toBe('number'));

      // Items with PII (employee SSN, patient record) should score higher than business/tech items
      const businessReportScore = scores[0];
      const employeeRecordScore = scores[1];
      const techArticleScore = scores[2];
      const patientRecordScore = scores[3];

      expect(employeeRecordScore).toBeGreaterThan(businessReportScore);
      expect(patientRecordScore).toBeGreaterThan(techArticleScore);
    }
  );

  it.skipIf(skipSensitivity)(
    'filter sensitive content: separate PII items from safe ones with sensitive model',
    { timeout: extendedTestTimeout },
    async () => {
      const sensitive = await filter(
        mixedContent,
        'Keep only items that contain personally identifiable information such as names with SSNs, medical records, or contact details',
        { llm: { sensitive: true } }
      );

      expect(sensitive.length).toBeGreaterThan(0);
      expect(sensitive.length).toBeLessThan(mixedContent.length);

      for (const item of sensitive) {
        await aiExpect(item).toSatisfy(
          'contains personally identifiable information like names, SSNs, medical data, or contact details'
        );
      }
    }
  );

  it.skipIf(skipSensitivity)(
    'full pipeline: audit corpus → generate guard spec → apply learned guard to new text',
    { timeout: extendedTestTimeout },
    async () => {
      // Step 1: Audit a sample corpus to learn its sensitivity profile
      const corpus = [
        'Patient Maria Gonzalez (DOB: 1990-04-22) diagnosed with Type 1 diabetes.',
        'Lab results for specimen #4481: glucose 210 mg/dL, HbA1c 8.2%.',
        'The hospital cafeteria will be closed for renovation next Tuesday.',
        'Dr. Robert Tanaka referred patient to endocrinology. Insurance: Aetna #AET-992-441.',
      ];

      const audit = await sensitivityAudit(corpus, { threshold: 0.35 });

      expect(audit.summary.totalItems).toBe(4);
      expect(audit.summary.flaggedCount).toBeGreaterThan(0);

      // Step 2: Derive a guard policy from the audit (pure, no LLM)
      const policy = policyFromAudit(audit.summary);

      expect(policy).toHaveProperty('threshold');
      expect(policy).toHaveProperty('categories');
      expect(policy).toHaveProperty('protection');

      // Step 3: Create a reusable guard from the derived policy
      const guard = createSensitivityGuard(policy);

      // Step 4: Apply to new text not in the original corpus
      const newRecord =
        'Angela Park (SSN: 234-56-7890) admitted for cardiac monitoring. BP: 145/92.';
      const result = await guard(newRecord);

      expect(result.flagged).toBe(true);
      expect(result.text).not.toContain('Angela Park');
      expect(result.text).not.toContain('234-56-7890');

      await aiExpect(result.text).toSatisfy(
        'a medical record with patient identity protected but clinical measurements (BP: 145/92) preserved'
      );
    }
  );
});

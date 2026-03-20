import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import { calibrateSpec, applyCalibrate, createCalibratedClassifier } from './index.js';
import probeScan from '../probe-scan/index.js';
import embedProbes from '../../lib/embed-probes/index.js';
import vitestAiExpect from '../expect/index.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';
import { extendedTestTimeout } from '../../constants/common.js';
import { get as configGet } from '../../lib/config/index.js';

const skipEmbedding = !configGet('OPENWEBUI_API_KEY');

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Calibrate chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Calibrate chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Calibrate chain' } })
  : vitestAiExpect;

const PROBES = [
  { category: 'pii-name', label: 'Personal full names', queries: ['full name of a person'] },
  {
    category: 'pii-ssn',
    label: 'Social security numbers',
    queries: ['social security number SSN'],
  },
  {
    category: 'medical-record',
    label: 'Medical records and prescriptions',
    queries: ['medical record prescription diagnosis'],
  },
  {
    category: 'financial-card',
    label: 'Credit or debit card numbers',
    queries: ['credit card debit card number'],
  },
  {
    category: 'contact-phone',
    label: 'Phone numbers',
    queries: ['phone number telephone contact'],
  },
  { category: 'contact-email', label: 'Email addresses', queries: ['email address contact'] },
];

describe('Calibrate examples', () => {
  it.skipIf(skipEmbedding)(
    'LLM-enhanced classification: learn severity rules from corpus scans',
    { timeout: extendedTestTimeout },
    async () => {
      const probes = await embedProbes(PROBES);

      // Step 1: Scan a representative corpus with custom probes
      const corpus = [
        'The quarterly earnings report shows 12% revenue growth.',
        'Employee James Lee (SSN: 111-22-3333) filed a leave request.',
        'Patient Ana Reyes, DOB 1987-11-03, prescribed metformin 500mg.',
        'The team discussed sprint velocity improvements for Q4.',
        'Credit card ending in 8842 was charged $3,200 on 2024-08-15.',
      ];

      const scans = await Promise.all(corpus.map((text) => probeScan(text, probes)));

      const flaggedCount = scans.filter((s) => s.flagged).length;
      expect(flaggedCount).toBeGreaterThan(0);
      expect(flaggedCount).toBeLessThan(corpus.length);

      // Step 2: Generate calibration spec from the scans — the LLM learns the
      // corpus's sensitivity landscape and produces calibrated classification rules
      const spec = await calibrateSpec(scans, {
        instructions:
          'Classify data sensitivity for a corporate compliance audit. Government IDs and medical data are critical; financial data is high; names alone are medium.',
      });

      expect(spec).toHaveProperty('corpusProfile');
      expect(spec).toHaveProperty('classificationCriteria');
      expect(spec).toHaveProperty('salienceCriteria');
      expect(spec).toHaveProperty('categoryNotes');

      await aiExpect(spec.corpusProfile).toSatisfy(
        'describes a mixed-sensitivity corpus with business, employee PII, medical, and financial data'
      );

      // Step 3: Apply the learned spec to classify individual items
      const medicalScan = scans[2]; // Ana Reyes medical record
      const classification = await applyCalibrate(medicalScan, spec);

      expect(classification).toHaveProperty('severity');
      expect(classification).toHaveProperty('salience');
      expect(classification).toHaveProperty('summary');
      expect(['medium', 'high', 'critical']).toContain(classification.severity);
    }
  );

  it.skipIf(skipEmbedding)(
    'createCalibratedClassifier: reusable classifier for streaming classification',
    { timeout: extendedTestTimeout },
    async () => {
      const probes = await embedProbes(PROBES);

      // Train on a small corpus
      const trainingTexts = [
        'Robert Chen called from (555) 012-3456 about his prescription.',
        'Meeting room B is booked for the 3pm standup.',
        'Invoice #7841 for $8,500 sent to accounts@client.org.',
      ];

      const trainingScans = await Promise.all(trainingTexts.map((text) => probeScan(text, probes)));

      const spec = await calibrateSpec(trainingScans, {
        instructions:
          'Classify sensitivity for a healthcare contact center. Phone numbers with medical context are high severity.',
      });

      // Create reusable classifier — spec is baked in, no LLM call to regenerate
      const classifier = createCalibratedClassifier(spec);
      expect(classifier.specification).toBe(spec);

      // Classify new, unseen texts
      const newScan = await probeScan(
        'Lisa Wang (DOB: 1995-02-14) requested prescription refill. Callback: (415) 555-9988.',
        probes
      );

      const result = await classifier(newScan);

      expect(result.severity).toBeDefined();
      expect(result.summary).toBeDefined();

      await aiExpect(result.summary).toSatisfy(
        'explains why this text is sensitive, referencing personal and medical or contact information'
      );
    }
  );
});

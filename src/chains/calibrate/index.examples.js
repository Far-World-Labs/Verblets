import { describe } from 'vitest';
import { calibrateSpec, applyCalibrate, createCalibratedClassifier } from './index.js';
import { embedBatch, embedChunked } from '../../embed/local.js';
import scoreChunksByProbes from '../../embed/score-chunks-by-probes/index.js';
import { extendedTestTimeout } from '../../constants/common.js';
import { isEmbedEnabled } from '../../embed/state.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Calibrate chain');

const skip = !isEmbedEnabled();

const PROBE_DEFS = [
  { category: 'pii-name', label: 'Personal full names', query: 'full name of a person' },
  {
    category: 'pii-ssn',
    label: 'Social security numbers',
    query: 'social security number SSN',
  },
  {
    category: 'medical-record',
    label: 'Medical records and prescriptions',
    query: 'medical record prescription diagnosis',
  },
  {
    category: 'financial-card',
    label: 'Credit or debit card numbers',
    query: 'credit card debit card number',
  },
  {
    category: 'contact-phone',
    label: 'Phone numbers',
    query: 'phone number telephone contact',
  },
  { category: 'contact-email', label: 'Email addresses', query: 'email address contact' },
];

async function embedProbes(defs) {
  const vectors = await embedBatch(defs.map((p) => p.query));
  return defs.map((probe, i) => ({
    category: probe.category,
    label: probe.label,
    vector: vectors[i],
  }));
}

async function scan(text, probes, threshold = 0.4) {
  const chunks = await embedChunked(text, { maxTokens: 256 });
  const hits = scoreChunksByProbes(chunks, probes).filter((h) => h.score >= threshold);
  return { flagged: hits.length > 0, hits };
}

describe.skipIf(skip)('Calibrate examples', () => {
  it(
    'LLM-enhanced classification: learn severity rules from corpus scans',
    { timeout: extendedTestTimeout },
    async () => {
      const probes = await embedProbes(PROBE_DEFS);

      // Step 1: Scan a representative corpus with custom probes
      const corpus = [
        'The quarterly earnings report shows 12% revenue growth.',
        'Employee James Lee (SSN: 111-22-3333) filed a leave request.',
        'Patient Ana Reyes, DOB 1987-11-03, prescribed metformin 500mg.',
        'The team discussed sprint velocity improvements for Q4.',
        'Credit card ending in 8842 was charged $3,200 on 2024-08-15.',
      ];

      const scans = await Promise.all(corpus.map((text) => scan(text, probes)));

      const flaggedCount = scans.filter((s) => s.flagged).length;
      expect(flaggedCount).toBeGreaterThan(0);

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

  it(
    'createCalibratedClassifier: reusable classifier for streaming classification',
    { timeout: extendedTestTimeout },
    async () => {
      const probes = await embedProbes(PROBE_DEFS);

      // Train on a small corpus
      const trainingTexts = [
        'Robert Chen called from (555) 012-3456 about his prescription.',
        'Meeting room B is booked for the 3pm standup.',
        'Invoice #7841 for $8,500 sent to accounts@client.org.',
      ];

      const trainingScans = await Promise.all(trainingTexts.map((text) => scan(text, probes)));

      const spec = await calibrateSpec(trainingScans, {
        instructions:
          'Classify sensitivity for a healthcare contact center. Phone numbers with medical context are high severity.',
      });

      // Create reusable classifier — spec is baked in, no LLM call to regenerate
      const classifier = createCalibratedClassifier(spec);
      expect(classifier.specification).toBe(spec);

      // Classify new, unseen texts
      const newScan = await scan(
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

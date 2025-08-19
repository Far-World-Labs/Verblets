import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import {
  anonymize,
  anonymizeMethod,
  anonymizeSpec,
  mapInstructions,
  reduceInstructions,
  createAnonymizer,
} from './index.js';
import map from '../map/index.js';
import reduce from '../reduce/index.js';
import vitestAiExpect from '../expect/index.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Anonymize chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Anonymize chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Anonymize chain' } })
  : vitestAiExpect;

// Test data
const personalText = `As a seasoned engineer from Silicon Valley, I've found that React's 
component lifecycle is like a well-oiled machine - understanding the mounting 
phase is crucial, especially with those pesky useEffect hooks. Trust me, after 
10 years of experience, proper cleanup is key to avoiding memory leaks!`;

const techTexts = [
  'Jane Smith from Google explains that React hooks changed everything in 2019.',
  'Dr. John Doe at Meta discovered that server components improve performance by 40%.',
  'Sarah Johnson from Amazon Web Services teaches that proper caching is crucial.',
];

// Helper to verify anonymization
async function verifyAnonymized(text, description) {
  const hasNoPersonalInfo = await aiExpect(text).toSatisfy(`text that ${description}`, {
    throws: false,
  });
  return hasNoPersonalInfo;
}

describe('anonymize core functionality', () => {
  it.skipIf(process.env.PRIVACY_TEST_SKIP)(
    'applies different anonymization methods',
    { timeout: 60_000 },
    async () => {
      // Test all three methods
      const [strict, balanced, light] = await Promise.all([
        anonymize({ text: personalText, method: anonymizeMethod.STRICT }),
        anonymize({ text: personalText, method: anonymizeMethod.BALANCED }),
        anonymize({ text: personalText, method: anonymizeMethod.LIGHT }),
      ]);

      // Structure validation
      for (const result of [strict, balanced, light]) {
        expect(result).to.have.property('text');
        expect(result).to.have.property('stages');
      }

      // Verify stages by method
      expect(strict.stages).to.have.all.keys(
        'distinctiveContentRemoved',
        'structureNormalized',
        'patternsSuppressed'
      );
      expect(balanced.stages).to.have.all.keys('distinctiveContentRemoved', 'structureNormalized');
      expect(light.stages).to.have.all.keys('distinctiveContentRemoved');

      // Verify anonymization quality loosely
      const strictCheck = await verifyAnonymized(
        strict.text,
        'is heavily anonymized with no personal identifiers or distinctive style'
      );
      expect(strictCheck).toBe(true);

      const balancedCheck = await verifyAnonymized(
        balanced.text,
        'maintains technical content while removing personal information'
      );
      expect(balancedCheck).toBe(true);

      const lightCheck = await verifyAnonymized(
        light.text,
        'lightly removes obvious personal markers while preserving most content'
      );
      expect(lightCheck).toBe(true);
    }
  );
});

describe('anonymize collection operations', () => {
  it.skipIf(process.env.PRIVACY_TEST_SKIP)(
    'maps anonymization across items',
    { timeout: 60_000 },
    async () => {
      const instructions = await mapInstructions(
        'Remove personal and company names from technical insights'
      );

      const results = await map(techTexts, instructions);

      expect(results).to.be.an('array');
      expect(results).to.have.length(techTexts.length);

      // Verify anonymization happened
      for (let i = 0; i < results.length; i++) {
        expect(results[i]).to.be.a('string');
        // Check that names were replaced
        expect(results[i]).to.not.include('Jane Smith');
        expect(results[i]).to.not.include('John Doe');
        expect(results[i]).to.not.include('Sarah Johnson');
        expect(results[i]).to.not.include('Google');
        expect(results[i]).to.not.include('Meta');
        expect(results[i]).to.not.include('Amazon');
        // Check that technical content remains
        expect(results[i].toLowerCase()).to.match(/react|performance|caching/);
      }

      // Loose check that results look anonymized
      const hasAnonymizedContent = await aiExpect(results.join('\n')).toSatisfy(
        'contains technical content with placeholder names like [Person] or [Company]',
        { throws: false }
      );
      expect(hasAnonymizedContent).toBe(true);
    }
  );

  it.skipIf(process.env.PRIVACY_TEST_SKIP)(
    'reduces with final anonymization',
    { timeout: 60_000 },
    async () => {
      const instructions = await reduceInstructions({
        processing: 'Combine insights into a unified technical summary',
        anonymization: 'Remove all identifiers from the final summary',
      });

      const summary = await reduce(techTexts, instructions);

      expect(summary).to.be.a('string');
      expect(summary.length).to.be.greaterThan(20);

      const isAnonymizedSummary = await aiExpect(summary).toSatisfy(
        'a summary that mentions technical topics without any real names or companies',
        { throws: false }
      );
      expect(isAnonymizedSummary).toBe(true);
    }
  );

  it.skip(
    'filters and anonymizes sensitive content - TODO: filter chain needs refactoring',
    { timeout: 60_000 },
    async () => {
      // TODO: The filter chain currently only returns yes/no decisions
      // It needs to be refactored to support filter+transform operations
    }
  );

  it.skipIf(process.env.PRIVACY_TEST_SKIP)(
    'creates reusable specification for consistency',
    { timeout: 60_000 },
    async () => {
      // Create a specification that can be reused
      const spec = await anonymizeSpec({
        method: 'balanced',
        context: 'Customer reviews',
        instructions: 'Remove names and companies while preserving product feedback',
      });

      expect(spec).to.be.a('string');
      expect(spec.length).to.be.greaterThan(50);

      // Use the spec in map instructions
      const instructions1 = await mapInstructions(
        { anonymization: spec, processing: 'Process reviews batch 1' },
        {},
        () => spec
      );

      const instructions2 = await mapInstructions(
        { anonymization: spec, processing: 'Process reviews batch 2' },
        {},
        () => spec
      );

      // Both should have the same specification
      expect(instructions1.specification).toBe(spec);
      expect(instructions2.specification).toBe(spec);

      // Test with sample data
      const batch1 = ['Alice from TechCorp loves the new features'];
      const batch2 = ['Bob at StartupInc found some bugs'];

      const [results1, results2] = await Promise.all([
        map(batch1, instructions1),
        map(batch2, instructions2),
      ]);

      // Both should be anonymized consistently
      const bothAnonymized = await aiExpect([...results1, ...results2]).toSatisfy(
        'reviews with consistent anonymization style and placeholders',
        { throws: false }
      );
      expect(bothAnonymized).toBe(true);
    }
  );
});

describe('anonymize advanced features', () => {
  it.skipIf(process.env.PRIVACY_TEST_SKIP)(
    'creates reusable anonymizer with specification',
    { timeout: 60_000 },
    async () => {
      const spec = await anonymizeSpec({
        method: 'balanced',
        context: 'Technical blog posts',
        instructions: 'Remove author identity while preserving technical accuracy',
      });

      const anonymizer = createAnonymizer(spec);

      // Test function properties
      expect(anonymizer).toBeInstanceOf(Function);
      expect(anonymizer.specification).toBe(spec);

      // Test usage
      const [result1, result2] = await Promise.all([
        anonymizer(personalText),
        anonymizer({ text: techTexts[0] }),
      ]);

      for (const result of [result1, result2]) {
        expect(result).to.have.property('text');
        expect(result).to.have.property('stages');
      }

      // Verify both are anonymized appropriately
      const bothAnonymized = await aiExpect([result1.text, result2.text]).toSatisfy(
        'technical texts with personal information removed',
        { throws: false }
      );
      expect(bothAnonymized).toBe(true);
    }
  );
});

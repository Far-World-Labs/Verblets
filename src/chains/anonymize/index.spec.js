import { describe, expect, it, vi } from 'vitest';
import {
  anonymize,
  anonymizeSpec,
  mapInstructions,
  filterInstructions,
  reduceInstructions,
  findInstructions,
  groupInstructions,
  createAnonymizer,
} from './index.js';

// Test helpers
const mockSpec =
  'Anonymization specification: Remove names, dates, and locations. Use balanced method.';
const sampleText = 'John Smith met Sarah at Apple Inc on January 1st, 2024.';

// Mock chatGPT consistently
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((prompt) => {
    if (prompt.includes('specification')) {
      return Promise.resolve(mockSpec);
    }
    return Promise.resolve({ text: 'anonymized text' });
  }),
  run: vi.fn().mockImplementation(() => Promise.resolve('anonymized text')),
}));

// Helper to extract text from String objects
const toText = (stringObj) => stringObj.toString();

describe('core functions', () => {
  describe('anonymize', () => {
    it('validates inputs', async () => {
      await expect(anonymize({ method: 'balanced' })).rejects.toThrow();
      await expect(anonymize({ text: 'test', method: 'invalid' })).rejects.toThrow();
    });

    it('returns structured result', async () => {
      const result = await anonymize({ text: sampleText, method: 'balanced' });
      expect(result).toMatchObject({
        text: expect.any(String),
        stages: expect.any(Object),
      });
    });
  });

  describe('anonymizeSpec', () => {
    it('handles string input', async () => {
      const spec = await anonymizeSpec('Remove all personal information');
      expect(spec).toBe(mockSpec);
    });

    it('handles object input with context', async () => {
      const spec = await anonymizeSpec({
        method: 'strict',
        context: 'HIPAA compliance',
        instructions: 'Remove all PHI',
      });
      expect(spec).toBe(mockSpec);
    });
  });
});

describe('collection instruction builders', () => {
  // Shared test helper for instruction builders
  const testInstructionBuilder = async (builderFn, config, expectedContent) => {
    const instructions = await builderFn(config);
    expect(instructions.specification).toBe(mockSpec);

    const text = toText(instructions);
    expectedContent.forEach((content) => {
      expect(text).toContain(content);
    });

    return instructions;
  };

  it('mapInstructions creates proper instructions', async () => {
    await testInstructionBuilder(
      mapInstructions,
      {
        anonymization: 'Remove personal data',
        processing: 'Process each review independently',
      },
      ['processing-instructions', 'anonymization-specification']
    );

    // Test backward compatibility
    const stringInput = await mapInstructions('Simple anonymization');
    expect(stringInput.specification).toBe(mockSpec);
  });

  it('filterInstructions handles criteria and defaults', async () => {
    await testInstructionBuilder(
      filterInstructions,
      {
        anonymization: 'Remove sensitive data',
        processing: 'Keep financial information',
      },
      ['filter-criteria', 'anonymization-specification']
    );

    // Test default behavior
    await testInstructionBuilder(filterInstructions, { anonymization: 'Standard anonymization' }, [
      'moderate threshold',
      'anonymization-specification',
    ]);
  });

  it('reduceInstructions combines properly', async () => {
    await testInstructionBuilder(
      reduceInstructions,
      {
        anonymization: 'Anonymize final summary',
        processing: 'Combine customer feedback',
      },
      ['reduce-operation', 'final accumulated result']
    );
  });

  it('findInstructions selects correctly', async () => {
    await testInstructionBuilder(
      findInstructions,
      {
        anonymization: 'Anonymize selected',
        processing: 'Find most sensitive',
      },
      ['selection-criteria', 'selected item']
    );
  });

  it('groupInstructions organizes properly', async () => {
    await testInstructionBuilder(
      groupInstructions,
      {
        anonymization: 'Anonymize grouped data',
        processing: 'Group by type and sensitivity',
      },
      ['grouping-strategy', 'within each group']
    );
  });
});

describe('createAnonymizer', () => {
  it('creates reusable function with attached spec', async () => {
    const spec = await anonymizeSpec({ method: 'balanced' });
    const anonymizer = createAnonymizer(spec);

    expect(anonymizer).toBeInstanceOf(Function);
    expect(anonymizer.specification).toBe(spec);

    // Handles both string and object inputs
    const results = await Promise.all([
      anonymizer('Direct text input'),
      anonymizer({ text: 'Object text input' }),
    ]);

    results.forEach((result) => {
      expect(result).toHaveProperty('text');
    });
  });
});

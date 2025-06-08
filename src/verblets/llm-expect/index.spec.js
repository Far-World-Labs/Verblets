import { describe, expect, it, vi } from 'vitest';
import llmExpect from './index.js';
import { longTestTimeout } from '../../constants/common.js';

// Mock the chatgpt function to avoid actual API calls
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((prompt) => {
    // Handle exact equality checks
    if (prompt.includes('Does the actual value strictly equal the expected value?')) {
      if (prompt.includes('Actual: "hello"') && prompt.includes('Expected: "hello"')) {
        return 'True';
      }
      if (prompt.includes('Actual: "goodbye"') && prompt.includes('Expected: "hello"')) {
        return 'False';
      }
    }

    // Handle constraint-based validations (format: "Given this constraint:")
    if (prompt.includes('Given this constraint:')) {
      if (prompt.includes('Is this a greeting?') && prompt.includes('Hello world!')) {
        return 'True';
      }

      if (prompt.includes('Is this text professional and grammatically correct?')) {
        if (prompt.includes('well-written, professional email')) {
          return 'True';
        }
      }

      if (prompt.includes('Does this person data look realistic?')) {
        if (prompt.includes('John Doe') && prompt.includes('"age": 30')) {
          return 'True';
        }
      }

      if (prompt.includes('Is this recommendation specific and actionable?')) {
        if (prompt.includes('Increase marketing budget by 20%')) {
          return 'True';
        }
      }
    }

    // Default to False for unmatched cases
    return 'False';
  }),
}));

describe('llm-expect verblet', () => {
  it(
    'should pass for exact equality',
    async () => {
      const result = await llmExpect('hello', 'hello', undefined, { throw: false });
      expect(result).toBe(true);
    },
    longTestTimeout
  );

  it(
    'should pass for constraint-based validation',
    async () => {
      const result = await llmExpect('Hello world!', undefined, 'Is this a greeting?', {
        throw: false,
      });
      expect(result).toBe(true);
    },
    longTestTimeout
  );

  it(
    'should fail for non-matching values',
    async () => {
      const result = await llmExpect('goodbye', 'hello', undefined, { throw: false });
      expect(result).toBe(false);
    },
    longTestTimeout
  );

  it(
    'should throw by default on failure',
    async () => {
      await expect(async () => {
        await llmExpect('goodbye', 'hello');
      }).rejects.toThrow();
    },
    longTestTimeout
  );

  it(
    'should not throw when throw option is false',
    async () => {
      const result = await llmExpect('goodbye', 'hello', undefined, { throw: false });
      expect(result).toBe(false);
    },
    longTestTimeout
  );

  it(
    'should validate content quality',
    async () => {
      const result = await llmExpect(
        'This is a well-written, professional email with proper grammar.',
        undefined,
        'Is this text professional and grammatically correct?',
        { throw: false }
      );
      expect(result).toBe(true);
    },
    longTestTimeout
  );

  it(
    'should validate data structures',
    async () => {
      const result = await llmExpect(
        { name: 'John Doe', age: 30, city: 'New York' },
        undefined,
        'Does this person data look realistic?',
        { throw: false }
      );
      expect(result).toBe(true);
    },
    longTestTimeout
  );

  it(
    'should handle business logic validation',
    async () => {
      const result = await llmExpect(
        'Increase marketing budget by 20% for Q4 to boost holiday sales',
        undefined,
        'Is this recommendation specific and actionable?',
        { throw: false }
      );
      expect(result).toBe(true);
    },
    longTestTimeout
  );
});

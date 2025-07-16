import { describe, expect, it, vi } from 'vitest';
import aiExpect from './index.js';
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

describe('expect verblet', () => {
  it(
    'should pass for exact equality',
    async () => {
      const result = await aiExpect('hello').toEqual('hello', { throws: false });
      expect(result).toBe(true);
    },
    longTestTimeout
  );

  it(
    'should pass for constraint-based validation',
    async () => {
      const result = await aiExpect('Hello world!').toSatisfy('Is this a greeting?', {
        throws: false,
      });
      expect(result).toBe(true);
    },
    longTestTimeout
  );

  it(
    'should fail for non-matching values',
    async () => {
      const result = await aiExpect('goodbye').toEqual('hello', {
        throws: false,
      });
      expect(result).toBe(false);
    },
    longTestTimeout
  );

  it(
    'should validate content quality',
    async () => {
      const result = await aiExpect(
        'This is a well-written, professional email with proper grammar.'
      ).toSatisfy('Is this text professional and grammatically correct?', {
        throws: false,
      });
      expect(result).toBe(true);
    },
    longTestTimeout
  );

  it(
    'should validate data structures',
    async () => {
      const result = await aiExpect({ name: 'John Doe', age: 30, city: 'New York' }).toSatisfy(
        'Does this person data look realistic?',
        { throws: false }
      );
      expect(result).toBe(true);
    },
    longTestTimeout
  );

  it(
    'should handle business logic validation',
    async () => {
      const result = await aiExpect(
        'Increase marketing budget by 20% for next quarter to expand market reach'
      ).toSatisfy('Is this recommendation specific and actionable?', {
        throws: false,
      });
      expect(result).toBe(true);
    },
    longTestTimeout
  );

  it(
    'should throw by default on failure',
    async () => {
      await expect(async () => {
        await aiExpect('hello').toEqual('goodbye');
      }).rejects.toThrow('LLM assertion failed');
    },
    longTestTimeout
  );
});

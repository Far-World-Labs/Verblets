import { describe, expect, it, vi } from 'vitest';
import aiExpect from './index.js';
import { longTestTimeout } from '../../constants/common.js';

// Mock the llm function to avoid actual API calls
// With responseFormat + value schema, callLlm auto-unwraps to a bare boolean
const extractTag = (prompt, tag) => {
  const match = prompt.match(new RegExp(`<${tag}>\\n?([\\s\\S]*?)\\n?<\\/${tag}>`));
  return match?.[1]?.trim() ?? '';
};

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn().mockImplementation((prompt) => {
    // Handle exact equality checks
    if (prompt.includes('Does the actual value strictly equal the expected value?')) {
      return extractTag(prompt, 'actual-value') === extractTag(prompt, 'expected-value');
    }

    // Handle constraint-based validations
    if (prompt.includes('Does the actual value satisfy the given constraint?')) {
      const actual = extractTag(prompt, 'actual-value');
      const constraint = extractTag(prompt, 'constraint');

      if (constraint === 'Is this a greeting?' && actual === 'Hello world!') return true;

      if (constraint === 'Is this text professional and grammatically correct?') {
        return actual.includes('well-written, professional email');
      }

      if (constraint === 'Does this person data look realistic?') {
        return actual.includes('John Doe') && actual.includes('"age": 30');
      }

      if (constraint === 'Is this recommendation specific and actionable?') {
        return actual.includes('Increase marketing budget by 20%');
      }
    }

    // Default to false for unmatched cases
    return false;
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

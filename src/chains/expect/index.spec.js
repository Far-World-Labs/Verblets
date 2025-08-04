import { describe, expect as vitestExpect, it, vi, beforeEach, afterEach } from 'vitest';
import { expectSimple, expect } from './entry.js';
import { longTestTimeout } from '../../constants/common.js';
import { setTestEnv, saveTestEnv } from './test-utils.js';
import { debug } from '../../lib/debug/index.js';

// Mock the chatgpt function to avoid actual API calls
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((config) => {
    // Handle both string and object API
    const prompt = typeof config === 'string' ? config : config.messages?.[0]?.content || '';

    // Debug log to see what prompt is being sent
    debug('ChatGPT mock received:', `${prompt.substring(0, 200)}...`);

    // Handle module identification request
    if (prompt.includes('identify the import path of the function or module under test')) {
      return './index.js';
    }

    // Handle current format: "Does the value satisfy the constraints?"
    if (prompt.includes('Does the value satisfy the constraints?')) {
      // Extract value, expected, and constraints from XML format
      const valueMatch = prompt.match(/<value>(.+?)<\/value>/s);
      const expectedMatch = prompt.match(/<expected>(.+?)<\/expected>/s);
      const constraintsMatch = prompt.match(/<constraints>(.+?)<\/constraints>/s);

      const actual = valueMatch?.[1];
      const expected = expectedMatch?.[1];
      const constraint = constraintsMatch?.[1];

      // Normalize values by removing quotes if present
      const normalize = (value) => {
        if (!value) return '';
        return value.replace(/^"|"$/g, '');
      };

      const actualNorm = normalize(actual);
      const expectedNorm = normalize(expected);

      // Handle equality checks - return boolean since we're using response_format
      if (expected && constraint?.includes('same identity or meaning')) {
        return actualNorm === expectedNorm;
      }

      // Handle constraint-based validations
      if (constraint) {
        // Map of constraint patterns to their validation logic
        const constraintValidators = {
          'Is this a greeting?': () => actualNorm === 'Hello world!',
          'Is this text professional and grammatically correct?': () =>
            prompt.includes('well-written, professional email'),
          'Does this person data look realistic?': () =>
            prompt.includes('John Doe') && prompt.includes('age') && prompt.includes('30'),
          'Is this recommendation specific and actionable?': () =>
            prompt.includes('Increase marketing budget by 20%'),
          'Does this profile represent an experienced software developer': () =>
            prompt.includes('Alice Johnson') && prompt.includes('JavaScript'),
          'Is this story opening engaging': () => prompt.includes('Once upon a time'),
          'Does this represent similar but enhanced functionality?': () =>
            prompt.includes('firstName') && prompt.includes('fullName'),
          'Is this an engaging and creative start to a story?': () => true,
        };

        // Find and execute the matching validator
        for (const [pattern, validator] of Object.entries(constraintValidators)) {
          if (constraint.includes(pattern)) {
            return validator();
          }
        }
      }
    }

    // Default to false for unmatched cases
    return false;
  }),
}));

describe('expect chain', () => {
  let restoreEnv;

  beforeEach(() => {
    restoreEnv = saveTestEnv('LLM_EXPECT_MODE');
  });

  afterEach(() => {
    if (restoreEnv) {
      restoreEnv();
    }
  });

  describe('Enhanced API', () => {
    it(
      'should return structured results in none mode',
      async () => {
        setTestEnv('LLM_EXPECT_MODE', 'none');

        const [passed, details] = await expect('hello', 'hello');

        vitestExpect(passed).toBe(true);
        vitestExpect(details).toHaveProperty('passed', true);
        vitestExpect(details).toHaveProperty('advice');
        vitestExpect(details).toHaveProperty('file');
        vitestExpect(details).toHaveProperty('line');
      },
      longTestTimeout
    );

    it(
      'should handle failed assertions in none mode',
      async () => {
        setTestEnv('LLM_EXPECT_MODE', 'none');

        const [passed, details] = await expect('hello', 'goodbye');

        vitestExpect(passed).toBe(false);
        vitestExpect(details.passed).toBe(false);
        vitestExpect(details).toHaveProperty('advice');
        vitestExpect(details).toHaveProperty('file');
        vitestExpect(details).toHaveProperty('line');
      },
      longTestTimeout
    );

    it(
      'should throw errors in error mode',
      async () => {
        // Set environment variable before using expect
        setTestEnv('LLM_EXPECT_MODE', 'error');

        // Expect the promise to reject with the error
        await vitestExpect(expect('hello', 'goodbye')).rejects.toThrow('LLM Assertion Failed');
      },
      longTestTimeout
    );

    it(
      'should log in info mode',
      async () => {
        setTestEnv('LLM_EXPECT_MODE', 'info');
        const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

        const [passed] = await expect('hello', 'goodbye');

        vitestExpect(passed).toBe(false);
        vitestExpect(consoleSpy).toHaveBeenCalledWith(
          vitestExpect.stringContaining('LLM Assertion Failed')
        );

        consoleSpy.mockRestore();
      },
      longTestTimeout
    );

    it(
      'should handle constraint-based validation',
      async () => {
        setTestEnv('LLM_EXPECT_MODE', 'none');

        const [passed, details] = await expect('Hello world!', undefined, 'Is this a greeting?');

        vitestExpect(passed).toBe(true);
        vitestExpect(details.passed).toBe(true);
      },
      longTestTimeout
    );

    it(
      'should validate content quality',
      async () => {
        const [passed, details] = await expect(
          'This is a well-written, professional email with proper grammar and clear intent.',
          undefined,
          'Is this text professional and grammatically correct?'
        );

        vitestExpect(passed).toBe(true);
        vitestExpect(details).toHaveProperty('file');
        vitestExpect(details).toHaveProperty('line');
      },
      longTestTimeout
    );

    it(
      'should validate data structures',
      async () => {
        const [passed] = await expect(
          { name: 'John Doe', age: 30, city: 'New York' },
          undefined,
          'Does this person data look realistic?'
        );

        vitestExpect(passed).toBe(true);
      },
      longTestTimeout
    );

    it(
      'should handle business logic validation',
      async () => {
        const [passed] = await expect(
          'Increase marketing budget by 20% for next quarter to expand market reach',
          undefined,
          'Is this recommendation specific and actionable?'
        );

        vitestExpect(passed).toBe(true);
      },
      longTestTimeout
    );

    it('should throw error when neither expected nor constraint provided', async () => {
      await vitestExpect(async () => {
        await expect('test value');
      }).rejects.toThrow('Either expected value or constraint must be provided');
    });
  });

  describe('Simple API (backward compatibility)', () => {
    it(
      'should pass for exact equality',
      async () => {
        const result = await expectSimple('hello', 'hello');
        vitestExpect(result).toBe(true);
      },
      longTestTimeout
    );

    it(
      'should pass for constraint-based validation',
      async () => {
        const result = await expectSimple('Hello world!', undefined, 'Is this a greeting?');
        vitestExpect(result).toBe(true);
      },
      longTestTimeout
    );

    it(
      'should fail for non-matching values',
      async () => {
        const result = await expectSimple('goodbye', 'hello');
        vitestExpect(result).toBe(false);
      },
      longTestTimeout
    );

    it(
      'should validate content quality',
      async () => {
        const result = await expectSimple(
          'This is a well-written, professional email with proper grammar.',
          undefined,
          'Is this text professional and grammatically correct?'
        );
        vitestExpect(result).toBe(true);
      },
      longTestTimeout
    );
  });

  describe('Environment variable handling', () => {
    it(
      'should default to none mode when env var is not set',
      async () => {
        setTestEnv('LLM_EXPECT_MODE', undefined);

        const [passed] = await expect('hello', 'goodbye');
        vitestExpect(passed).toBe(false);
        // Should not throw in none mode
      },
      longTestTimeout
    );

    it(
      'should handle invalid env var values',
      async () => {
        setTestEnv('LLM_EXPECT_MODE', 'invalid');

        const [passed] = await expect('hello', 'goodbye');
        vitestExpect(passed).toBe(false);
        // Should default to none mode and not throw
      },
      longTestTimeout
    );
  });

  describe('Advanced features', () => {
    it(
      'should provide file and line information',
      async () => {
        const [, details] = await expect('hello', 'hello');

        vitestExpect(details.file).toBeDefined();
        vitestExpect(details.line).toBeTypeOf('number');
        // In browser environment, line number is 0
        if (typeof window !== 'undefined') {
          vitestExpect(details.line).toBe(0);
        } else {
          vitestExpect(details.line).toBeGreaterThan(0);
        }
      },
      longTestTimeout
    );

    it(
      'should handle complex object comparisons',
      async () => {
        const userProfile = {
          name: 'Alice Johnson',
          skills: ['JavaScript', 'Python', 'React'],
          experience: '5 years',
          level: 'Senior Developer',
        };

        const [passed] = await expect(
          userProfile,
          undefined,
          'Does this profile represent an experienced software developer with modern skills?'
        );

        vitestExpect(passed).toBe(true);
      },
      longTestTimeout
    );

    it(
      'should validate creative content',
      async () => {
        const storyOpening =
          'Once upon a time, in a land far away, there lived a brave knight who embarked on a quest to save the kingdom from an ancient curse.';

        const [passed] = await expect(
          storyOpening,
          undefined,
          'Is this story opening engaging and sets up a clear adventure narrative?'
        );

        vitestExpect(passed).toBe(true);
      },
      longTestTimeout
    );
  });
});

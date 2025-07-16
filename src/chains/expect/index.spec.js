import { describe, expect as vitestExpect, it, vi, beforeEach, afterEach } from 'vitest';
import aiExpectSimple, { expect as aiExpect } from './index.js';
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
      if (prompt.includes('Actual: "hello"') && prompt.includes('Expected: "goodbye"')) {
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

      if (prompt.includes('Does this profile represent an experienced software developer')) {
        if (prompt.includes('Alice Johnson') && prompt.includes('JavaScript')) {
          return 'True';
        }
      }

      if (prompt.includes('Is this story opening engaging')) {
        if (prompt.includes('Once upon a time')) {
          return 'True';
        }
      }
    }

    // Default to False for unmatched cases
    return 'False';
  }),
}));

describe('expect chain', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.LLM_EXPECT_MODE;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.LLM_EXPECT_MODE = originalEnv;
    } else {
      delete process.env.LLM_EXPECT_MODE;
    }
  });

  describe('Enhanced API', () => {
    it(
      'should return structured results in none mode',
      async () => {
        process.env.LLM_EXPECT_MODE = 'none';

        const [passed, details] = await aiExpect('hello', 'hello');

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
        process.env.LLM_EXPECT_MODE = 'none';

        const [passed, details] = await aiExpect('hello', 'goodbye');

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
        process.env.LLM_EXPECT_MODE = 'error';

        await vitestExpect(async () => {
          await aiExpect('hello', 'goodbye');
        }).rejects.toThrow('LLM Assertion Failed');
      },
      longTestTimeout
    );

    it(
      'should log in info mode',
      async () => {
        process.env.LLM_EXPECT_MODE = 'info';
        const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

        const [passed] = await aiExpect('hello', 'goodbye');

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
        process.env.LLM_EXPECT_MODE = 'none';

        const [passed, details] = await aiExpect('Hello world!', undefined, 'Is this a greeting?');

        vitestExpect(passed).toBe(true);
        vitestExpect(details.passed).toBe(true);
      },
      longTestTimeout
    );

    it(
      'should validate content quality',
      async () => {
        const [passed, details] = await aiExpect(
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
        const [passed] = await aiExpect(
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
        const [passed] = await aiExpect(
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
        await aiExpect('test value');
      }).rejects.toThrow('Either expected value or constraint must be provided');
    });
  });

  describe('Simple API (backward compatibility)', () => {
    it(
      'should pass for exact equality',
      async () => {
        const result = await aiExpectSimple('hello', 'hello');
        vitestExpect(result).toBe(true);
      },
      longTestTimeout
    );

    it(
      'should pass for constraint-based validation',
      async () => {
        const result = await aiExpectSimple('Hello world!', undefined, 'Is this a greeting?');
        vitestExpect(result).toBe(true);
      },
      longTestTimeout
    );

    it(
      'should fail for non-matching values',
      async () => {
        const result = await aiExpectSimple('goodbye', 'hello');
        vitestExpect(result).toBe(false);
      },
      longTestTimeout
    );

    it(
      'should validate content quality',
      async () => {
        const result = await aiExpectSimple(
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
        delete process.env.LLM_EXPECT_MODE;

        const [passed] = await aiExpect('hello', 'goodbye');
        vitestExpect(passed).toBe(false);
        // Should not throw in none mode
      },
      longTestTimeout
    );

    it(
      'should handle invalid env var values',
      async () => {
        process.env.LLM_EXPECT_MODE = 'invalid';

        const [passed] = await aiExpect('hello', 'goodbye');
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
        const [, details] = await aiExpect('hello', 'hello');

        vitestExpect(details.file).toBeDefined();
        vitestExpect(details.line).toBeTypeOf('number');
        vitestExpect(details.line).toBeGreaterThan(0);
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

        const [passed] = await aiExpect(
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

        const [passed] = await aiExpect(
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

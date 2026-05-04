import { vi, beforeEach, afterEach, expect as vitestExpect } from 'vitest';
import { expectSimple, expect, expectWithUncertainty, mapAdvice } from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { setTestEnv, saveTestEnv } from './test-utils.js';
import { debug } from '../../lib/debug/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockImplementation((config) => {
    const prompt = typeof config === 'string' ? config : config.messages?.[0]?.content || '';
    debug('LLM mock received:', `${prompt.substring(0, 200)}...`);

    if (prompt.includes('identify the import path of the function or module under test')) {
      return './index.js';
    }
    if (prompt.includes('Provide debugging advice')) {
      return 'Test advice: values do not match';
    }
    if (prompt.includes('Does the value satisfy the constraints?')) {
      const valueMatch = prompt.match(/<value>(.+?)<\/value>/s);
      const expectedMatch = prompt.match(/<expected>(.+?)<\/expected>/s);
      const constraintsMatch = prompt.match(/<constraints>(.+?)<\/constraints>/s);
      const actual = valueMatch?.[1];
      const expectedRaw = expectedMatch?.[1];
      const constraint = constraintsMatch?.[1];

      const normalize = (value) => (value ? value.replace(/^"|"$/g, '') : '');
      const actualNorm = normalize(actual);
      const expectedNorm = normalize(expectedRaw);

      if (expectedRaw && constraint?.includes('same identity or meaning')) {
        return actualNorm === expectedNorm;
      }

      if (constraint) {
        const validators = {
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
        for (const [pattern, validator] of Object.entries(validators)) {
          if (constraint.includes(pattern)) return validator();
        }
      }
    }
    if (prompt.includes('Assess the uncertainty')) {
      return {
        confidence: 0.85,
        confidenceInterval: { low: 0.75, high: 0.95 },
        unknowns: ['semantic ambiguity'],
      };
    }
    return false;
  }),
}));

let restoreEnv;

beforeEach(() => {
  restoreEnv = saveTestEnv('VERBLETS_LLM_EXPECT_MODE');
});

afterEach(() => {
  if (restoreEnv) restoreEnv();
});

runTable({
  describe: 'expect chain - Enhanced API',
  examples: [
    {
      name: 'returns structured results in none mode',
      inputs: { args: ['hello', 'hello'], env: 'none' },
      want: { passed: true, hasDetailsAdvice: true, hasFileLine: true, detailsPassed: true },
    },
    {
      name: 'handles failed assertions in none mode',
      inputs: { args: ['hello', 'goodbye'], env: 'none' },
      want: { passed: false, hasDetailsAdvice: true, hasFileLine: true, detailsPassed: false },
    },
    {
      name: 'throws errors in error mode',
      inputs: { args: ['hello', 'goodbye'], env: 'error' },
      want: { throws: /LLM assertion failed/ },
    },
    {
      name: 'logs in info mode',
      inputs: { args: ['hello', 'goodbye'], env: 'info', withConsoleSpy: true },
      want: { passed: false, consoleSpyContains: 'LLM assertion failed' },
    },
    {
      name: 'handles constraint-based validation',
      inputs: { args: ['Hello world!', undefined, 'Is this a greeting?'], env: 'none' },
      want: { passed: true, detailsPassed: true },
    },
    {
      name: 'validates content quality',
      inputs: {
        args: [
          'This is a well-written, professional email with proper grammar and clear intent.',
          undefined,
          'Is this text professional and grammatically correct?',
        ],
      },
      want: { passed: true, hasFileLine: true },
    },
    {
      name: 'validates data structures',
      inputs: {
        args: [
          { name: 'John Doe', age: 30, city: 'New York' },
          undefined,
          'Does this person data look realistic?',
        ],
      },
      want: { passed: true },
    },
    {
      name: 'handles business logic validation',
      inputs: {
        args: [
          'Increase marketing budget by 20% for next quarter to expand market reach',
          undefined,
          'Is this recommendation specific and actionable?',
        ],
      },
      want: { passed: true },
    },
    {
      name: 'throws when neither expected nor constraint provided',
      inputs: { args: ['test value'] },
      want: { throws: /Either expected value or constraint must be provided/ },
    },
    {
      name: 'provides file and line information',
      inputs: { args: ['hello', 'hello'] },
      want: { fileAndLine: true },
    },
    {
      name: 'handles complex object comparisons',
      inputs: {
        args: [
          {
            name: 'Alice Johnson',
            skills: ['JavaScript', 'Python', 'React'],
            experience: '5 years',
            level: 'Senior Developer',
          },
          undefined,
          'Does this profile represent an experienced software developer with modern skills?',
        ],
      },
      want: { passed: true },
    },
    {
      name: 'validates creative content',
      inputs: {
        args: [
          'Once upon a time, in a land far away, there lived a brave knight who embarked on a quest to save the kingdom from an ancient curse.',
          undefined,
          'Is this story opening engaging and sets up a clear adventure narrative?',
        ],
      },
      want: { passed: true },
    },
  ],
  process: async ({ inputs }) => {
    if (inputs.env !== undefined) setTestEnv('VERBLETS_LLM_EXPECT_MODE', inputs.env);
    let consoleSpy;
    let consoleSpyCalls;
    if (inputs.withConsoleSpy) {
      consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    }
    const [passed, details] = await expect(...inputs.args);
    if (consoleSpy) {
      consoleSpyCalls = [...consoleSpy.mock.calls];
      consoleSpy.mockRestore();
    }
    return { passed, details, consoleSpyCalls };
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      vitestExpect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('passed' in want) vitestExpect(result.passed).toBe(want.passed);
    if ('detailsPassed' in want) vitestExpect(result.details.passed).toBe(want.detailsPassed);
    if (want.hasDetailsAdvice) vitestExpect(result.details).toHaveProperty('advice');
    if (want.hasFileLine) {
      vitestExpect(result.details).toHaveProperty('file');
      vitestExpect(result.details).toHaveProperty('line');
    }
    if (want.fileAndLine) {
      vitestExpect(result.details.file).toBeDefined();
      vitestExpect(result.details.line).toBeTypeOf('number');
      vitestExpect(result.details.line).toBeGreaterThanOrEqual(0);
    }
    if (want.consoleSpyContains) {
      const matched = result.consoleSpyCalls.some(
        ([msg]) => typeof msg === 'string' && msg.includes(want.consoleSpyContains)
      );
      vitestExpect(matched).toBe(true);
    }
  },
});

runTable({
  describe: 'expect chain - Simple API (backward compatibility)',
  examples: [
    {
      name: 'passes for exact equality',
      inputs: { args: ['hello', 'hello'] },
      want: { value: true },
    },
    {
      name: 'passes for constraint-based validation',
      inputs: { args: ['Hello world!', undefined, 'Is this a greeting?'] },
      want: { value: true },
    },
    {
      name: 'fails for non-matching values',
      inputs: { args: ['goodbye', 'hello'] },
      want: { value: false },
    },
    {
      name: 'validates content quality',
      inputs: {
        args: [
          'This is a well-written, professional email with proper grammar.',
          undefined,
          'Is this text professional and grammatically correct?',
        ],
      },
      want: { value: true },
    },
  ],
  process: ({ inputs }) => expectSimple(...inputs.args),
  expects: ({ result, want }) => vitestExpect(result).toEqual(want.value),
});

runTable({
  describe: 'expect chain - Environment variable handling',
  examples: [
    {
      name: 'defaults to none mode when env var is not set',
      inputs: { env: undefined, args: ['hello', 'goodbye'] },
      want: { passed: false },
    },
    {
      name: 'handles invalid env var values',
      inputs: { env: 'invalid', args: ['hello', 'goodbye'] },
      want: { passed: false },
    },
  ],
  process: async ({ inputs }) => {
    setTestEnv('VERBLETS_LLM_EXPECT_MODE', inputs.env);
    const [passed, details] = await expect(...inputs.args);
    return { passed, details };
  },
  expects: ({ result, want }) => vitestExpect(result.passed).toBe(want.passed),
});

runTable({
  describe: 'expectWithUncertainty',
  examples: [
    {
      name: 'returns uncertainty data with confidence interval on passing assertion',
      inputs: { args: ['Hello world!', undefined, 'Is this a greeting?'], env: 'none' },
      want: { confidenceInterval: true, confidence: 0.85, passed: true },
    },
    {
      name: 'returns unknown flags on failing assertion',
      inputs: { args: ['hello', 'goodbye'], env: 'none' },
      want: { unknowns: true, passed: false },
    },
    {
      name: 'preserves original expect output fields alongside uncertainty',
      inputs: { args: ['hello', 'hello'], env: 'none' },
      want: { allFields: true },
    },
    {
      name: 'emits uncertainty progress events via onProgress callback',
      inputs: { args: ['hello', 'hello'], env: 'none', withEvents: true },
      want: { uncertaintyEvent: true },
    },
  ],
  process: async ({ inputs }) => {
    setTestEnv('VERBLETS_LLM_EXPECT_MODE', inputs.env);
    if (inputs.withEvents) {
      const events = [];
      const [passed, details] = await expectWithUncertainty(...inputs.args, undefined, {
        onProgress: (event) => events.push(event),
      });
      return { passed, details, events };
    }
    const [passed, details] = await expectWithUncertainty(...inputs.args);
    return { passed, details };
  },
  expects: ({ result, want }) => {
    const { passed, details } = result;
    if ('passed' in want) vitestExpect(passed).toBe(want.passed);
    if (want.confidenceInterval) {
      vitestExpect(details.uncertainty.confidence).toBe(want.confidence);
      const ci = details.uncertainty.confidenceInterval;
      vitestExpect(ci.low).toBeTypeOf('number');
      vitestExpect(ci.high).toBeTypeOf('number');
      vitestExpect(ci.low).toBeLessThanOrEqual(ci.high);
    }
    if (want.unknowns) {
      vitestExpect(details.uncertainty.unknowns).toBeInstanceOf(Array);
      vitestExpect(details.uncertainty.unknowns.length).toBeGreaterThan(0);
      vitestExpect(details.uncertainty.unknowns[0]).toBeTypeOf('string');
    }
    if (want.allFields) {
      vitestExpect(passed).toBe(true);
      vitestExpect(details.passed).toBe(true);
      vitestExpect(details.file).toBeDefined();
      vitestExpect(details.line).toBeTypeOf('number');
      vitestExpect(details.uncertainty).toBeDefined();
    }
    if (want.uncertaintyEvent) {
      const ev = result.events.find((e) => e.event === 'uncertainty');
      vitestExpect(ev).toBeDefined();
      vitestExpect(ev.confidence).toBeTypeOf('number');
      vitestExpect(ev.confidenceInterval).toBeDefined();
      vitestExpect(ev.unknowns).toBeInstanceOf(Array);
    }
  },
});

runTable({
  describe: 'mapAdvice',
  examples: [
    {
      name: 'maps low to introspection disabled',
      inputs: { v: 'low' },
      want: { value: { introspection: false } },
    },
    {
      name: 'maps high to introspection enabled',
      inputs: { v: 'high' },
      want: { value: { introspection: true } },
    },
  ],
  process: ({ inputs }) => mapAdvice(inputs.v),
  expects: ({ result, want }) => vitestExpect(result).toEqual(want.value),
});

void longTestTimeout;

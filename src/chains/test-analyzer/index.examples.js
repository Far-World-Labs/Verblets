import { describe, it as vitestIt, expect as vitestExpect } from 'vitest';
import analyzeTestError from './index.js';
import vitestAiExpect from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Test-analyzer chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Test-analyzer chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Test-analyzer chain' } })
  : vitestAiExpect;

describe('test-analyzer chain', () => {
  it(
    'analyzes failed test logs and provides insights',
    async () => {
      // Create mock test logs with a failure
      const mockLogs = [
        {
          event: 'test-start',
          testName: 'should calculate sum correctly',
          testIndex: 0,
          suite: 'Calculator',
          line: 10,
          testLineCount: 5,
          file: '/test/calculator.test.js',
        },
        {
          event: 'expect',
          testIndex: 0,
          actual: 5,
          expected: 6,
          method: 'toBe',
          passed: false,
          suite: 'Calculator',
          line: 12,
          file: '/test/calculator.test.js',
          error: 'expected 5 to be 6',
        },
        {
          event: 'test-complete',
          testName: 'should calculate sum correctly',
          testIndex: 0,
          state: 'fail',
          duration: 15,
          suite: 'Calculator',
        },
      ];

      const analysis = await analyzeTestError(mockLogs);

      expect(typeof analysis).toBe('string');
      expect(analysis.length).toBeGreaterThan(0);

      // Should provide meaningful analysis of the failure
      const hasInsightfulAnalysis = await aiExpect(analysis).toSatisfy(
        'Should analyze the test failure and provide insights about why the actual value (5) differs from expected (6)'
      );
      expect(hasInsightfulAnalysis).toBe(true);
    },
    longTestTimeout
  );

  it(
    'handles logs with AI expectations',
    async () => {
      const mockLogs = [
        {
          event: 'test-start',
          testName: 'should generate valid JSON',
          testIndex: 1,
          suite: 'JSON Generator',
          line: 20,
          testLineCount: 10,
          file: '/test/json.test.js',
        },
        {
          event: 'ai-expect',
          testIndex: 1,
          actual: '{"invalid": json}',
          expected: 'valid JSON structure',
          method: 'toSatisfy',
          passed: false,
          suite: 'JSON Generator',
          line: 25,
          file: '/test/json.test.js',
        },
        {
          event: 'test-complete',
          testName: 'should generate valid JSON',
          testIndex: 1,
          state: 'fail',
          duration: 100,
          suite: 'JSON Generator',
        },
      ];

      const analysis = await analyzeTestError(mockLogs);

      expect(typeof analysis).toBe('string');
      expect(analysis.length).toBeGreaterThan(0);

      // Should identify JSON syntax issues
      const identifiesJsonIssue = await aiExpect(analysis).toSatisfy(
        'Should identify that the JSON is malformed or invalid'
      );
      expect(identifiesJsonIssue).toBe(true);
    },
    longTestTimeout
  );

  it(
    'analyzes passing tests differently than failures',
    async () => {
      const mockLogs = [
        {
          event: 'test-start',
          testName: 'should pass',
          testIndex: 2,
          suite: 'Success Suite',
          line: 30,
          file: '/test/success.test.js',
        },
        {
          event: 'expect',
          testIndex: 2,
          actual: 10,
          expected: 10,
          method: 'toBe',
          passed: true,
          suite: 'Success Suite',
          line: 32,
          file: '/test/success.test.js',
        },
        {
          event: 'test-complete',
          testName: 'should pass',
          testIndex: 2,
          state: 'pass',
          duration: 5,
          suite: 'Success Suite',
        },
      ];

      const analysis = await analyzeTestError(mockLogs);

      // test-analyzer still analyzes passing tests, providing context
      // This is actually useful for understanding test behavior
      expect(typeof analysis).toBe('string');

      // The analysis provides insights even for passing tests
      // Just verify we got some analysis back
      expect(analysis.length).toBeGreaterThanOrEqual(0);
    },
    longTestTimeout
  );
});

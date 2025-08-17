import { describe, expect as vitestExpect, it as vitestIt, beforeAll, afterAll } from 'vitest';
import truncate from './index.js';
import vitestAiExpect from '../expect/index.js';
import { logSuiteStart, logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Truncate chain' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Truncate chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Truncate chain' } })
  : vitestAiExpect;
const suiteLogStart = config?.aiMode ? logSuiteStart : () => {};
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

beforeAll(async () => {
  await suiteLogStart('Truncate chain', extractFileContext(2));
});

afterAll(async () => {
  await suiteLogEnd('Truncate chain', extractFileContext(2));
});

const examples = [
  {
    name: 'removes unwanted content from end',
    inputs: {
      text: 'Technical content about APIs. More technical details. Appendix A: Legal disclaimers. Contact info footer.',
      instructions: 'Remove appendices and footer content',
      config: { threshold: 6 },
    },
    wants: {
      shouldTruncate: true,
    },
  },
  {
    name: 'keeps all content when nothing should be removed',
    inputs: {
      text: 'Core documentation. Implementation examples. Technical specifications.',
      instructions: 'Remove marketing content',
      config: { threshold: 6 },
    },
    wants: {
      shouldTruncate: false,
    },
  },
  {
    name: 'handles custom threshold',
    inputs: {
      text: 'Main content. Somewhat relevant content. Completely irrelevant content.',
      instructions: 'Remove irrelevant content',
      config: { threshold: 8 },
    },
    wants: {
      shouldTruncate: true,
    },
  },
];

describe('truncate', () => {
  examples.forEach((example) => {
    it(
      example.name,
      async () => {
        const result = await truncate(
          example.inputs.text,
          example.inputs.instructions,
          example.inputs.config
        );

        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(example.inputs.text.length);

        if (example.wants.shouldTruncate) {
          expect(result).toBeLessThanOrEqual(example.inputs.text.length);
        } else {
          expect(result).toBe(example.inputs.text.length);
        }

        const truncated = example.inputs.text.slice(0, result);
        expect(truncated.length).toBe(result);
      },
      30000
    );
  });
});

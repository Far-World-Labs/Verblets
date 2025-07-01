import { describe, expect, it } from 'vitest';
import truncate from './index.js';

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
    it(example.name, async () => {
      const result = await truncate(
        example.inputs.text,
        example.inputs.instructions,
        example.inputs.config
      );

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(example.inputs.text.length);

      if (example.wants.shouldTruncate) {
        expect(result).toBeLessThan(example.inputs.text.length);
      } else {
        expect(result).toBe(example.inputs.text.length);
      }

      const truncated = example.inputs.text.slice(0, result);
      expect(truncated.length).toBe(result);
    }, 30000);
  });
});
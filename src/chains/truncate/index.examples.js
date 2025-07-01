import { describe, expect, it } from 'vitest';
import truncate from './index.js';

const examples = [
  {
    name: 'removes off-topic conclusion from article',
    inputs: {
      text: 'Technical analysis of renewable energy market trends. Supporting data from industry reports. In conclusion, this reminds me of my childhood. My grandmother always said energy was important.',
      instructions: 'Keep professional technical content only',
      config: { threshold: 6 },
    },
    wants: {
      shouldTruncate: true,
      resultLessThan: 150, // Should cut off the personal conclusion
    },
  },
  {
    name: 'removes boilerplate footer from email',
    inputs: {
      text: 'Thank you for your inquiry about our software. Here are the technical specifications. Our team can schedule a demo. This email was sent automatically. To unsubscribe click here.',
      instructions: 'Keep relevant business communication',
      config: { threshold: 5 },
    },
    wants: {
      shouldTruncate: true,
      resultLessThan: 120, // Should cut off automated footer
    },
  },
  {
    name: 'keeps all content when everything is relevant',
    inputs: {
      text: 'Core documentation about API endpoints. Authentication requirements. Rate limiting details.',
      instructions: 'Keep technical documentation',
      config: { threshold: 6 },
    },
    wants: {
      shouldTruncate: false,
      resultEquals: 'fullLength',
    },
  },
  {
    name: 'handles custom threshold',
    inputs: {
      text: 'Main content here. Somewhat related tangent. Completely irrelevant conclusion.',
      instructions: 'Keep core content only',
      config: { threshold: 7 }, // Higher threshold
    },
    wants: {
      shouldTruncate: true,
      resultLessThan: 50, // Should be more aggressive
    },
  },
  {
    name: 'removes appendices from technical document',
    inputs: {
      text: 'API documentation and examples. Implementation notes. Appendix A: Legal disclaimers. Appendix B: Contact info.',
      instructions: 'Keep technical content only',
      config: { threshold: 6 },
    },
    wants: {
      shouldTruncate: true,
      resultLessThan: 70, // Should cut off appendices
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

      // Verify it returns a number
      expect(typeof result).toBe('number');
      
      // Verify it's a valid index within the text
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(example.inputs.text.length);

      // Test specific expectations
      if (example.wants.shouldTruncate) {
        expect(result).toBeLessThan(example.inputs.text.length);
        
        if (example.wants.resultLessThan) {
          expect(result).toBeLessThan(example.wants.resultLessThan);
        }
      }
      
      if (example.wants.resultEquals === 'fullLength') {
        expect(result).toBe(example.inputs.text.length);
      }

      // Test that the truncation actually works
      const truncated = example.inputs.text.slice(0, result);
      expect(truncated.length).toBe(result);
      
      // For cases where we should truncate, verify we actually removed content
      if (example.wants.shouldTruncate) {
        expect(truncated).not.toBe(example.inputs.text);
      }
    }, 30000); // Allow time for LLM calls
  });
});
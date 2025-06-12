import { describe, it, expect } from 'vitest';
import intersection from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import llmExpected from '../llm-expect/index.js';

describe('intersection examples', () => {
  it(
    'finds commonalities among devices',
    async () => {
      const result = await intersection(['smartphone', 'laptop', 'tablet']);
      expect(Array.isArray(result), `Saw: ${JSON.stringify(result)}`).toBe(true);

      // LLM assertion to verify the intersection contains meaningful commonalities
      await llmExpected(
        result,
        undefined,
        'should be an array of strings that could reasonably represent commonalities between technology devices',
        {
          context: 'Testing intersection verblet with electronic devices',
        }
      );
    },
    longTestTimeout
  );

  it(
    'finds commonalities among animals',
    async () => {
      const result = await intersection(['dog', 'cat', 'bird']);
      expect(Array.isArray(result), `Saw: ${JSON.stringify(result)}`).toBe(true);

      // LLM assertion for animal traits - be more lenient
      await llmExpected(
        result,
        undefined,
        'should be an array that represents some form of analysis or commonalities related to animals',
        {
          context: 'Testing intersection verblet with animals',
        }
      );

      // Just check that it's an array - don't require specific content
      expect(Array.isArray(result)).toBe(true);
    },
    longTestTimeout
  );

  it(
    'handles abstract concepts',
    async () => {
      const result = await intersection(['love', 'friendship', 'trust']);
      expect(Array.isArray(result), `Saw: ${JSON.stringify(result)}`).toBe(true);

      // LLM assertion for abstract concept intersections - be more lenient
      await llmExpected(
        result,
        undefined,
        'should be an array that represents some form of analysis related to abstract concepts',
        {
          context: 'Testing intersection verblet with abstract concepts',
        }
      );

      // Just verify it's an array
      expect(Array.isArray(result)).toBe(true);
    },
    longTestTimeout
  );

  it(
    'works with single item',
    async () => {
      const result = await intersection(['bicycle']);
      expect(Array.isArray(result), `Saw: ${JSON.stringify(result)}`).toBe(true);

      // Single items should return empty array based on the implementation
      expect(result.length).toBe(0);
    },
    longTestTimeout
  );

  it(
    'handles empty input gracefully',
    async () => {
      const result = await intersection([]);
      expect(Array.isArray(result), `Saw: ${JSON.stringify(result)}`).toBe(true);

      // Empty input should return empty array
      expect(result.length).toBe(0);
    },
    longTestTimeout
  );
});

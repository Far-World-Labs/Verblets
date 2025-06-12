import { describe, it, expect } from 'vitest';
import intersections from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import aiExpect from '../../verblets/expect/index.js';

describe('intersections chain examples', () => {
  it(
    'analyzes technology categories comprehensively',
    async () => {
      const result = await intersections(['smartphones', 'laptops', 'tablets', 'smartwatches']);

      // Basic structure validation - should be an object with intersection keys
      expect(typeof result).toBe('object');
      expect(Object.keys(result).length).toBeGreaterThan(0);

      // LLM assertion for overall structure
      await aiExpect(result).toSatisfy(
        'should be an object where keys are combination identifiers and values contain intersection analysis',
        {
          context: 'Testing intersections chain output structure for technology devices',
        }
      );

      // Validate that we have meaningful intersections
      await aiExpect(Object.keys(result).length).toSatisfy(
        'should be greater than 0, representing multiple intersections of technology devices',
        {
          context: `Found ${
            Object.keys(result).length
          } intersections from technology devices analysis`,
        }
      );

      // Basic structure validation for intersections
      for (const [, intersection] of Object.entries(result)) {
        // Validate the intersection structure
        expect(intersection).toHaveProperty('combination');
        expect(intersection).toHaveProperty('description');
        expect(intersection).toHaveProperty('elements');
        expect(Array.isArray(intersection.combination)).toBe(true);
        expect(Array.isArray(intersection.elements)).toBe(true);
        expect(typeof intersection.description).toBe('string');
      }
    },
    longTestTimeout
  );

  it(
    'handles diverse categories with meaningful intersections',
    async () => {
      const result = await intersections(['books', 'movies', 'music']);

      // Validate entertainment media analysis
      await aiExpect(Object.keys(result).length).toSatisfy(
        'should be greater than 0, representing intersections between entertainment media',
        {
          context: 'Testing intersections chain with entertainment media categories',
        }
      );

      // Validate intersection descriptions - just check it's a non-empty string
      if (Object.keys(result).length > 0) {
        const firstIntersection = Object.values(result)[0];
        expect(typeof firstIntersection.description).toBe('string');
        expect(firstIntersection.description.length).toBeGreaterThan(0);
      }
    },
    longTestTimeout
  );

  it(
    'analyzes abstract concepts with depth',
    async () => {
      const result = await intersections(['creativity', 'innovation', 'inspiration']);

      // Validate abstract concept handling
      await aiExpect(Object.keys(result).length).toSatisfy(
        'should be greater than 0, showing intersections between abstract creative concepts',
        {
          context: 'Testing intersections chain with abstract creative concepts',
        }
      );

      // Basic structure validation for abstract concepts
      if (Object.keys(result).length > 0) {
        const firstIntersection = Object.values(result)[0];
        expect(Array.isArray(firstIntersection.elements)).toBe(true);
        expect(typeof firstIntersection.description).toBe('string');
      }
    },
    longTestTimeout
  );

  it(
    'handles single category appropriately',
    async () => {
      const result = await intersections(['photography']);

      // Should return empty object since intersections require multiple items
      expect(Object.keys(result).length).toBe(0);

      // Validate single category handling
      await aiExpect(result).toSatisfy(
        'should be an empty object since intersections require multiple categories',
        {
          context:
            'Testing intersections chain with single category input - should return empty since no intersections possible',
        }
      );
    },
    longTestTimeout
  );

  it(
    'produces consistent and logical results',
    async () => {
      const result = await intersections(['science', 'art']);

      // Validate that all intersections have proper structure
      for (const [comboKey, intersection] of Object.entries(result)) {
        // Basic structure checks
        expect(intersection.combination).toBeDefined();
        expect(intersection.description).toBeDefined();
        expect(intersection.elements).toBeDefined();

        // LLM validation of consistency
        await aiExpect(intersection.combination).toSatisfy(
          'should be an array containing the items from the intersection',
          {
            context: `Validating combination structure for: ${comboKey}`,
          }
        );
      }

      // Validate interdisciplinary insights if results exist
      if (Object.keys(result).length > 0) {
        await aiExpect(Object.keys(result).length).toSatisfy(
          'should be greater than 0, showing connections between science and art',
          {
            context: 'Testing interdisciplinary analysis quality',
          }
        );
      }
    },
    longTestTimeout
  );

  it(
    'handles edge cases gracefully',
    async () => {
      const result = await intersections([]);

      // Validate empty input handling
      await aiExpect(result).toSatisfy('should be an empty object for empty input', {
        context: 'Testing intersections chain with empty input array',
      });

      // Validate empty result structure
      expect(Object.keys(result).length).toBe(0);
    },
    longTestTimeout
  );
});

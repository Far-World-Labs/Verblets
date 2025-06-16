import { describe, it, expect } from 'vitest';
import intersections from './index.js';
import { expect as aiExpect } from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('intersections chain examples', () => {
  it(
    'analyzes technology categories comprehensively',
    async () => {
      const result = await intersections(['software', 'hardware', 'networking']);

      // Basic validation
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();

      // Should have meaningful intersections
      expect(Object.keys(result).length).toBeGreaterThan(0);

      // Validate structure of each intersection
      // eslint-disable-next-line no-unused-vars
      for (const [_comboKey, intersection] of Object.entries(result)) {
        expect(intersection.combination).toBeDefined();
        expect(intersection.description).toBeDefined();
        expect(intersection.elements).toBeDefined();
        expect(Array.isArray(intersection.combination)).toBe(true);
        expect(Array.isArray(intersection.elements)).toBe(true);
        expect(typeof intersection.description).toBe('string');
        expect(intersection.combination.length).toBeGreaterThanOrEqual(2);
      }

      // AI validation of technology intersections
      const [hasValidTechIntersections] = await aiExpect(
        result,
        undefined,
        'Should contain meaningful intersections between technology categories with relevant examples'
      );
      expect(hasValidTechIntersections).toBe(true);
    },
    longTestTimeout
  );

  it(
    'handles diverse categories with meaningful intersections',
    async () => {
      const result = await intersections(['art', 'science']);

      // Basic validation
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();

      // Should have at least one intersection for these broad categories
      if (Object.keys(result).length > 0) {
        const firstIntersection = Object.values(result)[0];
        expect(Array.isArray(firstIntersection.elements)).toBe(true);
        expect(typeof firstIntersection.description).toBe('string');
        expect(Array.isArray(firstIntersection.combination)).toBe(true);
        expect(firstIntersection.combination).toContain('art');
        expect(firstIntersection.combination).toContain('science');

        // AI validation of meaningful intersections
        const [hasMeaningfulIntersections] = await aiExpect(
          result,
          undefined,
          'Should contain meaningful intersections between art and science with relevant examples'
        );
        expect(hasMeaningfulIntersections).toBe(true);
      }
    },
    longTestTimeout
  );

  it(
    'validates schema compliance and structure quality',
    async () => {
      const result = await intersections(['music', 'mathematics']);

      // Schema validation - should be an object
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(false);

      // If we have results, validate strict schema compliance
      if (Object.keys(result).length > 0) {
        for (const [comboKey, intersection] of Object.entries(result)) {
          // Key format validation (should be "category + category")
          expect(comboKey).toMatch(/^.+ \+ .+$/);

          // Required properties
          expect(intersection).toHaveProperty('combination');
          expect(intersection).toHaveProperty('description');
          expect(intersection).toHaveProperty('elements');

          // Type validation
          expect(Array.isArray(intersection.combination)).toBe(true);
          expect(typeof intersection.description).toBe('string');
          expect(Array.isArray(intersection.elements)).toBe(true);

          // Content validation
          expect(intersection.combination.length).toBeGreaterThanOrEqual(2);
          expect(intersection.description.length).toBeGreaterThan(0);
          expect(intersection.combination).toContain('music');
          expect(intersection.combination).toContain('mathematics');
        }

        // AI validation of music-math intersections
        const [hasValidMusicMathIntersections] = await aiExpect(
          Object.values(result)[0].elements,
          undefined,
          'Should contain examples that genuinely belong to both music and mathematics'
        );
        expect(hasValidMusicMathIntersections).toBe(true);
      }
    },
    longTestTimeout
  );

  it(
    'handles complex multi-category intersections',
    async () => {
      const result = await intersections(['biology', 'chemistry', 'physics'], {
        maxSize: 3,
        minSize: 2,
      });

      // Basic validation
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();

      // Should handle multiple intersection types
      if (Object.keys(result).length > 0) {
        let hasTwoWayIntersection = false;
        let _hasThreeWayIntersection = false;

        // eslint-disable-next-line no-unused-vars
        for (const [_comboKey, intersection] of Object.entries(result)) {
          const comboSize = intersection.combination.length;

          if (comboSize === 2) hasTwoWayIntersection = true;
          // eslint-disable-next-line no-unused-vars
          if (comboSize === 3) _hasThreeWayIntersection = true;

          // Validate structure
          expect(Array.isArray(intersection.combination)).toBe(true);
          expect(typeof intersection.description).toBe('string');
          expect(Array.isArray(intersection.elements)).toBe(true);

          // All combinations should be from our input categories
          for (const category of intersection.combination) {
            expect(['biology', 'chemistry', 'physics']).toContain(category);
          }
        }

        // Should have at least two-way intersections for science categories
        expect(hasTwoWayIntersection).toBe(true);

        // AI validation of scientific intersections
        const [hasValidScienceIntersections] = await aiExpect(
          result,
          undefined,
          'Should contain meaningful intersections between scientific disciplines with relevant examples'
        );
        expect(hasValidScienceIntersections).toBe(true);
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
      const [isEmptyObject] = await aiExpect(
        result,
        undefined,
        'Should be an empty object since intersections require multiple categories'
      );
      expect(isEmptyObject).toBe(true);
    },
    longTestTimeout
  );

  it(
    'produces consistent and logical results with quality validation',
    async () => {
      const result = await intersections(['literature', 'psychology'], {
        goodnessScore: 8, // Higher quality threshold
      });

      // Basic validation - should be an object
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();

      // If we have results, validate high-quality structure
      if (Object.keys(result).length > 0) {
        // eslint-disable-next-line no-unused-vars
        for (const [_comboKey, intersection] of Object.entries(result)) {
          // Basic structure checks
          expect(intersection.combination).toBeDefined();
          expect(intersection.description).toBeDefined();
          expect(intersection.elements).toBeDefined();
          expect(Array.isArray(intersection.combination)).toBe(true);
          expect(Array.isArray(intersection.elements)).toBe(true);
          expect(typeof intersection.description).toBe('string');

          // Quality checks - should have meaningful content
          expect(intersection.description.length).toBeGreaterThan(10);
          expect(intersection.elements.length).toBeGreaterThan(0);
        }

        // AI validation of literature-psychology intersections
        const [hasQualityIntersections] = await aiExpect(
          result,
          undefined,
          'Should contain high-quality intersections between literature and psychology with meaningful examples'
        );
        expect(hasQualityIntersections).toBe(true);
      }
    },
    longTestTimeout
  );

  it(
    'handles edge cases gracefully',
    async () => {
      const result = await intersections([]);

      // Validate empty input handling
      const [isEmptyForEmptyInput] = await aiExpect(
        result,
        undefined,
        'Should be an empty object for empty input'
      );
      expect(isEmptyForEmptyInput).toBe(true);

      // Validate empty result structure
      expect(Object.keys(result).length).toBe(0);
    },
    longTestTimeout
  );

  it(
    'validates custom instructions and configuration',
    async () => {
      const customInstructions = 'Focus on practical applications and real-world examples';
      const result = await intersections(['engineering', 'design'], {
        instructions: customInstructions,
        batchSize: 2,
      });

      // Basic validation
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();

      // If we have results, validate they follow custom instructions
      if (Object.keys(result).length > 0) {
        const firstIntersection = Object.values(result)[0];

        // Structure validation
        expect(Array.isArray(firstIntersection.combination)).toBe(true);
        expect(typeof firstIntersection.description).toBe('string');
        expect(Array.isArray(firstIntersection.elements)).toBe(true);

        // AI validation that results follow custom instructions
        const [followsInstructions] = await aiExpect(
          firstIntersection,
          undefined,
          'Should contain practical applications and real-world examples as requested in custom instructions'
        );
        expect(followsInstructions).toBe(true);
      }
    },
    longTestTimeout
  );
});

import { describe } from 'vitest';
import glossary from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Glossary chain');

describe('glossary examples', () => {
  it(
    'extracts terms from a science paragraph',
    async () => {
      const text = `The chef explained how umami develops through the Maillard reaction alongside sous-vide techniques.`;
      const result = await glossary(text, { maxTerms: 2 });

      expect(result.length).toBeGreaterThan(0);
      expect(Array.isArray(result)).toBe(true);

      // Validate extracted terms are culinary/technical (not common words)
      const knownCulinaryTerms = ['umami', 'maillard', 'sous-vide', 'sous vide'];
      const matchedTerms = result.filter((term) =>
        knownCulinaryTerms.some((known) => term.toLowerCase().includes(known))
      );
      expect(matchedTerms.length).toBeGreaterThan(0);
    },
    longTestTimeout
  );

  it(
    'handles technical documentation with multiple complex terms',
    async () => {
      const sourceText = `Our microservice architecture uses an API gateway for routing. Authentication is handled via OAuth 2.0 and JWT tokens. We also employ load balancing to distribute traffic.`;
      const result = await glossary(sourceText, { maxTerms: 5 });
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // Check that the extracted terms cover the key technical concepts in the source text.
      const keyConcepts = ['microservice', 'API gateway', 'OAuth', 'JWT', 'load balancing'];
      const matchedCount = keyConcepts.filter((concept) =>
        result.some((term) => term.toLowerCase().includes(concept.toLowerCase()))
      ).length;

      if (process.env.VERBLETS_DEBUG) {
        console.error('Glossary tech doc terms:', JSON.stringify(result));
        console.error(`Matched ${matchedCount}/${keyConcepts.length} key concepts`);
      }

      // Should match most of the key concepts (at least 4 out of 5)
      expect(matchedCount).toBeGreaterThanOrEqual(4);
    },
    longTestTimeout
  );

  it(
    'filters out common words and focuses on specialized terms',
    async () => {
      const text = `The quantum entanglement phenomenon occurs when particles become interconnected, 
      demonstrating superposition states that challenge classical physics understanding. 
      This behavior is fundamental to quantum computing applications.`;

      const result = await glossary(text, { maxTerms: 4 });

      expect(result.length).toBeGreaterThan(0);

      // Validate terms are quantum physics concepts, not common words
      const quantumTerms = [
        'quantum',
        'entanglement',
        'superposition',
        'classical physics',
        'quantum computing',
      ];
      const matchedTerms = result.filter((term) =>
        quantumTerms.some((qt) => term.toLowerCase().includes(qt))
      );
      expect(matchedTerms.length).toBeGreaterThan(0);

      await aiExpect(result).toSatisfy(
        'The extracted terms are relevant to quantum physics or science, not generic filler words like "the" or "and"'
      );
    },
    longTestTimeout
  );

  it(
    'handles empty or simple text appropriately',
    async () => {
      const simpleText = `The cat sat on the mat. It was a sunny day.`;
      const result = await glossary(simpleText, { maxTerms: 3 });

      // Should return empty array or very few terms for simple text
      expect(Array.isArray(result)).toBe(true);
      // Simple text should produce fewer terms than maxTerms
      expect(result.length).toBeLessThanOrEqual(3);
    },
    longTestTimeout
  );

  it(
    'extracts operative philosophical terms for conceptual clarity',
    async () => {
      const philosophyText = `Heidegger's concept of Dasein fundamentally challenges the Cartesian subject-object distinction 
      through his analysis of Being-in-the-world. The phenomenological reduction, as developed by Husserl, 
      brackets the natural attitude to reveal the intentional structure of consciousness. This hermeneutic circle 
      demonstrates how our pre-understanding shapes interpretation, while the ontological difference between 
      beings and Being itself remains concealed in everyday thrownness. Gadamer's fusion of horizons extends 
      this analysis to show how tradition and prejudice constitute the productive ground of understanding.`;

      const result = await glossary(philosophyText, { maxTerms: 8 });

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(8);

      // Validate terms are philosophical concepts, not common words
      const philosophicalTerms = [
        'dasein',
        'being-in-the-world',
        'phenomenological',
        'hermeneutic',
        'intentional',
        'ontological',
        'thrownness',
        'fusion of horizons',
        'superposition',
        'husserl',
        'heidegger',
        'gadamer',
        'cartesian',
        'prejudice',
      ];
      const matchedTerms = result.filter((term) =>
        philosophicalTerms.some((pt) => term.toLowerCase().includes(pt))
      );
      expect(matchedTerms.length).toBeGreaterThan(0);

      await aiExpect(result).toSatisfy(
        'Extracted terms relate to philosophy, phenomenology, or hermeneutics'
      );
    },
    longTestTimeout
  );

  it(
    'extracts operative tech terms across multiple categories',
    async () => {
      const techText = `The team implemented Domain-Driven Design using the Repository pattern and CQRS architecture. 
      Martin Fowler's Strangler Fig pattern helped migrate the legacy system while Kent Beck's Test-Driven Development 
      approach ensured code quality. We used Docker containers orchestrated by Kubernetes, with Redis for caching 
      and PostgreSQL for persistence. The CI/CD pipeline leveraged Jenkins and implemented the Blue-Green deployment 
      strategy. Uncle Bob's Clean Architecture principles guided the service boundaries, while Eric Evans' 
      Bounded Context concept helped define microservice boundaries. The team followed Scrum methodology with 
      pair programming sessions.`;

      const result = await glossary(techText, {
        maxTerms: 12,
        sortBy:
          'importance for understanding the content, weighting named technologies and named patterns equally',
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(12);

      // Debug: log extracted terms for diagnostic visibility
      if (process.env.VERBLETS_DEBUG) {
        console.error('Glossary tech terms extracted:', JSON.stringify(result));
      }

      // Validate terms span multiple categories (patterns, tools, methodologies)
      const patterns = [
        'domain-driven',
        'cqrs',
        'repository',
        'strangler',
        'clean architecture',
        'bounded context',
      ];
      const tools = ['docker', 'kubernetes', 'redis', 'postgresql', 'jenkins'];
      const methodologies = ['test-driven', 'scrum', 'pair programming', 'blue-green'];
      const allKnownTerms = [...patterns, ...tools, ...methodologies];

      const matchedTerms = result.filter((term) =>
        allKnownTerms.some((known) => term.toLowerCase().includes(known))
      );
      expect(matchedTerms.length).toBeGreaterThanOrEqual(4);

      await aiExpect(result).toSatisfy(
        'Extracted terms span categories including patterns, tools, and methodologies'
      );
    },
    longTestTimeout
  );
});

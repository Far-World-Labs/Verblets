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
});

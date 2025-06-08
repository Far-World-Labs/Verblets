import { describe, it, expect } from 'vitest';
import glossary from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('glossary examples', () => {
  it(
    'extracts terms from a science paragraph',
    async () => {
      const text = `The chef explained how umami develops through the Maillard reaction alongside sous-vide techniques.`;
      const result = await glossary(text, { maxTerms: 2 });
      expect(result.length).toBeGreaterThan(0);
    },
    longTestTimeout
  );
});

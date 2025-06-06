import { describe, expect, it } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import polysemy from './index.js';

describe('polysemy example', () => {
  it(
    'extracts polysemous terms from text',
    async () => {
      const text = `I went to the bank to watch the bat fly over the dark river bank.`;
      const terms = await polysemy(text, { topN: 2 });
      expect(terms.length).greaterThan(0);
    },
    longTestTimeout
  );
});

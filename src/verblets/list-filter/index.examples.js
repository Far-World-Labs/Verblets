import { describe, it, expect } from 'vitest';
import listFilter from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('list-filter examples', () => {
  it(
    'filters items with custom instructions',
    async () => {
      const entries = [
        'Losing that match taught me the value of persistence.',
        "I hate losing and it proves I'm worthless.",
        'After failing my exam, I studied harder and passed the retake.',
        "No matter what I do, I'll never succeed.",
      ];
      const result = await listFilter(
        entries,
        'keep only reflections that show personal growth or learning from mistakes'
      );
      expect(result).toStrictEqual([
        'Losing that match taught me the value of persistence.',
        'After failing my exam, I studied harder and passed the retake.',
      ]);
    },
    longTestTimeout
  );
});

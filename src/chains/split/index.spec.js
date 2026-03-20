import { beforeEach, describe, expect, it, vi } from 'vitest';
import split, { mapPreservation } from './index.js';

const DELIM = '---763927459---';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(async (prompt) => {
    // Extract the instructions and text using XML tags
    const instructionsMatch = prompt.match(/<instructions>(.*?)<\/instructions>/s);
    const textMatch = prompt.match(/<text-to-process>(.*?)<\/text-to-process>/s);

    if (!instructionsMatch || !textMatch) {
      return '';
    }

    const instructions = instructionsMatch[1].trim();
    const text = textMatch[1].replace(/^\n|\n$/g, ''); // Only remove leading/trailing newlines, preserve spaces

    // Extract quoted words directly from the instructions
    const words = Array.from(instructions.matchAll(/"([^"]+)"/g)).map((m) => m[1]);

    let out = text;
    words.forEach((word) => {
      if (out.includes(word)) {
        out = out.split(word).join(`${DELIM}${word}`);
      }
    });

    return out;
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const examples = [
  {
    name: 'inserts delimiters based on instructions',
    inputs: {
      text: 'alpha beta gamma delta',
      instructions: 'before "gamma"',
      config: { delimiter: DELIM },
    },
    want: { result: `alpha beta ${DELIM}gamma delta` },
  },
  {
    name: 'chunks long text and joins results',
    inputs: {
      text: 'alpha beta gamma delta epsilon',
      instructions: 'before "delta"',
      config: { delimiter: DELIM, chunkLen: 20 },
    },
    want: { result: `alpha beta gamma ${DELIM}delta epsilon` },
  },
  {
    name: 'handles multiple split points',
    inputs: {
      text: 'alpha beta gamma delta epsilon',
      instructions: 'before "beta" or "delta"',
      config: { delimiter: DELIM },
    },
    want: { result: `alpha ${DELIM}beta gamma ${DELIM}delta epsilon` },
  },
];

describe('split chain', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const { text, instructions, config } = example.inputs;
      const result = await split(text, instructions, config);
      expect(result).toBe(example.want.result);
    });
  });
});

describe('mapPreservation', () => {
  it('all levels return same shape', () => {
    const keys = ['low', 'med', 'high'].map((l) => Object.keys(mapPreservation(l)).sort());
    expect(keys[0]).toEqual(keys[1]);
    expect(keys[1]).toEqual(keys[2]);
  });

  it('undefined returns default', () => {
    expect(mapPreservation(undefined)).toBeDefined();
    expect(typeof mapPreservation(undefined)).toBe('object');
  });

  it('passes through object for power consumers', () => {
    const custom = { a: 1, b: 2 };
    expect(mapPreservation(custom)).toBe(custom);
  });

  it('unknown string falls back to default', () => {
    expect(mapPreservation('zzz')).toEqual(mapPreservation(undefined));
  });
});

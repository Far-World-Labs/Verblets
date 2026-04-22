import { beforeEach, describe, expect, it, vi } from 'vitest';
import split, { buildPrompt } from './index.js';

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
    name: 'splits text into segments based on instructions',
    inputs: {
      text: 'alpha beta gamma delta',
      instructions: 'before "gamma"',
      config: { delimiter: DELIM },
    },
    want: { segments: ['alpha beta', 'gamma delta'] },
  },
  {
    name: 'chunks long text and joins before splitting',
    inputs: {
      text: 'alpha beta gamma delta epsilon',
      instructions: 'before "delta"',
      config: { delimiter: DELIM, chunkLen: 20 },
    },
    want: { segments: ['alpha beta gamma', 'delta epsilon'] },
  },
  {
    name: 'handles multiple split points',
    inputs: {
      text: 'alpha beta gamma delta epsilon',
      instructions: 'before "beta" or "delta"',
      config: { delimiter: DELIM },
    },
    want: { segments: ['alpha', 'beta gamma', 'delta epsilon'] },
  },
];

describe('split chain', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const { text, instructions, config } = example.inputs;
      const result = await split(text, instructions, config);
      expect(result).toEqual(example.want.segments);
    });
  });
});

describe('semantic split mode', () => {
  it('splits text on topic changes when mode is semantic', async () => {
    const text = 'alpha beta gamma delta epsilon';
    const result = await split(text, 'before "gamma"', {
      delimiter: DELIM,
      mode: 'semantic',
    });
    expect(result).toEqual(['alpha beta', 'gamma delta epsilon']);
  });

  it('preserves original text exactly in semantic mode', async () => {
    const text = 'alpha beta gamma delta';
    const result = await split(text, 'before "gamma"', {
      delimiter: DELIM,
      mode: 'semantic',
    });
    expect(result.join(' ')).toBe(text);
  });

  it('handles multiple semantic split points', async () => {
    const text = 'alpha beta gamma delta epsilon';
    const result = await split(text, 'before "beta" or "delta"', {
      delimiter: DELIM,
      mode: 'semantic',
    });
    expect(result).toEqual(['alpha', 'beta gamma', 'delta epsilon']);
  });

  it('respects chunking constraints in semantic mode', async () => {
    const text = 'alpha beta gamma delta epsilon';
    const result = await split(text, 'before "delta"', {
      delimiter: DELIM,
      mode: 'semantic',
      chunkLen: 20,
    });
    expect(result).toEqual(['alpha beta gamma', 'delta epsilon']);
  });

  it('defaults to structural mode when mode is not specified', async () => {
    const text = 'alpha beta gamma delta';
    const result = await split(text, 'before "gamma"', { delimiter: DELIM });
    expect(result).toEqual(['alpha beta', 'gamma delta']);
  });
});

describe('buildPrompt', () => {
  it('includes structural rules by default', () => {
    const prompt = buildPrompt('some text', 'split here', DELIM);
    expect(prompt).toContain('natural break points');
    expect(prompt).not.toContain('semantic boundaries');
  });

  it('includes semantic rules when mode is semantic', () => {
    const prompt = buildPrompt('some text', 'split here', DELIM, { mode: 'semantic' });
    expect(prompt).toContain('semantic boundaries');
    expect(prompt).toContain('meaning, topic, or argument shifts');
    expect(prompt).toContain('Ignore structural markers');
    expect(prompt).not.toContain('natural break points');
  });

  it('includes structural rules when mode is structural', () => {
    const prompt = buildPrompt('some text', 'split here', DELIM, { mode: 'structural' });
    expect(prompt).toContain('natural break points');
    expect(prompt).not.toContain('semantic boundaries');
  });

  it('includes target split count in semantic mode', () => {
    const prompt = buildPrompt('some text', 'split here', DELIM, {
      mode: 'semantic',
      targetSplitCount: 5,
    });
    expect(prompt).toContain('approximately 5 sections');
    expect(prompt).toContain('semantic boundaries');
  });

  it('includes previous context in semantic mode', () => {
    const prompt = buildPrompt('some text', 'split here', DELIM, {
      mode: 'semantic',
      previousContent: 'earlier content here',
    });
    expect(prompt).toContain('<previous-context>');
    expect(prompt).toContain('earlier content here');
  });
});

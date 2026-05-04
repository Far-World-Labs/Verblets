import { beforeEach, vi, expect } from 'vitest';
import split, { buildPrompt } from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

const DELIM = '---763927459---';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(async (prompt) => {
    const instructionsMatch = prompt.match(/<instructions>(.*?)<\/instructions>/s);
    const textMatch = prompt.match(/<text-to-process>(.*?)<\/text-to-process>/s);
    if (!instructionsMatch || !textMatch) return '';
    const instructions = instructionsMatch[1].trim();
    const text = textMatch[1].replace(/^\n|\n$/g, '');
    const words = Array.from(instructions.matchAll(/"([^"]+)"/g)).map((m) => m[1]);
    let out = text;
    for (const word of words) {
      if (out.includes(word)) out = out.split(word).join(`${DELIM}${word}`);
    }
    return out;
  }),
}));

beforeEach(() => vi.clearAllMocks());

runTable({
  describe: 'split chain',
  examples: [
    {
      name: 'splits text into segments based on instructions',
      inputs: {
        text: 'alpha beta gamma delta',
        instructions: 'before "gamma"',
        config: { delimiter: DELIM },
      },
      want: { value: ['alpha beta', 'gamma delta'] },
    },
    {
      name: 'chunks long text and joins before splitting',
      inputs: {
        text: 'alpha beta gamma delta epsilon',
        instructions: 'before "delta"',
        config: { delimiter: DELIM, chunkLen: 20 },
      },
      want: { value: ['alpha beta gamma', 'delta epsilon'] },
    },
    {
      name: 'handles multiple split points',
      inputs: {
        text: 'alpha beta gamma delta epsilon',
        instructions: 'before "beta" or "delta"',
        config: { delimiter: DELIM },
      },
      want: { value: ['alpha', 'beta gamma', 'delta epsilon'] },
    },
    {
      name: 'splits text on topic changes when mode is semantic',
      inputs: {
        text: 'alpha beta gamma delta epsilon',
        instructions: 'before "gamma"',
        config: { delimiter: DELIM, mode: 'semantic' },
      },
      want: { value: ['alpha beta', 'gamma delta epsilon'] },
    },
    {
      name: 'preserves original text exactly in semantic mode',
      inputs: {
        text: 'alpha beta gamma delta',
        instructions: 'before "gamma"',
        config: { delimiter: DELIM, mode: 'semantic' },
      },
      want: { joinedEqualsText: true },
    },
    {
      name: 'handles multiple semantic split points',
      inputs: {
        text: 'alpha beta gamma delta epsilon',
        instructions: 'before "beta" or "delta"',
        config: { delimiter: DELIM, mode: 'semantic' },
      },
      want: { value: ['alpha', 'beta gamma', 'delta epsilon'] },
    },
    {
      name: 'respects chunking constraints in semantic mode',
      inputs: {
        text: 'alpha beta gamma delta epsilon',
        instructions: 'before "delta"',
        config: { delimiter: DELIM, mode: 'semantic', chunkLen: 20 },
      },
      want: { value: ['alpha beta gamma', 'delta epsilon'] },
    },
    {
      name: 'defaults to structural mode when mode is not specified',
      inputs: {
        text: 'alpha beta gamma delta',
        instructions: 'before "gamma"',
        config: { delimiter: DELIM },
      },
      want: { value: ['alpha beta', 'gamma delta'] },
    },
  ],
  process: ({ inputs }) => split(inputs.text, inputs.instructions, inputs.config),
  expects: ({ result, inputs, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if (want.joinedEqualsText) expect(result.join(' ')).toBe(inputs.text);
  },
});

runTable({
  describe: 'buildPrompt',
  examples: [
    {
      name: 'includes structural rules by default',
      inputs: { text: 'some text', instructions: 'split here', options: undefined },
      want: { contains: ['natural break points'], notContains: ['semantic boundaries'] },
    },
    {
      name: 'includes semantic rules when mode is semantic',
      inputs: { text: 'some text', instructions: 'split here', options: { mode: 'semantic' } },
      want: {
        contains: [
          'semantic boundaries',
          'meaning, topic, or argument shifts',
          'Ignore structural markers',
        ],
        notContains: ['natural break points'],
      },
    },
    {
      name: 'includes structural rules when mode is structural',
      inputs: { text: 'some text', instructions: 'split here', options: { mode: 'structural' } },
      want: { contains: ['natural break points'], notContains: ['semantic boundaries'] },
    },
    {
      name: 'includes target split count in semantic mode',
      inputs: {
        text: 'some text',
        instructions: 'split here',
        options: { mode: 'semantic', targetSplitCount: 5 },
      },
      want: { contains: ['approximately 5 sections', 'semantic boundaries'] },
    },
    {
      name: 'includes previous context in semantic mode',
      inputs: {
        text: 'some text',
        instructions: 'split here',
        options: { mode: 'semantic', previousContent: 'earlier content here' },
      },
      want: { contains: ['<previous-context>', 'earlier content here'] },
    },
  ],
  process: ({ inputs }) => buildPrompt(inputs.text, inputs.instructions, DELIM, inputs.options),
  expects: ({ result, want }) => {
    if (want.contains) {
      for (const fragment of want.contains) expect(result).toContain(fragment);
    }
    if (want.notContains) {
      for (const fragment of want.notContains) expect(result).not.toContain(fragment);
    }
  },
});

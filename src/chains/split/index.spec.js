import { beforeEach, vi, expect } from 'vitest';
import split, { buildPrompt } from './index.js';
import { runTable, equals, contains, all } from '../../lib/examples-runner/index.js';

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

// ─── split (structural mode) ──────────────────────────────────────────────

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
      check: equals(['alpha beta', 'gamma delta']),
    },
    {
      name: 'chunks long text and joins before splitting',
      inputs: {
        text: 'alpha beta gamma delta epsilon',
        instructions: 'before "delta"',
        config: { delimiter: DELIM, chunkLen: 20 },
      },
      check: equals(['alpha beta gamma', 'delta epsilon']),
    },
    {
      name: 'handles multiple split points',
      inputs: {
        text: 'alpha beta gamma delta epsilon',
        instructions: 'before "beta" or "delta"',
        config: { delimiter: DELIM },
      },
      check: equals(['alpha', 'beta gamma', 'delta epsilon']),
    },
  ],
  process: ({ text, instructions, config }) => split(text, instructions, config),
});

// ─── split (semantic mode) ────────────────────────────────────────────────

runTable({
  describe: 'semantic split mode',
  examples: [
    {
      name: 'splits text on topic changes when mode is semantic',
      inputs: {
        text: 'alpha beta gamma delta epsilon',
        instructions: 'before "gamma"',
        config: { delimiter: DELIM, mode: 'semantic' },
      },
      check: equals(['alpha beta', 'gamma delta epsilon']),
    },
    {
      name: 'preserves original text exactly in semantic mode',
      inputs: {
        text: 'alpha beta gamma delta',
        instructions: 'before "gamma"',
        config: { delimiter: DELIM, mode: 'semantic' },
      },
      check: ({ result, inputs }) => expect(result.join(' ')).toBe(inputs.text),
    },
    {
      name: 'handles multiple semantic split points',
      inputs: {
        text: 'alpha beta gamma delta epsilon',
        instructions: 'before "beta" or "delta"',
        config: { delimiter: DELIM, mode: 'semantic' },
      },
      check: equals(['alpha', 'beta gamma', 'delta epsilon']),
    },
    {
      name: 'respects chunking constraints in semantic mode',
      inputs: {
        text: 'alpha beta gamma delta epsilon',
        instructions: 'before "delta"',
        config: { delimiter: DELIM, mode: 'semantic', chunkLen: 20 },
      },
      check: equals(['alpha beta gamma', 'delta epsilon']),
    },
    {
      name: 'defaults to structural mode when mode is not specified',
      inputs: {
        text: 'alpha beta gamma delta',
        instructions: 'before "gamma"',
        config: { delimiter: DELIM },
      },
      check: equals(['alpha beta', 'gamma delta']),
    },
  ],
  process: ({ text, instructions, config }) => split(text, instructions, config),
});

// ─── buildPrompt ──────────────────────────────────────────────────────────

runTable({
  describe: 'buildPrompt',
  examples: [
    {
      name: 'includes structural rules by default',
      inputs: { text: 'some text', instructions: 'split here', options: undefined },
      check: ({ result }) => {
        expect(result).toContain('natural break points');
        expect(result).not.toContain('semantic boundaries');
      },
    },
    {
      name: 'includes semantic rules when mode is semantic',
      inputs: {
        text: 'some text',
        instructions: 'split here',
        options: { mode: 'semantic' },
      },
      check: all(
        contains('semantic boundaries'),
        contains('meaning, topic, or argument shifts'),
        contains('Ignore structural markers'),
        ({ result }) => expect(result).not.toContain('natural break points')
      ),
    },
    {
      name: 'includes structural rules when mode is structural',
      inputs: {
        text: 'some text',
        instructions: 'split here',
        options: { mode: 'structural' },
      },
      check: ({ result }) => {
        expect(result).toContain('natural break points');
        expect(result).not.toContain('semantic boundaries');
      },
    },
    {
      name: 'includes target split count in semantic mode',
      inputs: {
        text: 'some text',
        instructions: 'split here',
        options: { mode: 'semantic', targetSplitCount: 5 },
      },
      check: all(contains('approximately 5 sections'), contains('semantic boundaries')),
    },
    {
      name: 'includes previous context in semantic mode',
      inputs: {
        text: 'some text',
        instructions: 'split here',
        options: { mode: 'semantic', previousContent: 'earlier content here' },
      },
      check: all(contains('<previous-context>'), contains('earlier content here')),
    },
  ],
  process: ({ text, instructions, options }) => buildPrompt(text, instructions, DELIM, options),
});

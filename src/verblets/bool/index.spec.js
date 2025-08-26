import { describe, expect as vitestExpect, it as vitestIt, vi } from 'vitest';
import { getConfig } from '../../chains/test-analysis/config.js';
import { wrapIt, wrapExpect } from '../../chains/test-analysis/test-wrappers.js';
import bool from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((text, options) => {
    // When responseFormat is used, auto-unwrapping will return the value directly
    const systemPrompt = options?.modelOptions?.systemPrompt || '';
    if (/purple lightsaber/.test(text) || /purple lightsaber/.test(systemPrompt)) {
      return 'true';
    }
    return 'false';
  }),
}));

// Setup AI test wrappers
const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'bool verblet' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'bool verblet' } })
  : vitestExpect;

const examples = [
  {
    name: 'True values',
    inputs: { text: 'Does Mace Windu have a purple lightsaber' },
    want: { result: true },
  },
  {
    name: 'False values',
    inputs: { text: 'Does Mace Windu have a blue lightsaber' },
    want: { result: false },
  },
];

describe('bool verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      expect(await bool(example.inputs.text)).toStrictEqual(example.want.result);
    });
  });
});

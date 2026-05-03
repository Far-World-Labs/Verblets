import { vi } from 'vitest';
import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';
import { runTable, equals } from '../../lib/examples-runner/index.js';
import bool from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn().mockImplementation((text, options) => {
    const systemPrompt = options?.systemPrompt || '';
    if (/purple lightsaber/.test(text) || /purple lightsaber/.test(systemPrompt)) return 'true';
    return 'false';
  }),
}));

const { it } = getTestHelpers('bool verblet');

const examples = [
  {
    name: 'true value',
    inputs: 'Does Mace Windu have a purple lightsaber',
    check: equals(true),
  },
  {
    name: 'false value',
    inputs: 'Does Mace Windu have a blue lightsaber',
    check: equals(false),
  },
];

runTable({ describe: 'bool verblet', examples, process: (text) => bool(text), it });

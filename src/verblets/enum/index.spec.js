import { vi } from 'vitest';
import enumValue from './index.js';
import { runTable, equals } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn().mockImplementation((text) => {
    if (/traffic light/.test(text)) return 'red';
    return 'undefined';
  }),
}));

const examples = [
  {
    name: 'returns the matching enum value',
    inputs: {
      text: 'What is the top color on a traffic light',
      enumMap: { green: 1, yellow: 1, red: 1, purple: 1 },
    },
    check: equals('red'),
  },
];

runTable({
  describe: 'enum verblet',
  examples,
  process: ({ text, enumMap }) => enumValue(text, enumMap),
});

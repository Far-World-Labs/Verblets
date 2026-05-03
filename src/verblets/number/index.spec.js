import { vi } from 'vitest';
import number from './index.js';
import { runTable, equals } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn().mockImplementation((text) => {
    if (/Everest/.test(text)) return 29029;
    return 'undefined';
  }),
}));

const examples = [
  {
    name: 'returns the answered number',
    inputs: 'What is the height of Everest in feet',
    check: equals(29029),
  },
  {
    name: 'unanswerable question → undefined',
    inputs: 'What is the my age in years',
    check: equals(undefined),
  },
];

runTable({ describe: 'number verblet', examples, process: (text) => number(text) });

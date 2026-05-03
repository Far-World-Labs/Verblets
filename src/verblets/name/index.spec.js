import { vi } from 'vitest';
import name from './index.js';
import { runTable, equals } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (n, schema) => ({ type: 'json_schema', json_schema: { name: n, schema } }),
  default: vi.fn().mockImplementation((text) => {
    if (/weather pattern/i.test(text)) return 'BlueSkies';
    return 'undefined';
  }),
}));

const examples = [
  {
    name: 'generates a descriptive name',
    inputs: 'Dataset of weather pattern observations',
    check: equals('BlueSkies'),
  },
  { name: 'returns undefined when unsure', inputs: '???', check: equals(undefined) },
];

runTable({ describe: 'name verblet', examples, process: (text) => name(text) });

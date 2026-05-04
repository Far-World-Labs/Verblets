import { vi, expect } from 'vitest';
import sort, { useTestSortPrompt } from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

useTestSortPrompt();

const extremeK = 4;
const batchSize = 12;
const byAB = (a, b) => b.localeCompare(a);

const unsortedStrings = [
  'zebra',
  'apple',
  'quail',
  'mango',
  'giraffe',
  'banana',
  'dog',
  'lion',
  'tiger',
  'elephant',
  'kiwi',
  'raspberry',
  'grape',
  'apricot',
  'kangaroo',
  'owl',
  'peacock',
  'xenon',
  'uranium',
  'platinum',
  'walrus',
  'fox',
  'capybara',
  'iguana',
  'jaguar',
  'koi',
  'lobster',
  'moose',
  'nugget',
  'octopus',
  'python',
  'quokka',
  'raccoon',
  'starfish',
  'tortoise',
  'umbrella',
  'vulture',
  'wombat',
  'xerus',
  'yak',
  'zeppelin',
  'ant',
  'beaver',
  'cat',
  'dolphin',
  'echidna',
  'frog',
  'hamster',
  'impala',
  'jellyfish',
];

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (text.options.description === 'alphabetically') {
      const sorted = text.list.toSorted((a, b) => b.localeCompare(a));
      return JSON.stringify(sorted);
    }
    return '[]';
  }),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

runTable({
  describe: 'Sort',
  examples: [
    {
      name: 'Basic usage',
      inputs: {
        list: [...unsortedStrings],
        options: { by: 'alphabetically', iterations: 3, extremeK, batchSize },
      },
      want: {
        highest: unsortedStrings.toSorted(byAB).slice(0, extremeK * 3),
        lowest: unsortedStrings.toSorted(byAB).slice(-(extremeK * 3)),
      },
    },
    {
      name: 'Empty list',
      inputs: { list: [], options: { by: 'alphabetically', extremeK, batchSize } },
      want: { highest: [], lowest: [] },
    },
  ],
  process: ({ inputs }) =>
    sort(inputs.list, inputs.options.by, {
      model: { budgetTokens: () => ({ completion: 0 }) },
      ...inputs.options,
    }),
  expects: ({ result, inputs, want }) => {
    const iterations = inputs.options.iterations ?? 1;
    expect(result.slice(0, extremeK * iterations)).toEqual(want.highest);
    expect(result.slice(-(extremeK * iterations))).toEqual(want.lowest);
  },
});

import listGroup from './index.js';
import { vi, describe, it, expect } from 'vitest';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(() => 'odd\neven\nodd'),
}));

const examples = [
  {
    inputs: {
      list: ['a', 'bb', 'ccc'],
      instructions: 'odd or even length',
      categories: ['odd', 'even'],
    },
    want: { result: { odd: ['a', 'ccc'], even: ['bb'] } },
  },
];

describe('list-group verblet', () => {
  it('groups items using instructions', async () => {
    const result = await listGroup(['a', 'bb', 'ccc'], 'odd or even length', ['odd', 'even']);
    expect(result).toStrictEqual({ odd: ['a', 'ccc'], even: ['bb'] });
  });

  examples.forEach((example) => {
    it(example.inputs.instructions, async () => {
      const result = await listGroup(
        example.inputs.list,
        example.inputs.instructions,
        example.inputs.categories
      );
      expect(result).toStrictEqual(example.want.result);
    });
  });
});

import group from './index.js';
import listGroupLines from '../../verblets/list-group-lines/index.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../verblets/list-group-lines/index.js', () => ({
  default: vi.fn(),
}));

describe('group chain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('groups in batches', async () => {
    const items = ['a', 'bb', 'ccc', 'dddd', 'eeeee'];

    // Mock the calls in order - with chunkSize=2, we'll have 3 batches: [a,bb], [ccc,dddd], [eeeee]
    listGroupLines
      .mockResolvedValueOnce({ odd: ['a'], even: ['bb'] }) // First batch
      .mockResolvedValueOnce({ odd: ['ccc'], even: ['dddd'] }) // Second batch
      .mockResolvedValueOnce({ odd: ['eeeee'] }); // Third batch

    const result = await group(items, 'odd or even', {
      chunkSize: 2,
    });

    expect(result).toStrictEqual({ odd: ['a', 'ccc', 'eeeee'], even: ['bb', 'dddd'] });
    expect(listGroupLines).toHaveBeenCalledTimes(3);

    // Verify the calls were made with the right parameters
    expect(listGroupLines).toHaveBeenNthCalledWith(1, ['a', 'bb'], 'odd or even', undefined, {
      llm: undefined,
    });
    expect(listGroupLines).toHaveBeenNthCalledWith(
      2,
      ['ccc', 'dddd'],
      'odd or even',
      ['odd', 'even'],
      {
        llm: undefined,
      }
    );
    expect(listGroupLines).toHaveBeenNthCalledWith(3, ['eeeee'], 'odd or even', ['odd', 'even'], {
      llm: undefined,
    });
  });
});

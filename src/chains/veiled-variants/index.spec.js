import { describe, expect, it, vi } from 'vitest';
import veiledVariants from './index.js';

let call = 0;
let runMock;

vi.mock('../../lib/chatgpt/index.js', () => ({
  run: (...args) => runMock(...args),
}));

runMock = vi.fn().mockImplementation(() => {
  call += 1;
  if (call === 1) {
    return '["s1","s2","s3","s4","s5"]';
  }
  if (call === 2) {
    return '["c1","c2","c3","c4","c5"]';
  }
  return '["w1","w2","w3","w4","w5"]';
});

describe('veiledVariants', () => {
  it('returns 15 masked queries', async () => {
    const result = await veiledVariants({ prompt: 'secret' });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(15);
    expect(runMock).toHaveBeenCalledTimes(3);
    runMock.mock.calls.forEach((callArgs) => {
      expect(callArgs[1]).toStrictEqual({ modelOptions: { modelName: 'privateBase' } });
    });
  });

  it('allows overriding model name', async () => {
    runMock.mockClear();
    call = 0;
    await veiledVariants({ prompt: 'secret', modelName: 'publicBase' });
    runMock.mock.calls.forEach((callArgs) => {
      expect(callArgs[1]).toStrictEqual({ modelOptions: { modelName: 'publicBase' } });
    });
  });
});

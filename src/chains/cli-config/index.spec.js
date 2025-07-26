import { beforeEach, describe, expect, it, vi } from 'vitest';
import cliConfig from './index.js';
import bulkReduce from '../bulk-reduce/index.js';

vi.mock('../bulk-reduce/index.js', () => ({
  default: vi.fn(async (_fields, _instructions, config) => config.initial),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('cli-config chain', () => {
  it('returns defaults when bulk reduce makes no changes', async () => {
    const spec = { port: { default: 8080 }, env: { default: 'dev' } };
    const result = await cliConfig('no overrides', spec);
    expect(result).toStrictEqual({ port: 8080, env: 'dev' });
    expect(bulkReduce).toHaveBeenCalledTimes(1);
  });
});

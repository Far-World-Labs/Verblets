import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import createDataStore from './data-store.js';
import createMediaEncoding from './media-encoding.js';

describe('createMediaEncoding', () => {
  let basePath;
  let store;
  let encoding;

  beforeEach(async () => {
    basePath = await mkdtemp(join(tmpdir(), 'media-encoding-test-'));
    store = createDataStore(basePath);
    encoding = createMediaEncoding(store);
  });

  afterEach(async () => {
    await rm(basePath, { recursive: true, force: true });
  });

  it('returns empty array when no encodings set', async () => {
    const result = await encoding.getEncodings('reports/summary');
    expect(result).toEqual([]);
  });

  it('stores and retrieves encodings', async () => {
    const encodings = [
      { type: 'table', sortRowsBy: 'score', default: true },
      { type: 'matrix', projection: 'object-property' },
    ];
    await encoding.setEncodings('reports/summary', encodings);
    const result = await encoding.getEncodings('reports/summary');
    expect(result).toEqual(encodings);
  });

  it('adds an encoding to an existing set', async () => {
    await encoding.setEncodings('data/output', [{ type: 'table' }]);
    await encoding.addEncoding('data/output', { type: 'matrix', default: true });
    const result = await encoding.getEncodings('data/output');
    expect(result).toHaveLength(2);
    expect(result[1].type).toBe('matrix');
  });

  it('removes encodings', async () => {
    await encoding.setEncodings('key', [{ type: 'table' }]);
    await encoding.removeEncodings('key');
    expect(await encoding.getEncodings('key')).toEqual([]);
  });

  it('getDefaultEncoding returns the default', async () => {
    await encoding.setEncodings('key', [{ type: 'table' }, { type: 'matrix', default: true }]);
    const defaultEnc = await encoding.getDefaultEncoding('key');
    expect(defaultEnc.type).toBe('matrix');
  });

  it('getDefaultEncoding returns first when no default set', async () => {
    await encoding.setEncodings('key', [{ type: 'table' }, { type: 'matrix' }]);
    const defaultEnc = await encoding.getDefaultEncoding('key');
    expect(defaultEnc.type).toBe('table');
  });
});

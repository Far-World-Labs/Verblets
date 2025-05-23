import { describe, it, expect, vi, beforeEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import listen from './index.js';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(() => ({ status: 0 })),
}));

describe('listen', () => {
  const cacheDir = path.join(os.tmpdir(), 'listen-test');

  beforeEach(async () => {
    try {
      await fs.rm(cacheDir, { recursive: true });
    } catch {
      // ignore
    }
  });

  it('records to cache directory', async () => {
    const file = await listen({ duration: 1, cacheDir });
    expect(file.startsWith(cacheDir)).toBe(true);
    expect(spawnSync).toHaveBeenCalled();
  });

  it('falls back when first command fails', async () => {
    spawnSync.mockReset();
    spawnSync.mockReturnValueOnce({ error: { code: 'ENOENT' } }).mockReturnValueOnce({ status: 0 });
    const file = await listen({ duration: 1, cacheDir });
    expect(spawnSync.mock.calls[1][0]).toContain(cacheDir);
    expect(file.startsWith(cacheDir)).toBe(true);
  });
});

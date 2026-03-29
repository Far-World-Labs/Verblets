import { mkdtemp, rm, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export async function cleanupPaths(paths) {
  let removed = 0;
  for (const filePath of paths) {
    try {
      await unlink(filePath);
      removed++;
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
  return removed;
}

export async function createTempDir(prefix = 'verblets-scrape-') {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  const tracked = [];

  return {
    dir,
    track(filePath) {
      tracked.push(filePath);
    },
    paths() {
      return [...tracked];
    },
    async cleanup() {
      try {
        await cleanupPaths(tracked);
      } catch {
        /* swallow */
      }
      try {
        await rm(dir, { recursive: true, force: true });
      } catch {
        /* swallow */
      }
    },
  };
}

export default createTempDir;

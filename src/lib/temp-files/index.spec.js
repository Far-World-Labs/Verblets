import { writeFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterAll, describe, expect, it } from 'vitest';

import { createTempDir, cleanupPaths } from './index.js';

const dirsToClean = [];

afterAll(async () => {
  const { rm } = await import('node:fs/promises');
  for (const dir of dirsToClean) {
    try {
      await rm(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});

describe('createTempDir', () => {
  it('creates a real temp directory with the default prefix', async () => {
    const ctx = await createTempDir();
    dirsToClean.push(ctx.dir);

    expect(ctx.dir).toContain('verblets-scrape-');
    expect(existsSync(ctx.dir)).toBe(true);
  });

  it('creates a temp directory with a custom prefix', async () => {
    const ctx = await createTempDir('custom-prefix-');
    dirsToClean.push(ctx.dir);

    expect(ctx.dir).toContain('custom-prefix-');
    expect(existsSync(ctx.dir)).toBe(true);
  });

  it('creates a temp directory under a custom parent directory', async () => {
    const parent = join(tmpdir(), `verblets-parent-test-${Date.now()}`);
    mkdirSync(parent, { recursive: true });
    dirsToClean.push(parent);

    const ctx = await createTempDir('child-', parent);
    dirsToClean.push(ctx.dir);

    expect(ctx.dir).toContain('child-');
    expect(ctx.dir.startsWith(parent)).toBe(true);
    expect(existsSync(ctx.dir)).toBe(true);
  });

  it('track registers paths and paths() returns them', async () => {
    const ctx = await createTempDir();
    dirsToClean.push(ctx.dir);

    expect(ctx.paths()).toEqual([]);

    const pathA = join(ctx.dir, 'a.png');
    const pathB = join(ctx.dir, 'b.png');
    ctx.track(pathA);
    ctx.track(pathB);

    expect(ctx.paths()).toEqual([pathA, pathB]);
  });

  it('paths() returns a copy, not a reference to the internal array', async () => {
    const ctx = await createTempDir();
    dirsToClean.push(ctx.dir);

    ctx.track('/fake/path');
    const snapshot = ctx.paths();
    ctx.track('/another/path');

    expect(snapshot).toEqual(['/fake/path']);
    expect(ctx.paths()).toEqual(['/fake/path', '/another/path']);
  });

  it('cleanup removes tracked files and the directory', async () => {
    const ctx = await createTempDir();
    const fileA = join(ctx.dir, 'shot1.png');
    const fileB = join(ctx.dir, 'shot2.png');

    await writeFile(fileA, 'image-data-a');
    await writeFile(fileB, 'image-data-b');
    ctx.track(fileA);
    ctx.track(fileB);

    await ctx.cleanup();

    expect(existsSync(fileA)).toBe(false);
    expect(existsSync(fileB)).toBe(false);
    expect(existsSync(ctx.dir)).toBe(false);
  });

  it('cleanup does not throw when directory is already removed', async () => {
    const ctx = await createTempDir();
    const { rm } = await import('node:fs/promises');
    await rm(ctx.dir, { recursive: true, force: true });

    await expect(ctx.cleanup()).resolves.toBeUndefined();
  });
});

describe('cleanupPaths', () => {
  it('removes files and returns the count of removed files', async () => {
    const ctx = await createTempDir();
    dirsToClean.push(ctx.dir);

    const fileA = join(ctx.dir, 'a.tmp');
    const fileB = join(ctx.dir, 'b.tmp');
    const fileC = join(ctx.dir, 'c.tmp');
    await writeFile(fileA, 'a');
    await writeFile(fileB, 'b');
    await writeFile(fileC, 'c');

    const removed = await cleanupPaths([fileA, fileB, fileC]);

    expect(removed).toBe(3);
    expect(existsSync(fileA)).toBe(false);
    expect(existsSync(fileB)).toBe(false);
    expect(existsSync(fileC)).toBe(false);
  });

  it('ignores missing files (ENOENT) and counts only actual removals', async () => {
    const ctx = await createTempDir();
    dirsToClean.push(ctx.dir);

    const existing = join(ctx.dir, 'exists.tmp');
    const missing = join(ctx.dir, 'gone.tmp');
    await writeFile(existing, 'data');

    const removed = await cleanupPaths([existing, missing]);

    expect(removed).toBe(1);
    expect(existsSync(existing)).toBe(false);
  });
});

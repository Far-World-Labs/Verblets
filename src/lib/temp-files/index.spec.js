import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { createTempDir, cleanupPaths, resolveOutputDir } from './index.js';

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

describe('resolveOutputDir', () => {
  const originalEnv = process.env.VERBLETS_OUTPUT_DIR;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.VERBLETS_OUTPUT_DIR;
    } else {
      process.env.VERBLETS_OUTPUT_DIR = originalEnv;
    }
  });

  it('returns explicit outputDir when provided', () => {
    process.env.VERBLETS_OUTPUT_DIR = '/from-env';
    expect(resolveOutputDir('/explicit')).toBe('/explicit');
  });

  it('falls back to VERBLETS_OUTPUT_DIR env var', () => {
    process.env.VERBLETS_OUTPUT_DIR = '/from-env';
    expect(resolveOutputDir()).toBe('/from-env');
  });

  it('returns undefined when neither is set', () => {
    delete process.env.VERBLETS_OUTPUT_DIR;
    expect(resolveOutputDir()).toBeUndefined();
  });
});

describe('createTempDir', () => {
  it('creates an ephemeral directory in tmpdir with default name', async () => {
    const ctx = await createTempDir();
    dirsToClean.push(ctx.dir);

    expect(ctx.dir).toContain('verblets-scratch-');
    expect(ctx.dir.startsWith(tmpdir())).toBe(true);
    expect(existsSync(ctx.dir)).toBe(true);
  });

  it('creates an ephemeral directory with a custom name', async () => {
    const ctx = await createTempDir('my-chain');
    dirsToClean.push(ctx.dir);

    expect(ctx.dir).toContain('verblets-my-chain-');
    expect(existsSync(ctx.dir)).toBe(true);
  });

  it('creates a structured directory under outputDir with chain-name partition', async () => {
    const base = join(tmpdir(), `verblets-structured-test-${Date.now()}`);
    dirsToClean.push(base);

    const ctx = await createTempDir('web-scrape', base);
    dirsToClean.push(ctx.dir);

    expect(ctx.dir.startsWith(join(base, 'web-scrape'))).toBe(true);
    expect(existsSync(ctx.dir)).toBe(true);
  });

  it('structured directory name includes a timestamp prefix', async () => {
    const base = join(tmpdir(), `verblets-ts-test-${Date.now()}`);
    dirsToClean.push(base);

    const ctx = await createTempDir('test-chain', base);
    dirsToClean.push(ctx.dir);

    const leaf = ctx.dir.split('/').pop();
    expect(leaf).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-/);
  });

  it('falls back to VERBLETS_OUTPUT_DIR env var when no outputDir given', async () => {
    const base = join(tmpdir(), `verblets-env-test-${Date.now()}`);
    dirsToClean.push(base);

    const saved = process.env.VERBLETS_OUTPUT_DIR;
    process.env.VERBLETS_OUTPUT_DIR = base;
    try {
      const ctx = await createTempDir('from-env');
      dirsToClean.push(ctx.dir);

      expect(ctx.dir.startsWith(join(base, 'from-env'))).toBe(true);
      expect(existsSync(ctx.dir)).toBe(true);
    } finally {
      if (saved === undefined) delete process.env.VERBLETS_OUTPUT_DIR;
      else process.env.VERBLETS_OUTPUT_DIR = saved;
    }
  });

  it('explicit outputDir takes precedence over env var', async () => {
    const envBase = join(tmpdir(), `verblets-env-${Date.now()}`);
    const explicitBase = join(tmpdir(), `verblets-explicit-${Date.now()}`);
    dirsToClean.push(envBase, explicitBase);

    const saved = process.env.VERBLETS_OUTPUT_DIR;
    process.env.VERBLETS_OUTPUT_DIR = envBase;
    try {
      const ctx = await createTempDir('precedence', explicitBase);
      dirsToClean.push(ctx.dir);

      expect(ctx.dir.startsWith(join(explicitBase, 'precedence'))).toBe(true);
    } finally {
      if (saved === undefined) delete process.env.VERBLETS_OUTPUT_DIR;
      else process.env.VERBLETS_OUTPUT_DIR = saved;
    }
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

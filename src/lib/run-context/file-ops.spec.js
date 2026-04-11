import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import createFileOps from './file-ops.js';

describe('createFileOps', () => {
  let rootDir;
  let files;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'fileops-test-'));
    files = createFileOps(rootDir);
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  describe('read/write', () => {
    it('writes and reads a file', async () => {
      await files.write('test.txt', 'hello');
      const content = await files.read('test.txt');
      expect(content).toBe('hello');
    });

    it('creates parent directories on write', async () => {
      await files.write('a/b/c.txt', 'nested');
      expect(await files.read('a/b/c.txt')).toBe('nested');
    });

    it('overwrites existing files', async () => {
      await files.write('f.txt', 'old');
      await files.write('f.txt', 'new');
      expect(await files.read('f.txt')).toBe('new');
    });
  });

  describe('exists', () => {
    it('returns false for missing files', async () => {
      expect(await files.exists('nope.txt')).toBe(false);
    });

    it('returns true for existing files', async () => {
      await files.write('here.txt', 'present');
      expect(await files.exists('here.txt')).toBe(true);
    });
  });

  describe('stat', () => {
    it('returns stat object for existing file', async () => {
      await files.write('stat.txt', 'content');
      const stat = await files.stat('stat.txt');
      expect(stat.isFile()).toBe(true);
      expect(stat.size).toBeGreaterThan(0);
    });
  });

  describe('mkdir', () => {
    it('creates nested directories', async () => {
      await files.mkdir('x/y/z');
      expect(await files.exists('x/y/z')).toBe(true);
    });
  });

  describe('readdir', () => {
    it('lists directory entries', async () => {
      await files.write('dir/a.txt', '1');
      await files.write('dir/b.txt', '2');
      const entries = await files.readdir('dir');
      expect(entries.toSorted()).toEqual(['a.txt', 'b.txt']);
    });
  });

  describe('glob', () => {
    it('matches files by pattern', async () => {
      await files.write('src/a.js', '1');
      await files.write('src/b.js', '2');
      await files.write('src/c.txt', '3');
      const matches = await files.glob('src/*.js');
      expect(matches.toSorted()).toEqual(['src/a.js', 'src/b.js']);
    });

    it('matches nested patterns with **', async () => {
      await files.write('src/chains/filter/index.js', 'a');
      await files.write('src/chains/sort/index.js', 'b');
      await files.write('src/chains/sort/schema.json', 'c');
      const matches = await files.glob('src/chains/*/index.js');
      expect(matches.toSorted()).toEqual([
        'src/chains/filter/index.js',
        'src/chains/sort/index.js',
      ]);
    });
  });

  describe('remove', () => {
    it('removes files', async () => {
      await files.write('rm.txt', 'bye');
      await files.remove('rm.txt');
      expect(await files.exists('rm.txt')).toBe(false);
    });

    it('removes directories recursively', async () => {
      await files.write('dir/sub/f.txt', 'deep');
      await files.remove('dir');
      expect(await files.exists('dir')).toBe(false);
    });
  });

  describe('copy', () => {
    it('copies a file', async () => {
      await files.write('original.txt', 'data');
      await files.copy('original.txt', 'copied.txt');
      expect(await files.read('copied.txt')).toBe('data');
    });

    it('copies a directory recursively', async () => {
      await files.write('src/a.txt', 'aaa');
      await files.write('src/sub/b.txt', 'bbb');
      await files.copy('src', 'dst');
      expect(await files.read('dst/a.txt')).toBe('aaa');
      expect(await files.read('dst/sub/b.txt')).toBe('bbb');
    });
  });

  describe('move', () => {
    it('moves a file', async () => {
      await files.write('before.txt', 'data');
      await files.move('before.txt', 'after.txt');
      expect(await files.exists('before.txt')).toBe(false);
      expect(await files.read('after.txt')).toBe('data');
    });
  });

  describe('path traversal guard', () => {
    it('rejects ../ traversal that escapes rootDir', () => {
      expect(() => files.read('../../etc/passwd')).toThrow('Path escapes root directory');
    });

    it('rejects absolute paths outside rootDir', () => {
      expect(() => files.read('/etc/passwd')).toThrow('Path escapes root directory');
    });

    it('rejects traversal on write', async () => {
      await expect(files.write('../escape.txt', 'data')).rejects.toThrow(
        'Path escapes root directory'
      );
    });

    it('allows ../ that stays within rootDir', async () => {
      await files.write('a/b/test.txt', 'ok');
      expect(await files.read('a/b/../b/test.txt')).toBe('ok');
    });
  });
});

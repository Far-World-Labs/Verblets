import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import createDataStore from './data-store.js';

describe('createDataStore', () => {
  let basePath;
  let store;

  beforeEach(async () => {
    basePath = await mkdtemp(join(tmpdir(), 'datastore-test-'));
    store = createDataStore(basePath);
  });

  afterEach(async () => {
    await rm(basePath, { recursive: true, force: true });
  });

  describe('get/set', () => {
    it('returns undefined for missing keys', async () => {
      const value = await store.get('nonexistent');
      expect(value).toBeUndefined();
    });

    it('stores and retrieves string values', async () => {
      await store.set('greeting', 'hello world');
      const value = await store.get('greeting');
      expect(value).toBe('hello world');
    });

    it('creates subdirectories for keys with slashes', async () => {
      await store.set('runs/2026-03-31/report', 'data');
      const value = await store.get('runs/2026-03-31/report');
      expect(value).toBe('data');
    });

    it('overwrites existing values', async () => {
      await store.set('key', 'first');
      await store.set('key', 'second');
      expect(await store.get('key')).toBe('second');
    });
  });

  describe('has', () => {
    it('returns false for missing keys', async () => {
      expect(await store.has('missing')).toBe(false);
    });

    it('returns true for existing keys', async () => {
      await store.set('present', 'value');
      expect(await store.has('present')).toBe(true);
    });
  });

  describe('delete', () => {
    it('removes existing keys', async () => {
      await store.set('doomed', 'gone');
      await store.delete('doomed');
      expect(await store.has('doomed')).toBe(false);
    });

    it('does not throw for missing keys', async () => {
      await expect(store.delete('never-existed')).resolves.toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns empty array for empty store', async () => {
      const keys = await store.list();
      expect(keys).toEqual([]);
    });

    it('lists all keys including nested', async () => {
      await store.set('a', '1');
      await store.set('b/c', '2');
      await store.set('b/d', '3');
      const keys = await store.list();
      expect(keys.sort()).toEqual(['a', 'b/c', 'b/d']);
    });

    it('filters by prefix', async () => {
      await store.set('runs/one', '1');
      await store.set('runs/two', '2');
      await store.set('config', '3');
      const keys = await store.list('runs/');
      expect(keys.sort()).toEqual(['runs/one', 'runs/two']);
    });
  });

  describe('getJSON/setJSON', () => {
    it('round-trips JSON objects', async () => {
      const data = { score: 2.5, modules: ['filter', 'sort'] };
      await store.setJSON('report', data);
      const retrieved = await store.getJSON('report');
      expect(retrieved).toEqual(data);
    });

    it('returns undefined for missing JSON keys', async () => {
      expect(await store.getJSON('missing')).toBeUndefined();
    });

    it('returns undefined for invalid JSON', async () => {
      await store.set('bad-json', 'not valid json {{{');
      expect(await store.getJSON('bad-json')).toBeUndefined();
    });

    it('handles nested keys in JSON operations', async () => {
      await store.setJSON('runs/latest/metrics', { count: 42 });
      expect(await store.getJSON('runs/latest/metrics')).toEqual({ count: 42 });
    });
  });

  describe('key sanitization', () => {
    it('handles keys with dots (common in filenames)', async () => {
      await store.set('report.json', '{"ok": true}');
      expect(await store.get('report.json')).toBe('{"ok": true}');
    });

    it('handles deeply nested paths', async () => {
      await store.set('a/b/c/d/e', 'deep');
      expect(await store.get('a/b/c/d/e')).toBe('deep');
    });
  });
});

/**
 * Boring key/value storage backed by local filesystem.
 *
 * Keys are opaque strings. `/` in keys creates subdirectories.
 * Characters unsafe for filenames are percent-encoded.
 *
 * "Reference" means an ordinary in-process JavaScript object reference,
 * not a custom identifier/ref protocol. This store holds persisted data,
 * not live runtime objects.
 */

import { readFile, writeFile, access, unlink, mkdir, readdir, rename } from 'node:fs/promises';
import { resolve, dirname, relative, join } from 'node:path';
import { randomBytes } from 'node:crypto';

// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[<>:"|?*\x00-\x1f]/g;

const sanitizeSegment = (segment) =>
  segment.replace(UNSAFE_CHARS, (ch) => `%${ch.charCodeAt(0).toString(16).padStart(2, '0')}`);

const keyToPath = (basePath, key) => {
  const segments = key.split('/').map(sanitizeSegment);
  return resolve(basePath, ...segments);
};

const ensureDir = async (filePath) => {
  await mkdir(dirname(filePath), { recursive: true });
};

const fileExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const collectKeys = async (dir, prefix, base) => {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const entryPath = join(dir, entry.name);
    const key = relative(base, entryPath);
    if (entry.isDirectory()) {
      const nested = await collectKeys(entryPath, prefix, base);
      results.push(...nested);
    } else if (!prefix || key.startsWith(prefix)) {
      results.push(key);
    }
  }
  return results;
};

export default function createDataStore(basePath) {
  return {
    async get(key) {
      const filePath = keyToPath(basePath, key);
      try {
        return await readFile(filePath, 'utf-8');
      } catch {
        return undefined;
      }
    },

    async set(key, value) {
      const filePath = keyToPath(basePath, key);
      await ensureDir(filePath);
      const tmpPath = `${filePath}.${randomBytes(4).toString('hex')}.tmp`;
      await writeFile(tmpPath, String(value), 'utf-8');
      await rename(tmpPath, filePath);
    },

    has(key) {
      return fileExists(keyToPath(basePath, key));
    },

    async delete(key) {
      try {
        await unlink(keyToPath(basePath, key));
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    },

    list(prefix) {
      return collectKeys(basePath, prefix, basePath);
    },

    async getJSON(key) {
      const raw = await this.get(key);
      if (raw === undefined) return undefined;
      try {
        return JSON.parse(raw);
      } catch {
        return undefined;
      }
    },

    async setJSON(key, value) {
      await this.set(key, JSON.stringify(value, undefined, 2));
    },
  };
}

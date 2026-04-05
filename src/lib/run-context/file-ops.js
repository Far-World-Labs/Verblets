/**
 * Path-based file operations for ctx.lib.files.
 *
 * Explicitly Node.js-like. Uses real path strings. Ordinary libraries
 * can work with real files and normal paths without adapters.
 *
 * All paths are resolved relative to rootDir. Absolute paths and
 * traversal beyond rootDir are rejected.
 */

import {
  readFile,
  writeFile,
  access,
  stat as fsStat,
  mkdir as fsMkdir,
  readdir as fsReaddir,
  rm,
  cp,
  rename,
} from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { glob as globLib } from 'glob';

const guardedResolve = (rootDir, path) => {
  const full = resolve(rootDir, path);
  if (!full.startsWith(`${rootDir}/`) && full !== rootDir) {
    throw new Error(`Path escapes root directory: ${path}`);
  }
  return full;
};

export default function createFileOps(rootDir) {
  const root = resolve(rootDir);

  return {
    read(path) {
      return readFile(guardedResolve(root, path), 'utf-8');
    },

    async write(path, data) {
      const full = guardedResolve(root, path);
      await fsMkdir(dirname(full), { recursive: true });
      const tmpPath = `${full}.${randomBytes(4).toString('hex')}.tmp`;
      await writeFile(tmpPath, data, 'utf-8');
      await rename(tmpPath, full);
    },

    async exists(path) {
      try {
        await access(guardedResolve(root, path));
        return true;
      } catch {
        return false;
      }
    },

    stat(path) {
      return fsStat(guardedResolve(root, path));
    },

    async mkdir(path) {
      await fsMkdir(guardedResolve(root, path), { recursive: true });
    },

    readdir(path) {
      return fsReaddir(guardedResolve(root, path));
    },

    glob(pattern, options = {}) {
      const { cwd = root } = options;
      return globLib(pattern, { cwd, nodir: true });
    },

    async remove(path) {
      await rm(guardedResolve(root, path), { recursive: true, force: true });
    },

    async copy(src, dst) {
      const srcFull = guardedResolve(root, src);
      const dstFull = guardedResolve(root, dst);
      await fsMkdir(dirname(dstFull), { recursive: true });
      await cp(srcFull, dstFull, { recursive: true });
    },

    async move(src, dst) {
      const srcFull = guardedResolve(root, src);
      const dstFull = guardedResolve(root, dst);
      await fsMkdir(dirname(dstFull), { recursive: true });
      try {
        await rename(srcFull, dstFull);
      } catch (err) {
        if (err.code === 'EXDEV') {
          await cp(srcFull, dstFull, { recursive: true });
          await rm(srcFull, { recursive: true });
        } else {
          throw err;
        }
      }
    },
  };
}

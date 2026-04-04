/**
 * Path-based file operations for ctx.lib.files.
 *
 * Explicitly Node.js-like. Uses real path strings. Ordinary libraries
 * can work with real files and normal paths without adapters.
 */

import {
  readFile,
  writeFile,
  access,
  stat as fsStat,
  mkdir as fsMkdir,
  readdir as fsReaddir,
  rm,
  copyFile,
  rename,
} from 'node:fs/promises';
import { resolve, dirname, relative, join } from 'node:path';

const resolvePath = (rootDir, path) => (path.startsWith('/') ? path : resolve(rootDir, path));

export default function createFileOps(rootDir) {
  return {
    read(path) {
      return readFile(resolvePath(rootDir, path), 'utf-8');
    },

    async write(path, data) {
      const full = resolvePath(rootDir, path);
      await fsMkdir(dirname(full), { recursive: true });
      await writeFile(full, data, 'utf-8');
    },

    async exists(path) {
      try {
        await access(resolvePath(rootDir, path));
        return true;
      } catch {
        return false;
      }
    },

    stat(path) {
      return fsStat(resolvePath(rootDir, path));
    },

    async mkdir(path) {
      await fsMkdir(resolvePath(rootDir, path), { recursive: true });
    },

    readdir(path) {
      return fsReaddir(resolvePath(rootDir, path));
    },

    async glob(pattern, options = {}) {
      const { cwd = rootDir } = options;
      const results = [];
      const walk = async (dir, segments) => {
        let entries;
        try {
          entries = await fsReaddir(dir, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          const entryPath = join(dir, entry.name);
          const rel = relative(cwd, entryPath);
          if (entry.isDirectory()) {
            await walk(entryPath, [...segments, entry.name]);
          } else if (matchGlob(rel, pattern)) {
            results.push(rel);
          }
        }
      };
      await walk(cwd, []);
      return results.sort();
    },

    async remove(path) {
      await rm(resolvePath(rootDir, path), { recursive: true, force: true });
    },

    async copy(src, dst) {
      const dstFull = resolvePath(rootDir, dst);
      await fsMkdir(dirname(dstFull), { recursive: true });
      await copyFile(resolvePath(rootDir, src), dstFull);
    },

    async move(src, dst) {
      const srcFull = resolvePath(rootDir, src);
      const dstFull = resolvePath(rootDir, dst);
      await fsMkdir(dirname(dstFull), { recursive: true });
      try {
        await rename(srcFull, dstFull);
      } catch (err) {
        // Cross-device fallback
        if (err.code === 'EXDEV') {
          await copyFile(srcFull, dstFull);
          await rm(srcFull);
        } else {
          throw err;
        }
      }
    },
  };
}

/**
 * Minimal glob matcher supporting * and ** patterns.
 * Handles patterns like 'src/chains/* /index.js' and '**\/*.json'.
 */
function matchGlob(filePath, pattern) {
  const regex = globToRegex(pattern);
  return regex.test(filePath);
}

function globToRegex(pattern) {
  let regex = '';
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === '*' && pattern[i + 1] === '*') {
      // ** matches any number of path segments
      regex += '.*';
      i += 2;
      if (pattern[i] === '/') i++; // skip trailing /
    } else if (ch === '*') {
      // * matches anything except /
      regex += '[^/]*';
      i++;
    } else if (ch === '?') {
      regex += '[^/]';
      i++;
    } else if ('.+^${}()|[]\\'.includes(ch)) {
      regex += `\\${ch}`;
      i++;
    } else {
      regex += ch;
      i++;
    }
  }
  return new RegExp(`^${regex}$`);
}

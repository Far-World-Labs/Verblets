import { readFile } from 'fs/promises';
import { dirname, join } from 'path';

/**
 * Find the project root by looking for package.json
 * @param {string} startDir - Directory to start searching from
 * @returns {Promise<string|null>} Project root directory or null if not found
 */
export async function findProjectRoot(startDir) {
  const MAX_DEPTH = 10;
  let currentDir = startDir;

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    try {
      await readFile(join(currentDir, 'package.json'), 'utf-8');
      return currentDir;
    } catch {
      const parentDir = dirname(currentDir);
      if (parentDir === currentDir || parentDir === '/' || parentDir === '.') {
        break;
      }
      currentDir = parentDir;
    }
  }

  return null;
}

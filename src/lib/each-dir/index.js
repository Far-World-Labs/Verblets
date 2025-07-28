import { glob } from 'glob';
import fs from 'node:fs';

/**
 * Create a target specification for directories matching a glob pattern
 * @param {string} pattern - Glob pattern to match directories
 * @returns {Object} Target specification for aiArchExpect
 */
export default function eachDir(pattern) {
  return {
    type: 'dirs',
    pattern,
    async resolve() {
      // Use glob with onlyDirectories option, but also manually filter
      // to work around potential glob library issues
      let result = await glob(pattern, { onlyDirectories: true });

      // Manual filtering to ensure only directories are returned
      result = result.filter((item) => {
        try {
          return fs.existsSync(item) && fs.statSync(item).isDirectory();
        } catch {
          return false;
        }
      });

      return result;
    },
  };
}

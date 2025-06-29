import { glob } from 'glob';

/**
 * Create a target specification for files matching a glob pattern
 * @param {string} pattern - Glob pattern to match files
 * @returns {Object} Target specification for aiArchExpect
 */
export default function eachFile(pattern) {
  return {
    type: 'files',
    pattern,
    async resolve() {
      const result = await glob(pattern, { onlyFiles: true });
      return result;
    },
  };
}

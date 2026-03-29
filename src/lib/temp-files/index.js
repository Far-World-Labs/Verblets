import { mkdir, mkdtemp, rm, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ENV_KEY = 'VERBLETS_OUTPUT_DIR';

const timestamp = () => new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');

/**
 * Resolve the output base directory.
 *
 * Priority: explicit outputDir > VERBLETS_OUTPUT_DIR env var > undefined (ephemeral).
 */
export const resolveOutputDir = (outputDir) => outputDir || process.env[ENV_KEY];

export async function cleanupPaths(paths) {
  let removed = 0;
  for (const filePath of paths) {
    try {
      await unlink(filePath);
      removed++;
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
  return removed;
}

/**
 * Create a managed temp directory for chain output.
 *
 * Resolution: outputDir > VERBLETS_OUTPUT_DIR > os.tmpdir()
 *
 * Structured mode (outputDir or env set):
 *   {base}/{name}/{timestamp}-{random}/
 *
 * Ephemeral mode (neither set):
 *   {tmpdir}/verblets-{name}-{random}/
 *
 * @param {string} name - Logical name (chain name, automation name)
 * @param {string} [outputDir] - Explicit base directory
 * @returns {Promise<{dir, track, paths, cleanup}>}
 */
export async function createTempDir(name = 'scratch', outputDir) {
  const base = resolveOutputDir(outputDir);
  let dir;

  if (base) {
    const chainDir = join(base, name);
    await mkdir(chainDir, { recursive: true });
    dir = await mkdtemp(join(chainDir, `${timestamp()}-`));
  } else {
    dir = await mkdtemp(join(tmpdir(), `verblets-${name}-`));
  }

  const tracked = [];

  return {
    dir,
    track(filePath) {
      tracked.push(filePath);
    },
    paths() {
      return [...tracked];
    },
    async cleanup() {
      try {
        await cleanupPaths(tracked);
      } catch {
        /* swallow */
      }
      try {
        await rm(dir, { recursive: true, force: true });
      } catch {
        /* swallow */
      }
    },
  };
}

export default createTempDir;

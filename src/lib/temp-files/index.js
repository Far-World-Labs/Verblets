import { mkdir, mkdtemp, rm, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ENV_KEY = 'VERBLETS_OUTPUT_DIR';

const timestamp = () => {
  const now = new Date();
  const iso = now.toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${iso}-${ms}`;
};

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
 *   persistent = true — cleanup() removes tracked files but preserves the directory.
 *
 * Ephemeral mode (neither set):
 *   {tmpdir}/verblets-{name}-{random}/
 *   persistent = false — cleanup() removes everything.
 *
 * @param {string} name - Logical name (chain name, automation name)
 * @param {string} [outputDir] - Explicit base directory
 * @returns {Promise<{dir, persistent, track, paths, cleanup}>}
 */
export async function createTempDir(name = 'scratch', outputDir) {
  const base = resolveOutputDir(outputDir);
  let dir;
  let persistent;

  if (base) {
    const chainDir = join(base, name);
    await mkdir(chainDir, { recursive: true });
    dir = await mkdtemp(join(chainDir, `${timestamp()}-`));
    persistent = true;
  } else {
    dir = await mkdtemp(join(tmpdir(), `verblets-${name}-`));
    persistent = false;
  }

  const tracked = [];

  return {
    dir,
    persistent,
    track(filePath) {
      tracked.push(filePath);
    },
    paths() {
      return [...tracked];
    },
    async cleanup() {
      try {
        await cleanupPaths(tracked);
      } catch (err) {
        console.warn('[temp-files] cleanup error:', err?.message ?? err);
      }
      if (!persistent) {
        try {
          await rm(dir, { recursive: true, force: true });
        } catch (err) {
          console.warn('[temp-files] rm error:', err?.message ?? err);
        }
      }
    },
  };
}

export default createTempDir;

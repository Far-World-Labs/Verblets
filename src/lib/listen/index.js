import os from 'node:os';
import path from 'node:path';
import fsPromises from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const defaultCommands = [
  (duration, file) =>
    `ffmpeg -y -f pulse -i default -t ${duration} -ac 1 -ar 16000 -c:a pcm_s16le ${file}`,
  (duration, file) => `sox -d -c 1 -b 16 -r 16000 ${file} trim 0 ${duration}`,
  (duration, file) => `arecord -d ${duration} -f cd -t wav ${file}`,
];

export default async function listen({ duration = 3, cacheDir, commands = defaultCommands } = {}) {
  const dir =
    cacheDir ||
    process.env.VERBLETS_CACHE_DIR ||
    path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'verblets');
  await fsPromises.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `recording-${Date.now()}.wav`);

  for (const build of commands) {
    const cmd = build(duration, filePath);
    const result = spawnSync(cmd, { shell: true, stdio: 'ignore' });
    if (!result.error && result.status === 0) {
      return filePath;
    }
  }
  throw new Error('No recording command succeeded');
}

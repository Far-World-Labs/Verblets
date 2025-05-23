import { spawnSync } from 'node:child_process';

const defaultCommands = [
  (text) => `tts --text "${text}"`,
  (text) => `echo "${text}" | festival --tts`,
  (text) => `espeak-ng "${text}"`,
  (text) => `spd-say "${text}"`,
  (text) => `say "${text}"`,
  (text) => `espeak "${text}"`,
];

export default function speak(text, { commands = defaultCommands } = {}) {
  const list = process.env.VERBLETS_TTS_CMD
    ? [(t) => `${process.env.VERBLETS_TTS_CMD} "${t}"`]
    : commands;
  for (const build of list) {
    const cmd = build(text);
    const result = spawnSync(cmd, { shell: true, stdio: 'ignore' });
    if (!result.error && result.status === 0) {
      return true;
    }
  }
  throw new Error('No speech command succeeded');
}

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

export default async () => {
  const tempFile = path.join(os.tmpdir(), 'verblets_editor.txt');
  await fs.writeFile(tempFile, '');

  const editor = process.env.EDITOR || 'nano';

  const editorProcess = spawn(editor, [tempFile], {
    stdio: 'inherit',
    shell: true,
  });

  return new Promise((resolve) => {
    editorProcess.on('exit', async () => {
      const content = await fs.readFile(tempFile, 'utf-8');
      resolve(content);

      await fs.unlink(tempFile);
    });
  });
};

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

export default async () => {
  // Create a temporary file for editing
  const tempFile = path.join(os.tmpdir(), 'verblets_editor.txt');
  await fs.writeFile(tempFile, '');

  // Determine the editor to use (use 'nano' as the default editor)
  const editor = process.env.EDITOR || 'nano';

  // Spawn the editor process
  const editorProcess = spawn(editor, [tempFile], {
    stdio: 'inherit',
    shell: true,
  });

  return new Promise((resolve) => {
    // Listen for the editor process exit event
    editorProcess.on('exit', async () => {
      // Read the content of the temporary file and echo it
      const content = await fs.readFile(tempFile, 'utf-8');
      resolve(content);

      // Clean up the temporary file
      await fs.unlink(tempFile);
    });
  });
};

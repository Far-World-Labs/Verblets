import dotenv from 'dotenv/config';
import readline from 'node:readline';
import chatGPT, { auto, bool, getRedis } from '../../src/index.js';
import Transcriber from '../../src/lib/transcribe/index.js';

const operations = [
  {
    name: 'bool',
    fn: ({ text }) => bool(text, { forceQuery: true })
  }
];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.error('Press "r" to start/stop recording. Press "q" to quit.');

// Clean up any previous recordings on startup
await Transcriber.cleanupCache();

let transcriber;
let recordingPromise;
let recording = false;

async function handleText(text) {
  const intentFound = await auto(text, { forceQuery: true });
  const op = operations.find(option => option.name === intentFound.name);
  if (op) {
    const result = await op.fn(...intentFound.functionArgsAsArray);
    console.error(result);
  } else {
    const result = await chatGPT(text);
    console.error(result);
  }
}

rl.on('line', async (input) => {
  const key = input.trim().toLowerCase();
  if (key === 'q') {
    rl.close();
    if (transcriber && recording) {
      transcriber.stopRecording();
      await recordingPromise;
    }
    await (await getRedis()).disconnect();
    await Transcriber.cleanupCache();
    process.exit(0);
  } else if (key === 'r') {
    if (!recording) {
      transcriber = new Transcriber('');
      console.error('Recording...');
      recordingPromise = transcriber.startRecording();
      recording = true;
    } else {
      transcriber.stopRecording();
      const text = await recordingPromise;
      console.error(`\nHeard: ${text}`);
      await handleText(text);
      console.error('\nPress "r" to record again, "q" to quit.');
      recording = false;
    }
  }
});

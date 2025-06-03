import dotenv from 'dotenv/config';
import { Command } from 'commander';

import chatGPT, { getRedis, auto, bool } from '../../src/index.js';
import modelService from '../../src/services/llm-model/index.js';
import edit from '../../src/lib/editor/index.js';
import Transcriber from '../../src/lib/transcribe/index.js';

const program = new Command();
program
  .option('-t, --transcribe', 'Enable audio transcription')
  .option('--no-use-intent', 'Disable intent parsing')
  .option('-p, --privacy', 'Use privacy model if configured')
  .option('-m, --model <modelName>', 'Specify model name to use');

program.parse(process.argv);

const argv = program.opts();

if (argv.privacy) {
  try {
    modelService.setGlobalOverride('modelName', 'privacy');
  } catch (err) {
    console.error(`Privacy model error: ${err.message}`);
  }
}
if (argv.model) {
  try {
    modelService.setGlobalOverride('modelName', argv.model);
  } catch (err) {
    console.error(`Model override error: ${err.message}`);
  }
}

const operations = [
  {
    name: 'bool',
    fn: ({ text }) => {
      return bool(text, { forceQuery: true });
    }
  },
];


let userInput;
const useTranscribe = !!argv.transcribe;
if (useTranscribe) {
  const transcriber = new Transcriber("stopword"); // Replace "stopword" with the word you want to trigger the stop
  userInput = await transcriber.startRecording()
} else {
  userInput = await edit();
}

const useIntent = argv.useIntent !== false;

const commandType = useIntent ? 'Tool selection' : 'Direct ChatGPT';
console.error(`Command: ${commandType}`);
const userInputDisplay = userInput.trim().split('\n')
  .map(line => `| ${line}`)
  .join('\n');

console.error(userInputDisplay);

let result;
if (!useIntent) {
  result = await chatGPT(userInput);
} else {
  const intentFound = await auto(userInput, { forceQuery: true });

  const op = operations.find(option => {
    return option.name === intentFound.name;
  });

  result = await op.fn(...intentFound.functionArgsAsArray);
}

console.error(result);

await (await getRedis()).disconnect();

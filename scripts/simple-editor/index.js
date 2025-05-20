import dotenv from 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import chatGPT, { getRedis, auto, bool } from '../../src/index.js';
import edit from '../../src/lib/editor/index.js';
import Transcriber from '../../src/lib/transcribe/index.js';

const argv = yargs(hideBin(process.argv))
  .option('use-intent', {
    alias: 'i',
    default: 'true',
    type: 'string',
    description: '"false" to disable intent parsing and just use chatGPT',
  })
  .option('transcribe', {
    alias: 't',
    default: 'false',
    type: 'string',
    description: '"true" to enable audio transcription',
  })
  .argv;

const operations = [
  {
    name: 'bool',
    fn: ({ text }) => {
      return bool(text, { forceQuery: true });
    }
  },
];


let userInput;
const useTranscribe = ['true', '1'].includes(argv.transcribe)
if (useTranscribe) {
  const transcriber = new Transcriber("stopword"); // Replace "stopword" with the word you want to trigger the stop
  userInput = await transcriber.startRecording()
} else {
  userInput = await edit();
}

const useIntent = !!['true', '1'].includes(argv.useIntent.toLowerCase())

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

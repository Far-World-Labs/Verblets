import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import edit from '../../src/lib/editor/index.js';
import chatGPT, { getRedis, auto } from '../../src/index.js';

const argv = yargs(hideBin(process.argv))
  .option('use-intent', {
    alias: 'i',
    default: 'true',
    type: 'string',
    description: '"false" to disable intent parsing and just use chatGPT',
  })
  .argv;

const operations = [
  {
    name: 'chatGPT',
    parameters: ['text'],
    operation: ({ text }) => chatGPT(text),
  },
  {
    name: 'auto',
    parameters: ['text'],
    operation: ({ text }) => auto(text, chatGPT),
  },
];

const text = await edit();

const command = !['true', '1'].includes(argv.useIntent.toLowerCase())
  ? { intent: { name: 'ChatGPT', operation: 'completion' }, parameters: { text } }
  : { intent: { name: 'Puck via ChatGPT functions', operation: 'auto' }, parameters: { text } };

const operation = operations
  .find((o) => o.name === command.intent.operation)
  ?.operation;

if (operation) {
  console.error(`Command: ${command.intent.name}`);
  Object.entries(command.parameters ?? {}).forEach((entry) => {
    console.error(`│ ${entry[0]}: ${entry[1]}`);
  });

  const result = await operation(command.parameters);

  console.error(result);
}

await (await getRedis()).disconnect();

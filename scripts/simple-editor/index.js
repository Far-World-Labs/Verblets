import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import edit from '../../src/lib/editor/index.js';
import chatGPT, { getRedis, intent, list } from '../../src/index.js';

const requestTimeout = 30000;

const argv = yargs(hideBin(process.argv))
  .option('use-intent', {
    alias: 'i',
    default: 'true',
    type: 'string',
    description: 'Disable intent parsing and just use chatGPT',
  })
  .argv;

const operations = [
  {
    name: 'completion',
    parameters: ['text'],
    operation: ({ text }) => chatGPT(text, { modelOptions: { requestTimeout }}),
  },
  {
    name: 'list',
    parameters: ['description'],
    operation: ({ description }) => list(description),
  },
];

const text = await edit();

console.error(`${text}`);

const command = !['true', '1'].includes(argv.useIntent.toLowerCase())
  ? { intent: { operation: 'completion' }, parameters: { text } }
  : await intent({
      text,
      operations,
    });

const operation = operations
  .find((o) => o.name === command.intent.operation)
  ?.operation;

if (operation) {
  const result = await operation(command.parameters);

  console.error(`Command: ${command.intent.name}`);
  Object.entries(command.parameters ?? {}).forEach((entry) => {
    console.error(`│ ${entry[0]}: ${entry[1]}`);
  });

  console.error(result);
}

await (await getRedis()).disconnect();

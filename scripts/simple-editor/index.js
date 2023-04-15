import edit from '../../src/lib/editor/index.js';

import chatGPT, { getRedis, intent, list } from '../../src/index.js';

const operations = [{
  name: 'completion',
  parameters: ['text'],
  operation: ({ text }) => chatGPT(text),
}, {
  name: 'list',
  parameters: ['description'],
  operation: ({ description }) => list(description),
}];

const command = await intent({
  text: (await edit()),
  operations,
});

const operation = operations
  .find(o => o.name === command.intent.operation)
  ?.operation;

if (operation) {
  const result = await operation(command.parameters);

  console.error(`Command: ${command.intent.displayName}`);
  Object.entries(command.parameters ?? {})
    .forEach(entry => {
      console.error(`  ${entry[0]}: ${entry[1]}`);
    });

  console.error(`\n${JSON.stringify(result, null, 2)}`);
}

await (await getRedis()).disconnect();

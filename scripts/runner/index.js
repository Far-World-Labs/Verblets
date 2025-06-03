
import chatGPT, {
  getRedis,
  list,
  retry as run,
  schemas,
} from '../../src/index.js';
import modelService from '../../src/services/llm-model/index.js';
import { Command } from 'commander';

const program = new Command();
program
  .option('-p, --privacy', 'Use privacy model if configured')
  .option('-m, --model <modelName>', 'Specify model name to use');

program.parse(process.argv);

const options = program.opts();

if (options.privacy) {
  try {
    modelService.setGlobalOverride('modelName', 'privacy');
  } catch (err) {
    console.error(`Privacy model error: ${err.message}`);
  }
}
if (options.model) {
  try {
    modelService.setGlobalOverride('modelName', options.model);
  } catch (err) {
    console.error(`Model override error: ${err.message}`);
  }
}

await run(async () => {
  const results = await chatGPT('make a list of nintendo games with a schema that includes a title, year, and maybe a couple others of your choice', {
    forceQuery: true,
    modelOptions: {
      tools: schemas
    },
  });

  const functions = {
    list: async (listName, options) => {
      return await list(listName, options);
    }
  };

  if (typeof results === 'string') {
    console.error(results);
    return
  }
  console.error(await functions[results.name](results.arguments.name, results.arguments.options));
}, { maxRetries: 0 });

await (await getRedis()).disconnect();

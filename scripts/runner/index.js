
import llm, {
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
    const sensitiveModel = modelService.getBestPrivateModel();
    modelService.setRules([{ use: sensitiveModel.name }]);
  } catch {
    console.error('Privacy model error: no sensitive model configured');
  }
}
if (options.model) {
  modelService.setRules([{ use: options.model }]);
}

await run(async () => {
  const results = await llm('make a list of nintendo games with a schema that includes a title, year, and maybe a couple others of your choice', {
    forceQuery: true,
    tools: schemas,
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
}, { maxAttempts: 1 });

await (await getRedis()).disconnect();

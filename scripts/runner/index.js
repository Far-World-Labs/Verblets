
import chatGPT, {
  getRedis,
  list,
  retry as run,
  schemas,
} from '../../src/index.js';

await run(async () => {
  const results = await chatGPT('make a list of nintendo games with a schema that includes a title, year, and maybe a couple others of your choice', {
    forceQuery: true,
    modelOptions: {
      functions: schemas
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

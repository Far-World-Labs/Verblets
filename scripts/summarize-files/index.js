import glob from 'glob';
import { readFile } from 'fs/promises';
import SummaryMap from '../../src/chains/summary-map/index.js';
import modelService from '../../src/services/llm-model/index.js';
import { Command } from 'commander';

const program = new Command();
program
  .argument('[globPattern]', 'Glob pattern to summarize', './src/**/*.js')
  .argument('[targetTokens]', 'Target token count', '4097')
  .option('-p, --privacy', 'Use privacy model if configured')
  .option('-m, --model <modelName>', 'Specify model name to use');

program.parse(process.argv);

const options = program.opts();
const [globPattern, targetTokensInput] = program.args;
const targetTokens = Number(targetTokensInput);

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

// Initialize the SummaryMap with the target tokens
const map = new SummaryMap({
    targetTokens: targetTokens
});

glob(globPattern, async (err, files) => {
    if (err) {
        console.error(err);
        return;
    }

    const filePromises = files.map(async (file) => {
        try {
            const content = await readFile(file, 'utf8');
            // Set each file content with its respective filepath as a key
            map.set(file, {
                key: file,
                value: content,
                weight: 1,
                type: 'code'
            });
        } catch (err) {
            console.error(`Error reading file ${file}:`, err);
        }
    });

    // When all file read operations complete
    await Promise.all(filePromises);
    const entries = Array.from(await map.entries());

    // Loop over each key/value and print it to stdout
    for (const [key, value] of entries) {
        console.log(`## ${key}\n`);
        console.log(`\`\`\`js\n${value}\n\`\`\``);
    }
});

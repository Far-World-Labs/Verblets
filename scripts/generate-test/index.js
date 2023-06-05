import fs from 'node:fs/promises';
import path from 'node:path';

import parseJSParts from '../../src/lib/parse-js-parts/index.js';
import
chatGPT,
{
  getRedis,
  SummaryMap
} from '../../src/index.js';

const modulePath = process.argv[2];
const functionName = process.argv[3];

if (!modulePath) {
  console.error('Please specify a module to test.');
  process.exit(1);
}

try {
  await fs.stat(modulePath);
} catch (err) {
  console.error(`Module not found at: ${modulePath}`);
  process.exit(1);
}

const moduleDir = path.dirname(modulePath);
const moduleName = path.basename(moduleDir);
const testFile = path.join(moduleDir, `${moduleName}.spec.js`);

const examplePath1 = './src/lib/parse-js-parts/parse-js-parts.spec.js';

try {
  await fs.stat(examplePath1);
} catch (error) {
  console.error(`Generate test [error]: ${error.message}`);
  process.exit(1);
}

const generatePrompt = ({ moduleFile, modulePath, examples=[] }) => {
  const examplesJoined = examples.map((example) => `<example>${example}</example>`).join('\n');

  let prompt = `Generate a test file for module shown below.

Examples to inform the results:
${examplesJoined}

<module-to-test>${moduleFile}</module-to-test>`;

  return prompt;
}

async function generateTestFile(modulePath) {
  const moduleFile = await fs.readFile(modulePath, 'utf-8');

  const example1 = (await fs.readFile(examplePath1, 'utf-8'));
  // const example2 = await fs.readFile(examplePath2, 'utf-8');

  const fixes = [];
  if (functionName) {
    fixes.push('For the function "${functionName}", keep as much of the code as you can.');
  }

  let functionNameDisplay = '';
  if (functionName) {
    functionNameDisplay = `, only for "${functionName}"`
  }

  let moduleFileSliced = moduleFile;
  if (functionName) {
    const results = parseJSParts(modulePath, moduleFile);

    const funcs = Object.keys(results.functionsMap);
    const funcFound = funcs.find(f => (new RegExp(`${functionName}$`)).test(f));
    const funcDefFound = results.functionsMap?.[funcFound];
    if (funcDefFound) {
      moduleFileSliced = moduleFile.slice(funcDefFound.start, funcDefFound.end);
    }
  }

  const argsMap = new SummaryMap({ promptText: generatePrompt.toString() });

  argsMap.set('functionName', { value: functionName });
  argsMap.set('modulePath', { value: modulePath });
  argsMap.set('moduleFile', {
    value: moduleFileSliced,
    weight: 1,
    type: 'code',
    fixes,
  })
  argsMap.set('examples.0', {
    value: example1,
    weight: 1,
    type: 'code',
    fixes: ['Keep at least one of the example definitions in the example array'],
  })

  const prompt = await generatePrompt(await argsMap.pavedSummaryResult());

  console.error(prompt)

  const response = await chatGPT(prompt);

  // use standard shell IO to apply the generated code
  console.error(response);
}

// Example usage:
await generateTestFile(modulePath);

await (await getRedis()).disconnect();

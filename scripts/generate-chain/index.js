import fs from 'node:fs';
import path from 'node:path';
import {
  camelCase,
  paramCase,
  sentenceCase,
} from 'change-case';

const chainName = process.argv[2];

if (!chainName) {
  console.error('Please specify a chain name.');
  process.exit(1);
}

const chainDir = `./src/chains/${paramCase(chainName)}`;
const indexFile = `${chainDir}/index.js`;
const testFile = `${chainDir}/index.spec.js`;
const exampleFile = `${chainDir}/index.examples.js`;

const createFileIfNotExists = (filePath, fileContent, fileType) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, fileContent);
    console.error(`Created new ${fileType} file: ${filePath}`);
  } else {
    console.error(`Creating ${fileType} file [skipped]: '${filePath}' exists`);
  }
}

// Check if the chain directory already exists
if (!fs.existsSync(chainDir)) {
  // Create the chain directory
  fs.mkdirSync(chainDir, { recursive: true });
}

const indexContent = `
export default async (text) => {
  // TODO: Implement ${paramCase(chainName)} chain
};
`;
createFileIfNotExists(indexFile, indexContent, 'module file');

const testContent = `import { describe, expect, it, vi } from 'vitest';

import ${camelCase(chainName)} from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/prompt text to match/.test(text)) {
      return 'True';
    } else {
      return 'undefined';
    }
  }),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: { text: 'test' },
    want: { result: true }
  }
];

describe('${sentenceCase(chainName)} chain', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const result = await ${camelCase(chainName)}(example.inputs.text);

      if (example.want.typeOfResult) {
        expect(typeof result)
          .toStrictEqual(example.want.typeOfResult);
      }
    });
  });
});
`;
createFileIfNotExists(testFile, testContent, 'test');

const exampleContent = `import { describe, expect, it, vi } from 'vitest';

import ${camelCase(chainName)} from './index.js';

const examples = [
  {
    inputs: { text: 'test' },
    want: { result: true }
  }
];

describe('${sentenceCase(chainName)} chain', () => {
  examples.forEach((example) => {
    it(example.inputs.text, async () => {
      const result = await ${camelCase(chainName)}(example.inputs.text)

      if (example.want.typeOfResult) {
        expect(typeof result)
          .toStrictEqual(example.want.typeOfResult);
      }

      if (example.want.result) {
        expect(result)
          .toStrictEqual(example.want.result);
      }
    });
  });
});
`;
createFileIfNotExists(exampleFile, exampleContent, 'example');

console.error(`Created new chain: ${chainName}`);

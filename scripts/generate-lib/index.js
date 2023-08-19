import fs from 'node:fs';
import {
  camelCase,
  paramCase,
  sentenceCase,
} from 'change-case';

const libName = process.argv[2];

if (!libName) {
  console.error('Please specify a library name.');
  process.exit(1);
}

const libDir = `./src/lib/${paramCase(libName)}`;
const indexFile = `${libDir}/index.js`;
const testFile = `${libDir}/index.spec.js`;

const createFileIfNotExists = (filePath, fileContent, fileType) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, fileContent);
    console.error(`Created new ${fileType} file: ${filePath}`);
  } else {
    console.error(`Creating ${fileType} file [skipped]: '${filePath}' exists`);
  }
}

// Check if the lib directory already exists
if (!fs.existsSync(libDir)) {
  // Create the lib directory
  fs.mkdirSync(libDir, { recursive: true });
}

const indexContent = `
export default async (text) => {
  // TODO: Implement ${paramCase(libName)} lib
};
`;
createFileIfNotExists(indexFile, indexContent, 'module file');

const testContent = `import { describe, expect, it, vi } from 'vitest';

import ${camelCase(libName)} from './index.js';

const examples = [
  {
    name: 'Basic usage',
    inputs: { text: 'test' },
    want: { result: true }
  }
];

describe('${sentenceCase(libName)} lib', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const result = await ${camelCase(libName)}(example.inputs.text);

      if (example.want.typeOfResult) {
        expect(typeof result)
          .toStrictEqual(example.want.typeOfResult);
      }
    });
  });
});
`;
createFileIfNotExists(testFile, testContent, 'test');

console.error(`Created new lib: ${libName}`);

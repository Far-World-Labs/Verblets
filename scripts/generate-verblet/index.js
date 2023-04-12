import fs from 'fs';
import path from 'path';
import {
  camelCase,
  paramCase,
  sentenceCase,
} from 'change-case';

const verbletName = process.argv[2];

if (!verbletName) {
  console.error('Please specify a verblet name.');
  process.exit(1);
}

const verbletDir = `./src/verblets/${paramCase(verbletName)}`;
const indexFile = `${verbletDir}/index.js`;
const readmeFile = `${verbletDir}/README.md`;
const testFile = `${verbletDir}/${paramCase(verbletName)}.spec.js`;
const exampleFile = `${verbletDir}/${paramCase(verbletName)}.examples.js`;

const createFileIfNotExists = (filePath, fileContent, fileType) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, fileContent);
    console.log(`Created new ${fileType} file: ${filePath}`);
  } else {
    console.error(`Creating ${fileType} file [skipped]: '${filePath}' exists`);
  }
}

// Check if the verblet directory already exists
if (!fs.existsSync(verbletDir)) {
  // Create the verblet directory
  fs.mkdirSync(verbletDir, { recursive: true });
}

const indexContent = `
export default async (text) => {
  // TODO: Implement ${paramCase(verbletName)} verblet
};
`;
createFileIfNotExists(indexFile, indexContent, 'module file');

const testContent = `import { describe, expect, it, vi } from 'vitest';

import ${camelCase(verbletName)} from './index.js';

vi.mock('../../lib/openai/completions.js', () => ({
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

describe('${sentenceCase(verbletName)} verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const result = await ${camelCase(verbletName)}(example.inputs.text);

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

import ${camelCase(verbletName)} from './index.js';

const examples = [
  {
    inputs: { text: 'test' },
    want: { result: true }
  }
];

describe('${sentenceCase(verbletName)} verblet', () => {
  examples.forEach((example) => {
    it(example.inputs.text, async () => {
      const result = await ${camelCase(verbletName)}(example.inputs.text)

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

console.log(`Created new verblet: ${verbletName}`);

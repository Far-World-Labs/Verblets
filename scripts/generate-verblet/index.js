import fs from 'fs';
import path from 'path';

const verbletName = process.argv[2];

if (!verbletName) {
  console.error('Please specify a verblet name.');
  process.exit(1);
}

const verbletDir = `./src/verblets/${verbletName}`;
const indexFile = `${verbletDir}/index.js`;
const readmeFile = `${verbletDir}/README.md`;
const testFile = `${verbletDir}/${verbletName}.spec.js`;

// Create the verblet directory
fs.mkdirSync(verbletDir, { recursive: true });

// Create the index.js file
const indexContent = `
export default async function() {
  // TODO: Implement ${verbletName} verblet
}
`;

fs.writeFileSync(indexFile, indexContent);

// Create the test file
const testContent = `
import ${verbletName} from './index.js';

describe('${verbletName} verblet', () => {
  it('should do something', async () => {
    // TODO: Write test for ${verbletName} verblet
  });
});
`;

fs.writeFileSync(testFile, testContent);

console.log(`Created new verblet: ${verbletName}`);

import fs from 'node:fs/promises';

const schemaFileNames = [
  '../verblets/bool/index.schema.json',
  '../chains/list/schema.json',
];

const schemas = await Promise.all(
  schemaFileNames.map(async (schemaFileName) => {
    const schemaText = await fs.readFile(
      new URL(schemaFileName, import.meta.url)
    );
    return JSON.parse(schemaText);
  })
);

export default schemas;

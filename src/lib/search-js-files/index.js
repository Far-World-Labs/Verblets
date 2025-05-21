/* eslint-disable no-await-in-loop */
import fs from 'node:fs/promises';
import path from 'node:path';

import parseJSParts from '../parse-js-parts/index.js';
import search from '../search-best-first/index.js';

export class Node {
  constructor(args) {
    Object.assign(this, args);
  }

  toString() {
    return `${this.filename}:::${this.functionName ?? ''}`;
  }
}

const processLocalImport = async (source) => {
  const importedFile = await fs.readFile(source, 'utf8');
  const parsedImport = parseJSParts(source, importedFile);
  return Object.entries(parsedImport.functionsMap).map(([importKey, importValue]) => ({
    filename: source,
    functionName: importValue?.functionName ?? importKey,
    functionData: importValue,
  }));
};

const processNpmImport = async (source, includeNodeModules = false) => {
  if (!includeNodeModules) return [];

  try {
    const packageJson = JSON.parse(await fs.readFile('./package.json', 'utf8'));
    if (packageJson.dependencies[source] || packageJson.devDependencies[source]) {
      const nodeModulePath = `./node_modules/${source}`;
      const npmPackageJson = JSON.parse(
        await fs.readFile(`${nodeModulePath}/package.json`, 'utf8')
      );
      const mainFilePath = npmPackageJson.main || 'index.js';
      const importedFile = await fs.readFile(`${nodeModulePath}/${mainFilePath}`, 'utf-8');
      const parsedImport = parseJSParts(mainFilePath, importedFile);

      return Object.entries(parsedImport.functionsMap).map(([importKey, importValue]) => ({
        filename: `${nodeModulePath}/${mainFilePath}`,
        functionName: importKey,
        functionData: importValue,
      }));
    }
  } catch (error) {
    console.error(`Process npm import [error]: ${error.message} (source: ${source})`);
  }

  return [];
};

const visitDefault = ({ state }) => {
  if (process.env.NODE_ENV === 'development') {
    // console.error(`Visiting: ${node.filename} - ${node.functionName}`);
  }
  return state;
};

const rank = ({ nodes }) => {
  // Example: Rank by the length of the function name
  return nodes.sort(
    (a, b) => (a.functionName ?? a.filename).length - (b.functionName ?? b.filename).length
  );
};

const prepareNext = async ({ node, includeNodeModules }) => {
  const code = await fs.readFile(node.filename, 'utf-8');
  const parsed = parseJSParts(node.filename, code);

  const functionsFound = Object.entries(parsed.functionsMap).map(([, value]) => {
    return new Node({
      ...value,
      filename: node.filename,
    });
  });

  const importPromises = Object.values(parsed.importsMap).map((importData) => {
    if (
      importData.source.startsWith('./') ||
      importData.source.startsWith('../') ||
      importData.source.startsWith('/')
    ) {
      const resolvedPath = path.resolve(path.dirname(node.filename), importData.source);

      return processLocalImport(resolvedPath);
    }
    return processNpmImport(importData.source, includeNodeModules);
  });

  const importFunctions = await Promise.all(importPromises);
  const importsFound = importFunctions.reduce((acc, importedFuncs) => {
    return [
      ...acc,
      ...importedFuncs.map(
        (f) =>
          new Node({
            ...f,
            ...f.functionData,
            functionData: undefined,
            // not including function names in the imports knowing we will scan the file for them better
            functionName: undefined,
          })
      ),
    ];
  }, []);

  return {
    functions: functionsFound,
    imports: importsFound,
  };
};

const nextDefault = ({ state }) => {
  return state.jsElements.imports.concat(state.jsElements.functions);
};

export default ({
  next: nextExternal = nextDefault,
  node: nodeInitial,
  visit: visitExternal = visitDefault,
  includeNodeModules,
  ...options
}) => {
  return search({
    ...options,
    next: async ({ node, state }) => {
      const jsElements = await prepareNext({ node, includeNodeModules });
      return nextExternal({ node, state: { jsElements, ...state } });
    },
    node: new Node(nodeInitial),
    rank,
    visit: ({ node, state }) => {
      return visitExternal({ node, state });
    },
  });
};

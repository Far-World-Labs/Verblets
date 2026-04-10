import fs from 'node:fs/promises';
import path from 'node:path';

import parseJSParts from '../parse-js-parts/index.js';
import search from '../search-best-first/index.js';

export class Node {
  constructor(args) {
    Object.assign(this, args);
  }

  toString() {
    return `${this.filename}:${this.functionName}`;
  }
}

const processLocalImport = async (source) => {
  const importedFile = await fs.readFile(source, 'utf-8');
  const parsedImport = parseJSParts(source, importedFile);
  return Object.entries(parsedImport.functionsMap).map(([importKey, importValue]) => ({
    filename: source,
    functionName: importValue?.functionName ?? importKey,
    functionData: importValue,
  }));
};

const findProjectRoot = async () => {
  let currentDir = process.cwd();
  while (true) {
    const candidate = path.join(currentDir, 'package.json');
    const exists = await fs
      .access(candidate)
      .then(() => true)
      .catch(() => false);
    if (exists) return currentDir;
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return undefined;
    currentDir = parentDir;
  }
};

const processNpmImport = async (source, includeNodeModules = false) => {
  if (!includeNodeModules) return [];

  const projectRoot = await findProjectRoot();
  if (!projectRoot) return [];

  let packageJson;
  try {
    packageJson = JSON.parse(await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8'));
  } catch {
    return [];
  }

  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  if (!deps[source]) return [];

  const nodeModulePath = path.join(projectRoot, 'node_modules', source);
  let npmPackageJson;
  try {
    npmPackageJson = JSON.parse(
      await fs.readFile(path.join(nodeModulePath, 'package.json'), 'utf8')
    );
  } catch {
    return [];
  }

  const mainFilePath = npmPackageJson.main || 'index.js';
  const fullPath = path.join(nodeModulePath, mainFilePath);
  let importedFile;
  try {
    importedFile = await fs.readFile(fullPath, 'utf-8');
  } catch {
    return [];
  }

  const parsedImport = parseJSParts(mainFilePath, importedFile);
  return Object.entries(parsedImport.functionsMap).map(([importKey, importValue]) => ({
    filename: fullPath,
    functionName: importKey,
    functionData: importValue,
  }));
};

const visitDefault = ({ state }) => {
  return state;
};

const rank = ({ nodes }) => {
  // Example: Rank by the length of the function name
  return nodes.toSorted(
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

  const importResults = await Promise.allSettled(importPromises);
  const importsFound = importResults
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) =>
      r.value.map(
        (f) =>
          new Node({
            ...f,
            ...f.functionData,
            functionData: undefined,
            functionName: undefined,
          })
      )
    );

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

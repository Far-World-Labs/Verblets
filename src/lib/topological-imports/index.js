import { readFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { parse } from 'acorn';
import * as walk from 'acorn-walk';

/**
 * Extract import paths from JavaScript code
 * @param {string} code - JavaScript source code
 * @param {string} filePath - Path of the file being parsed
 * @returns {string[]} Array of resolved import paths
 */
export function extractImports(code, filePath) {
  const imports = [];

  const ast = parse(code, {
    sourceType: 'module',
    ecmaVersion: 'latest',
    allowHashBang: true,
  });

  walk.simple(ast, {
    ImportDeclaration(node) {
      const source = node.source.value;
      if (source.startsWith('.')) {
        const importPath = resolve(dirname(filePath), source);
        imports.push(importPath);
      }
    },
    CallExpression(node) {
      // Handle require() calls
      if (
        node.callee.name === 'require' &&
        node.arguments[0] &&
        node.arguments[0].type === 'Literal'
      ) {
        const source = node.arguments[0].value;
        if (typeof source === 'string' && source.startsWith('.')) {
          const importPath = resolve(dirname(filePath), source);
          imports.push(importPath);
        }
      }
    },
  });

  return imports;
}

/**
 * Build a dependency graph from files
 * @param {string[]} files - Array of file paths
 * @returns {Promise<Map<string, string[]>>} Map of file to its dependencies
 */
export async function buildDependencyGraph(files) {
  const dependencies = new Map();
  const fileSet = new Set(files);

  // Process non-JS files first
  const nonJsFiles = files.filter((f) => !f.endsWith('.js'));
  nonJsFiles.forEach((f) => dependencies.set(f, []));

  // Process JS files in parallel
  const jsFiles = files.filter((f) => f.endsWith('.js'));
  const results = await Promise.all(
    jsFiles.map(async (filePath) => {
      try {
        const content = await readFile(filePath, 'utf-8');
        const imports = extractImports(content, filePath);

        // Normalize and filter imports efficiently
        const normalizedImports = imports
          .map((imp) => (!imp.endsWith('.js') && !imp.endsWith('.json') ? `${imp}.js` : imp))
          .filter((imp) => fileSet.has(imp));

        return [filePath, normalizedImports];
      } catch {
        return [filePath, []];
      }
    })
  );

  // Build map from results
  results.forEach(([file, deps]) => dependencies.set(file, deps));

  return dependencies;
}

/**
 * Topologically sort files based on their dependencies
 * @param {string[]} files - Array of file paths to sort
 * @param {Map<string, string[]>} dependencies - Dependency graph
 * @returns {string[]} Sorted array of file paths
 */
export function topologicalSort(files, dependencies) {
  const sorted = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(file) {
    if (visited.has(file)) return true;
    if (visiting.has(file)) return false; // Cycle detected

    visiting.add(file);

    const deps = dependencies.get(file) || [];
    for (const dep of deps) {
      if (!visit(dep)) {
        // Cycle detected in dependency
        visiting.delete(file);
        return false;
      }
    }

    visiting.delete(file);
    visited.add(file);
    sorted.push(file);
    return true;
  }

  // Visit all files
  for (const file of files) {
    visit(file);
  }

  return sorted;
}

/**
 * Sort files topologically based on import dependencies
 * @param {string[]} files - Array of file paths
 * @returns {Promise<{sorted: string[], cycles: string[]}>} Sorted files and any cycles detected
 */
export default async function sortByImports(files) {
  const dependencies = await buildDependencyGraph(files);
  const sorted = topologicalSort(files, dependencies);

  // Detect cycles (files not in sorted result)
  const cycles = files.filter((f) => !sorted.includes(f));

  return {
    sorted,
    cycles,
    dependencies,
  };
}

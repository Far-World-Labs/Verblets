/**
 * Dependency Analyzer
 * Analyzes import statements to categorize dependencies
 */

// Classify JS file type
export const classifyJsFile = (filename) => {
  if (filename.endsWith('.spec.js')) return 'spec';
  if (filename.endsWith('.examples.js')) return 'examples';
  if (filename.endsWith('.test.js')) return 'test';
  if (filename.endsWith('.js')) return 'source';
  return undefined;
};

// Count JS file types
export const countJsFileTypes = (files) => {
  const counts = { source: 0, spec: 0, examples: 0, test: 0 };

  files.forEach((file) => {
    const type = classifyJsFile(file.name ?? file);
    if (type) counts[type]++;
  });

  return counts;
};

// Classify import path type
export const classifyImport = (importPath) => {
  if (importPath.startsWith('node:')) return 'node-builtin';
  if (importPath.startsWith('.')) return 'local';
  if (importPath.startsWith('/')) return 'absolute';
  if (importPath.startsWith('@')) return 'scoped-package';
  if (importPath.includes('/')) return 'deep-package';
  return 'package';
};

// Check if import is internal to the project
export const isInternalImport = (importPath, projectRoot = '/src') => {
  const type = classifyImport(importPath);
  return type === 'local' || (type === 'absolute' && importPath.includes(projectRoot));
};

// Extract dependencies from file content
export const extractImports = (content) => {
  const imports = [];

  // Match ES6 imports
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  // Match require() calls
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return [...new Set(imports)]; // Remove duplicates
};

// Categorize dependencies from module files or content string
export const analyzeDependencies = (input, _moduleDir) => {
  const categories = {
    node: new Set(),
    package: new Set(),
    internal: new Set(), // Within same module
    external: new Set(), // Other project modules
  };

  // Handle both files array and content string
  const contentToAnalyze =
    typeof input === 'string'
      ? input
      : input
          .filter((f) => f.isMainModule)
          .map((f) => f.content)
          .join('\n');

  if (!contentToAnalyze) {
    return {
      node: [],
      packages: [],
      internal: [],
      external: [],
      summary: { node: 0, pkg: 0, internal: 0, external: 0 },
    };
  }

  const imports = extractImports(contentToAnalyze);
  imports.forEach((imp) => {
    const type = classifyImport(imp);

    if (type === 'node-builtin') {
      const moduleName = imp.replace('node:', '');
      categories.node.add(moduleName);
    } else if (type === 'package' || type === 'deep-package') {
      const packageName = imp.split('/')[0];
      categories.package.add(packageName);
    } else if (type === 'scoped-package') {
      const parts = imp.split('/');
      const packageName = `${parts[0]}/${parts[1]}`;
      categories.package.add(packageName);
    } else if (type === 'local') {
      // Check if it stays within module or goes to external project modules
      const isInternal = imp.startsWith('./') && !imp.includes('../');
      if (isInternal) {
        categories.internal.add(imp);
      } else {
        categories.external.add(imp);
      }
    }
  });

  return {
    node: Array.from(categories.node),
    packages: Array.from(categories.package),
    internal: Array.from(categories.internal),
    external: Array.from(categories.external),
    summary: {
      node: categories.node.size,
      pkg: categories.package.size,
      internal: categories.internal.size,
      external: categories.external.size,
    },
  };
};

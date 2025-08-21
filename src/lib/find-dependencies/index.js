import { readFile, stat } from 'fs/promises';
import { extractImports } from '../topological-imports/index.js';

/**
 * Process a batch of files in parallel to extract their imports
 * @param {string[]} files - Files to process
 * @param {string[]} allowedPaths - Allowed paths for imports
 * @param {Set<string>} allFiles - Set of all discovered files
 * @param {Set<string>} processed - Set of already processed files
 * @returns {Promise<string[]>} New files discovered
 */
async function processBatch(files, allowedPaths, allFiles, processed) {
  const newFiles = [];

  await Promise.all(
    files.map(async (file) => {
      // Skip if already processed or not JS
      if (processed.has(file) || !file.endsWith('.js')) return;

      try {
        const content = await readFile(file, 'utf-8');
        const imports = extractImports(content, file);

        for (let importPath of imports) {
          // Normalize import path
          if (!importPath.endsWith('.js') && !importPath.endsWith('.json')) {
            importPath = `${importPath}.js`;
          }

          // Skip if already found
          if (allFiles.has(importPath)) continue;

          // Check if within allowed paths
          const isAllowed =
            allowedPaths.length === 0 ||
            allowedPaths.some(
              (allowed) => importPath.includes(allowed) && !importPath.includes('node_modules')
            );

          if (isAllowed) {
            try {
              await stat(importPath);
              newFiles.push(importPath);
            } catch {
              // File doesn't exist
            }
          }
        }
      } catch {
        // Error reading file
      }
    })
  );

  return newFiles;
}

/**
 * Recursively find all dependencies from a set of files
 * @param {string[]} startFiles - Initial files to scan
 * @param {Object} options - Options
 * @param {string[]} options.allowedPaths - Paths that are allowed to be included (empty = all local files)
 * @param {number} options.maxDepth - Maximum depth to traverse (default: 10)
 * @returns {Promise<{files: Set<string>, depth: number}>} All files and traversal depth
 */
export default async function findDependencies(startFiles, options = {}) {
  const { allowedPaths = [], maxDepth = 10 } = options;

  const allFiles = new Set(startFiles);
  const processed = new Set();
  let currentBatch = startFiles.filter((f) => f.endsWith('.js'));
  let depth = 0;

  while (currentBatch.length > 0 && depth < maxDepth) {
    // Process current batch in parallel
    const newFiles = await processBatch(currentBatch, allowedPaths, allFiles, processed);

    // Mark current batch as processed
    currentBatch.forEach((f) => processed.add(f));

    // Add new files to allFiles and prepare next batch
    currentBatch = [];
    for (const file of newFiles) {
      if (!allFiles.has(file)) {
        allFiles.add(file);
        currentBatch.push(file);
      }
    }

    depth++;
  }

  return {
    files: allFiles,
    depth,
  };
}

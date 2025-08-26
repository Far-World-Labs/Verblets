import { readFile, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { glob } from 'glob';
import sortByImports from '../../lib/topological-imports/index.js';
import findDependencies from '../../lib/find-dependencies/index.js';

const FILE_PRIORITY = ['AI.md', 'README.md', 'index.js', 'index.spec.js', 'index.examples.js'];
const MAX_FILE_SIZE = 500000;

/**
 * Gather and organize files from a module directory
 * @param {string} moduleDir - The module directory path
 * @param {Object} options - Options
 * @param {string[]} options.additionalModulePaths - Additional module paths to include in dependency crawl
 * @returns {Promise<{content: string, metadata: Object}>}
 */
export async function gatherModuleContext(moduleDir, options = {}) {
  const { additionalModulePaths = [] } = options;
  const files = [];
  const metadata = {
    moduleDir,
    additionalModulePaths,
    fileCount: 0,
    totalSize: 0,
    files: [],
    hasAIGuide: false,
    dependencyCount: 0,
    fileTypeBreakdown: {},
  };

  // Find all .js and .md files in the module directory
  const pattern = join(moduleDir, '*.{js,md}');
  const moduleFiles = await glob(pattern);

  // Find all dependencies recursively
  let allFiles = new Set(moduleFiles);

  if (additionalModulePaths.length > 0) {
    const allowedPaths = [moduleDir, ...additionalModulePaths];
    const { files: foundFiles } = await findDependencies(moduleFiles, { allowedPaths });
    allFiles = foundFiles;
  }

  const allFilesArray = Array.from(allFiles);
  metadata.dependencyCount = allFilesArray.length - moduleFiles.length;

  // Separate JS and MD files
  const jsFiles = allFilesArray.filter((f) => f.endsWith('.js'));
  const mdFiles = allFilesArray.filter((f) => f.endsWith('.md'));

  // Topologically sort ALL JS files
  const { sorted: sortedJsFiles } = await sortByImports(jsFiles);

  // Separate main module files from dependencies
  const mainModuleMdFiles = mdFiles.filter((f) => f.startsWith(moduleDir));
  const mainModuleJsFiles = sortedJsFiles.filter((f) => f.startsWith(moduleDir));
  const dependencyJsFiles = sortedJsFiles.filter((f) => !f.startsWith(moduleDir));

  // Combine: MD files first, then main module JS, then dependencies
  const combinedFiles = [...mainModuleMdFiles, ...mainModuleJsFiles, ...dependencyJsFiles];

  // Apply priority sorting to main module files
  const finalFiles = combinedFiles.sort((a, b) => {
    const aName = basename(a);
    const bName = basename(b);
    const aIsMain = a.startsWith(moduleDir);
    const bIsMain = b.startsWith(moduleDir);

    // Main module files come first
    if (aIsMain && !bIsMain) return -1;
    if (!aIsMain && bIsMain) return 1;

    // Within main module, use priority
    if (aIsMain && bIsMain) {
      const aIndex = FILE_PRIORITY.indexOf(aName);
      const bIndex = FILE_PRIORITY.indexOf(bName);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
    }

    // Keep topological order
    return combinedFiles.indexOf(a) - combinedFiles.indexOf(b);
  });

  // Read and compile files in parallel
  const fileContents = await Promise.all(
    finalFiles.map(async (filePath) => {
      try {
        const stats = await stat(filePath);
        if (stats.size <= MAX_FILE_SIZE) {
          const content = await readFile(filePath, 'utf-8');
          const fileName = basename(filePath);
          const isMainModule = filePath.startsWith(moduleDir);
          const relPath = isMainModule ? fileName : filePath.replace(`${process.cwd()}/`, '');

          return {
            content,
            fileName,
            relPath,
            fullPath: filePath,
            size: stats.size,
            isMainModule,
          };
        }
      } catch {
        // Skip file on error
      }
      return null;
    })
  );

  // Compile results
  for (const fileData of fileContents) {
    if (!fileData) continue;

    const separator = `\n\n${'='.repeat(70)}\n`;
    const fileHeader = `FILE: ${fileData.relPath}\n${'-'.repeat(70)}`;

    files.push(`${separator}${fileHeader}\n\n${fileData.content}`);

    metadata.files.push({
      name: fileData.fileName,
      path: fileData.fullPath, // Use full path for location calculations
      size: fileData.size,
      isMainModule: fileData.isMainModule,
      content: fileData.content,
    });
    metadata.totalSize += fileData.size;
    metadata.fileCount++;

    // Track file type breakdown
    const extension = fileData.fileName.split('.').pop().toLowerCase();
    metadata.fileTypeBreakdown[extension] = (metadata.fileTypeBreakdown[extension] || 0) + 1;

    if (fileData.fileName === 'AI.md' && fileData.isMainModule) {
      metadata.hasAIGuide = true;
    }
  }

  return {
    content: files.join(''),
    metadata,
  };
}

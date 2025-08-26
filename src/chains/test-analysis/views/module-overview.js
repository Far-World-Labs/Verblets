/**
 * Module Overview View
 * Builds and renders module overview
 */

import { cyan, bold } from '../output-utils.js';

export function renderModuleOverview(moduleContext) {
  const fileInfo = Object.entries(moduleContext.fileTypes ?? {})
    .map(([ext, count]) => `${count} ${ext}`)
    .join(', ');

  const title = bold(cyan('MODULE OVERVIEW'));

  // Build JS file breakdown if available
  const jsTypes = moduleContext.jsFileTypes ?? {};
  const jsInfo = jsTypes.source
    ? ` (${jsTypes.source} source, ${jsTypes.spec ?? 0} spec, ${jsTypes.examples ?? 0} examples)`
    : '';

  // Build dependency breakdown if available
  const deps = moduleContext.dependencies?.summary ?? {};
  const depInfo =
    deps.node !== undefined
      ? ` (node: ${deps.node}, pkg: ${deps.pkg}, internal: ${deps.internal}, external: ${deps.external})`
      : '';

  // Build package list if available
  const packages = moduleContext.dependencies?.packages ?? [];
  const packageList = packages.length > 0 ? `\n      Packages:     ${packages.join(', ')}` : '';

  const output = `${title}
      Path:         ${moduleContext.moduleDir}
      Files:        ${moduleContext.fileCount} (${fileInfo ?? 'none'})${jsInfo}
      Dependencies: ${moduleContext.dependencyCount}${depInfo}${packageList}${
    moduleContext.hasAIGuide ? '\n      AI Guide:     ✓ AI.md present' : ''
  }`;

  return output;
}

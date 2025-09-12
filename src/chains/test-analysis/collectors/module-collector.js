/**
 * Module Collector
 * Gathers module context and metadata
 */

import { gatherModuleContext } from '../module-context-gatherer.js';
import { analyzeDependencies, countJsFileTypes } from '../utils/dependency-analyzer.js';

const emptyContext = (moduleDir) => ({
  moduleDir,
  fileCount: 0,
  fileTypes: {},
  jsFileTypes: {},
  dependencies: {},
  dependencyCount: 0,
  totalSize: 0,
  content: '',
  hasAIGuide: false,
  files: [],
});

export class ModuleCollector {
  processEvent(_event) {
    // Could track module-level events if needed
  }

  reset() {
    // Module collector doesn't store state currently
    // Method added for consistency with other collectors
  }

  async gatherContext(moduleDir, options = {}) {
    const fallback = emptyContext(moduleDir);

    try {
      const { content, metadata } = await gatherModuleContext(moduleDir, options);
      if (!metadata) return fallback;

      // Analyze dependencies from imports (use content string for better performance)
      const dependencies = analyzeDependencies(content ?? '', moduleDir);

      // Count JS file types
      const jsFileTypes = countJsFileTypes(metadata.files ?? []);

      return {
        moduleDir: metadata.moduleDir ?? moduleDir,
        fileCount: metadata.fileCount ?? 0,
        fileTypes: metadata.fileTypeBreakdown ?? {},
        jsFileTypes,
        dependencies,
        dependencyCount: metadata.dependencyCount ?? 0,
        totalSize: metadata.totalSize ?? 0,
        content: content ?? '',
        hasAIGuide: metadata.hasAIGuide ?? false,
        files: metadata.files ?? [],
      };
    } catch (error) {
      console.error('Failed to gather module context:', error.message);
      return fallback;
    }
  }
}

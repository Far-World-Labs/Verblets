import { glob } from 'glob';

/**
 * Assert that documentation coverage meets a minimum threshold
 * @param {number} threshold - Minimum percentage of files that should have documentation (0-100)
 * @param {Object} options - Configuration options
 * @param {string} options.sourcePattern - Glob pattern for source files
 * @param {string} options.docPattern - Glob pattern for documentation files
 * @param {string} options.cwd - Working directory for glob patterns
 * @returns {Promise<Object>} Assertion result
 */
export async function documentationCoverage(threshold, options = {}) {
  const {
    sourcePattern = 'src/**/*.js',
    docPattern = 'docs/**/*.md',
    cwd = process.cwd(),
  } = options;

  try {
    console.log('Debug: Starting documentation coverage check');
    console.log('Debug: sourcePattern:', sourcePattern);
    console.log('Debug: docPattern:', docPattern);
    console.log('Debug: cwd:', cwd);

    // Get source files
    const sourceFiles = await glob(sourcePattern, { cwd });
    console.log('Debug: sourceFiles result:', sourceFiles);
    console.log('Debug: sourceFiles type:', typeof sourceFiles);
    console.log('Debug: sourceFiles length:', sourceFiles?.length);

    // Get documentation files
    const docFiles = await glob(docPattern, { cwd });
    console.log('Debug: docFiles result:', docFiles);
    console.log('Debug: docFiles type:', typeof docFiles);
    console.log('Debug: docFiles length:', docFiles?.length);

    if (!Array.isArray(sourceFiles) || !Array.isArray(docFiles)) {
      throw new Error('Glob patterns did not return arrays');
    }

    // Calculate coverage
    const totalFiles = sourceFiles.length;
    const documentedFiles = docFiles.length;
    const coverage = totalFiles > 0 ? (documentedFiles / totalFiles) * 100 : 0;

    console.log(`Debug: Total source files: ${totalFiles}`);
    console.log(`Debug: Documentation files: ${documentedFiles}`);
    console.log(`Debug: Coverage: ${coverage}%`);

    const passed = coverage >= threshold;

    return {
      passed,
      message: passed
        ? `Documentation coverage is ${coverage.toFixed(1)}% (meets ${threshold}% threshold)`
        : `Documentation coverage is ${coverage.toFixed(1)}% (below ${threshold}% threshold)`,
      details: {
        coverage: coverage.toFixed(1),
        threshold,
        totalFiles,
        documentedFiles,
        sourceFiles,
        docFiles,
      },
    };
  } catch (error) {
    console.error('Debug: Error in documentationCoverage:', error);
    return {
      passed: false,
      message: `Documentation coverage check failed: ${error.message}`,
      details: { error: error.message },
    };
  }
}

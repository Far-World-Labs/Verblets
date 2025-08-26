/**
 * Prompt Utilities
 * Composable functions for working with prompts in code
 */

import { extractStrings } from '../../lib/extract-strings/index.js';
import { mapScore } from '../score/index.js';
import map from '../map/index.js';
import { findProjectRoot } from '../../lib/find-project-root/index.js';

// ========================================
// Extraction
// ========================================

/**
 * Extract all strings from module files
 */
export function extractAllStrings(moduleContext, options = {}) {
  const {
    fileFilter = (f) => f.name?.endsWith('.js') && f.isMainModule && f.content,
    includeContext = true,
  } = options;

  const jsFiles = (moduleContext.files || []).filter(fileFilter);

  return jsFiles.flatMap((file) => {
    try {
      const strings = extractStrings(file.content, {
        withNearestFunction: includeContext,
      });

      // Debug: Log extracted strings
      if (process.env.VERBLETS_DEBUG) {
        console.log(
          `[DEBUG] Extracted ${strings.length} strings from ${file.name} (main: ${file.isMainModule})`
        );
        // Look for multi-line strings specifically
        const multiLineStrings = strings.filter((s) => s.text.split('\n').length > 5);
        if (multiLineStrings.length > 0) {
          console.log(`  Found ${multiLineStrings.length} multi-line strings (>5 lines)`);
          multiLineStrings.slice(0, 2).forEach((s) => {
            const lines = s.text.split('\n').length;
            console.log(
              `    - Line ${s.start?.line}: ${lines} lines, starts with: "${s.text
                .split('\n')[0]
                .substring(0, 40)}..."`
            );
          });
        }
      }

      return strings.map((s) => ({
        ...s,
        file: file.name,
        filePath: file.path,
        isMainModule: file.isMainModule,
      }));
    } catch (error) {
      console.error(`Failed to parse ${file.name}:`, error.message);
      return [];
    }
  });
}

/**
 * Add normalized text to strings
 */
export function normalizeStrings(strings) {
  return strings.map((s) => ({
    ...s,
    normalizedText: s.text.replace(/\n+/g, ' ').trim(),
  }));
}

// ========================================
// Formatting
// ========================================

/**
 * Format strings with contextual information for LLM analysis
 */
export function formatStringsWithContext(strings, includeMultiline = false) {
  return strings.map((s) => {
    const functionContext = s.parentFunction ? ` [in ${s.parentFunction.name}]` : '';
    const text = includeMultiline ? s.text : s.normalizedText || s.text;

    // For multi-line strings, show first 3 and last 2 lines
    if (includeMultiline && text.split('\n').length > 5) {
      const lines = text.split('\n');
      const preview = [...lines.slice(0, 3), '...', ...lines.slice(-2)].join('\n');
      return `[${s.file}${functionContext}] ${preview}`;
    }

    return `[${s.file}${functionContext}] ${text}`;
  });
}

// ========================================
// Scoring
// ========================================

/**
 * Score strings for prompt likelihood
 */
export async function scoreForPromptLikelihood(strings, modelName) {
  // Format strings with context but WITHOUT file path for unbiased scoring
  const formatted = strings.map((s) => {
    const functionContext = s.parentFunction ? `[in function ${s.parentFunction.name}] ` : '';
    // Always send full text for accurate scoring
    return functionContext + s.text;
  });

  const instructions = `Score how likely each string is to be an LLM prompt or significant prompt component.

HIGHEST SCORES (9-10):
- Prompts that implement core functionality
- Prompts with theoretical frameworks, cognitive models, or domain expertise
- Multi-line instructions that guide primary AI behavior

HIGH SCORES (7-8):
- Complete prompt templates with clear task definitions
- Prompts that guide complex evaluation or analysis

MEDIUM SCORES (4-6):
- Test descriptions from test files
- Supporting functionality prompts
- OUTPUT specifications that define expected format
- Prompt fragments assembled into larger prompts

LOW SCORES (0-3):
- Single variable placeholders without content
- Error messages, logs, imports, paths
- Simple labels or identifiers

Core functionality scores higher than tests or supporting functionality.
Actual prompt content scores higher than placeholders or fragments.`;

  const scores = await mapScore(formatted, instructions, {
    llm: { modelName },
  });

  // Attach scores back to strings with their file information
  return strings.map((str, i) => ({
    ...str,
    score: scores[i],
  }));
}

/**
 * Score strings for enhancement potential
 */
export async function scoreForEnhancementPotential(strings, modelName) {
  const formatted = formatStringsWithContext(strings);

  const instructions = `Score how much each prompt would benefit from enhancement.

Higher scores (8-10) for:
- Complex instructions with implicit requirements
- Prompts lacking structure or clear specifications
- Templates that could use better organization
- Prompts generating technical content without domain expertise

Lower scores (0-4) for:
- Already well-structured prompts
- Simple queries that don't need enhancement
- Test assertions or basic validations
- Non-prompt strings`;

  const scores = await mapScore(formatted, instructions, {
    llm: { modelName },
  });

  return strings.map((str, i) => ({
    ...str,
    enhancementScore: scores[i],
  }));
}

// ========================================
// Filtering
// ========================================

/**
 * Filter strings by score threshold
 */
export function filterByScore(strings, threshold = 7, scoreField = 'score') {
  return strings.filter((s) => s[scoreField] >= threshold);
}

// ========================================
// Sorting
// ========================================

/**
 * Sort by score (highest first)
 */
export function sortByScore(strings, scoreField = 'score') {
  return [...strings].sort((a, b) => (b[scoreField] || 0) - (a[scoreField] || 0));
}

// ========================================
// Selection
// ========================================

/**
 * Get top N strings
 */
export function selectTop(strings, n = 5) {
  return strings.slice(0, n);
}

/**
 * Get single best match
 */
export function selectBest(strings) {
  return strings[0];
}

// ========================================
// Analysis
// ========================================

/**
 * Analyze prompts with custom query
 */
export async function analyzePrompts(strings, query, modelName) {
  const texts = strings.map((s) => s.normalizedText || s.text);

  return await map(texts, query, {
    llm: { modelName },
  });
}

// ========================================
// Location
// ========================================

/**
 * Build location string for a prompt (project-relative)
 */
export async function getLocation(str, moduleDir) {
  const projectRoot = await findProjectRoot(moduleDir || str.filePath);

  // Remove project root and any leading slash
  const relativePath = str.filePath.startsWith(projectRoot)
    ? str.filePath.slice(projectRoot.length).replace(/^\//, '')
    : str.filePath;

  return `${relativePath}:${str.start?.line || 0}`;
}

/**
 * Build location map for strings
 */
export async function buildLocationMap(strings, moduleDir) {
  const locations = {};
  await Promise.all(
    strings.map(async (str, i) => {
      const key = `String ${i + 1}`;
      locations[key] = await getLocation(str, moduleDir);
    })
  );
  return locations;
}

// ========================================
// Statistics
// ========================================

/**
 * Get score distribution
 */
export function getScoreDistribution(strings, scoreField = 'score') {
  return strings.reduce((dist, str) => {
    const score = Math.round(str[scoreField] || 0);
    dist[score] = (dist[score] || 0) + 1;
    return dist;
  }, {});
}

/**
 * Count prompts by file
 */
export function countByFile(strings) {
  const counts = {};
  strings.forEach((s) => {
    // Use full path if available to distinguish between modules
    const key = s.filePath || s.file;
    if (!counts[key]) counts[key] = 0;
    counts[key]++;
  });
  return counts;
}

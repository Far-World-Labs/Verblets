/**
 * audit-gather.mjs — Phases 1-2: Discover chain files, gather metadata, pre-check
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import scanFile from '../../src/lib/parse-js-parts/index.js';
import searchBestFirst from '../../src/lib/search-best-first/index.js';
import {
  CHAINS_DIR, SHARED_CONFIG_PARAMS, INTERNAL_PARAMS, ALL_DIMENSIONS,
  classifyTier, fileExists,
} from './audit-shared.mjs';

// ============================================================
// File discovery
// ============================================================

/**
 * Crawl a chain's local imports using search-best-first.
 * Starts from entryPath (index.js), follows relative imports that stay
 * within chainDir, and returns a map of filepath -> source content.
 */
async function discoverChainFiles(entryPath, chainDir) {
  const result = await searchBestFirst({
    node: entryPath,
    next: async ({ node, state }) => {
      const content = state.files?.[node];
      if (!content) return [];

      const nextFiles = [];
      const importRegex = /from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        // Only follow relative imports
        if (!importPath.startsWith('./') && !importPath.startsWith('../')) continue;

        const resolved = join(dirname(node), importPath);
        // Only follow imports within the chain directory
        if (!resolved.startsWith(chainDir + '/') && resolved !== chainDir) continue;

        // Try with .js extension
        const withJs = resolved.endsWith('.js') ? resolved : `${resolved}.js`;
        if (await fileExists(withJs)) {
          nextFiles.push(withJs);
          continue;
        }
        // Try as directory/index.js
        const asIndex = join(resolved, 'index.js');
        if (await fileExists(asIndex)) {
          nextFiles.push(asIndex);
        }
      }
      return nextFiles;
    },
    rank: ({ nodes }) => nodes,
    visit: async ({ node, state }) => {
      try {
        const content = await readFile(node, 'utf-8');
        return { ...state, files: { ...state.files, [node]: content } };
      } catch {
        return state;
      }
    },
    state: { files: {} },
  });
  return result.files || {};
}

// ============================================================
// Import extraction
// ============================================================

/**
 * Extract external imports (lib/, prompts/, verblets/, chains/) from source.
 */
function extractImportsFromSource(source) {
  const imports = {};
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(source)) !== null) {
    const importPath = match[1];
    const libMatch = importPath.match(/lib\/([^/]+)/);
    if (libMatch) imports[`lib/${libMatch[1]}`] = true;
    else if (importPath.includes('/prompts/')) imports['prompts'] = true;
    else if (importPath.includes('/verblets/')) {
      const name = importPath.match(/verblets\/([^/]+)/)?.[1];
      if (name) imports[`verblets/${name}`] = true;
    } else if (importPath.includes('/chains/')) {
      const name = importPath.match(/chains\/([^/]+)/)?.[1];
      if (name) imports[`chains/${name}`] = true;
    }
  }
  return imports;
}

// ============================================================
// Source content building
// ============================================================

/**
 * Build composite source content from discovered files.
 * For single-file chains: just the index.js content.
 * For multi-file chains: index.js + file manifest + largest implementation files.
 */
function buildSourceContent(discoveredFiles, chainDir) {
  const entries = Object.entries(discoveredFiles);
  if (entries.length <= 1) {
    return entries.length === 1 ? entries[0][1] : '';
  }

  const relPath = (p) => p.replace(chainDir + '/', '');

  // File manifest sorted by LOC descending
  const fileSummaries = entries
    .map(([path, content]) => ({
      rel: relPath(path),
      lines: content.split('\n').length,
      content,
      isIndex: path.endsWith('/index.js') && relPath(path) === 'index.js',
    }))
    .sort((a, b) => b.lines - a.lines);

  const indexFile = fileSummaries.find((f) => f.isIndex);
  const otherFiles = fileSummaries.filter((f) => !f.isIndex);
  const totalLines = fileSummaries.reduce((sum, f) => sum + f.lines, 0);

  const manifest = fileSummaries
    .map((f) => `  ${f.rel} (${f.lines} LOC)`)
    .join('\n');

  let result = '';
  if (indexFile) {
    result += `=== index.js (entry point, ${indexFile.lines} LOC) ===\n${indexFile.content}\n\n`;
  }
  result += `=== FILE MANIFEST (${entries.length} files, ${totalLines} total LOC) ===\n${manifest}\n\n`;

  // Append largest implementation files until budget exhausted
  const SOURCE_BUDGET = 10000;
  let remaining = SOURCE_BUDGET - result.length;

  for (const file of otherFiles) {
    const block = `=== ${file.rel} (${file.lines} LOC) ===\n${file.content}\n\n`;
    if (block.length <= remaining) {
      result += block;
      remaining -= block.length;
    } else if (remaining > 200) {
      const truncLen = remaining - 80;
      result += `=== ${file.rel} (${file.lines} LOC, truncated) ===\n${file.content.slice(0, truncLen)}\n...(truncated)\n\n`;
      break;
    } else {
      break;
    }
  }

  return result;
}

// ============================================================
// Export extraction
// ============================================================

/**
 * Extract named exports and detect default export from index.js.
 * Uses parse-js-parts AST first, then regex fallback for declarations
 * and re-export patterns that the parser may miss.
 */
function extractExports(indexPath, indexSource) {
  let parsed;
  try {
    parsed = scanFile(indexPath, indexSource);
  } catch {
    parsed = { exportsMap: {}, functionsMap: {} };
  }

  const exports = [];
  let hasDefault = false;
  for (const [name] of Object.entries(parsed.exportsMap)) {
    if (name === 'default') hasDefault = true;
    else exports.push(name);
  }

  // Regex fallback: `export function foo` / `export const bar`
  const exportRegex = /export\s+(?:async\s+)?function\s+(\w+)|export\s+(?:const|let|var)\s+(\w+)/g;
  const exportSet = new Set(exports);
  let expMatch;
  while ((expMatch = exportRegex.exec(indexSource)) !== null) {
    const name = expMatch[1] || expMatch[2];
    if (name && !exportSet.has(name)) {
      exports.push(name);
      exportSet.add(name);
    }
  }

  // Regex fallback: `export { name1, name2 }` re-export patterns
  const reExportRegex = /export\s*\{([^}]+)\}/g;
  let reExpMatch;
  while ((reExpMatch = reExportRegex.exec(indexSource)) !== null) {
    const names = reExpMatch[1].split(',').map(n => n.trim().split(/\s+as\s+/).pop().trim());
    for (const name of names) {
      if (name && name !== 'default' && !exportSet.has(name)) {
        exports.push(name);
        exportSet.add(name);
      }
    }
  }

  return { exports, hasDefault };
}

// ============================================================
// Config param extraction
// ============================================================

/**
 * Scan all source files for config/options destructuring patterns.
 * Returns { configParams, chainSpecificParams }.
 */
function extractConfigParams(allSources) {
  const configParams = [];
  const configParamSet = new Set();

  for (const content of allSources) {
    const destructurePattern = /(?:const|let)\s*\{([^}]+)\}\s*=\s*(?:config|options|rest)/g;
    let paramMatch;
    while ((paramMatch = destructurePattern.exec(content)) !== null) {
      const cleaned = paramMatch[1].replace(/\/\/[^\n]*/g, '').replace(/\/\*.*?\*\//g, '');
      const params = cleaned.split(',').map(p => p.trim()).filter(Boolean);
      for (const param of params) {
        const name = param.split('=')[0].trim().replace(/^\.\.\./, '');
        const isSpread = param.trim().startsWith('...');
        if (!isSpread && name && /^[a-zA-Z_$]/.test(name) && !configParamSet.has(name)) {
          configParams.push(name);
          configParamSet.add(name);
        }
      }
    }
  }

  const chainSpecificParams = configParams.filter(
    p => !SHARED_CONFIG_PARAMS.has(p) && !INTERNAL_PARAMS.has(p)
  );

  return { configParams, chainSpecificParams };
}

// ============================================================
// Test file detection
// ============================================================

/**
 * Detect test files and aiExpect usage for a chain directory.
 */
async function detectTestFiles(dir) {
  const hasSpec = await fileExists(join(dir, 'index.spec.js'));
  const hasExamples = await fileExists(join(dir, 'index.examples.js'));
  let usesAiExpect = false;
  if (hasExamples) {
    try {
      const exampleSource = await readFile(join(dir, 'index.examples.js'), 'utf-8');
      usesAiExpect = exampleSource.includes('aiExpect') || exampleSource.includes('wrapAiExpect');
    } catch {
      // ignore
    }
  }
  return { hasSpec, hasExamples, usesAiExpect };
}

// ============================================================
// Phase 1: Gather
// ============================================================

export async function gatherChains(chainFilter, tierFilter) {
  const entries = await readdir(CHAINS_DIR, { withFileTypes: true });
  const chains = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const tier = classifyTier(entry.name);
    if (tierFilter && tier !== tierFilter) continue;
    if (chainFilter && !chainFilter.includes(entry.name)) continue;

    const dir = join(CHAINS_DIR, entry.name);
    const indexPath = join(dir, 'index.js');

    let indexSource;
    try {
      indexSource = await readFile(indexPath, 'utf-8');
    } catch {
      continue; // skip directories without index.js
    }

    let readme;
    try {
      readme = await readFile(join(dir, 'README.md'), 'utf-8');
    } catch {
      readme = undefined;
    }

    // Discover all source files by following local imports from index.js
    const discoveredFiles = await discoverChainFiles(indexPath, dir);
    const allSources = Object.values(discoveredFiles);
    const fileCount = Object.keys(discoveredFiles).length;
    const totalLines = allSources.reduce((sum, s) => sum + s.split('\n').length, 0);

    // Aggregate external imports across ALL discovered files
    const imports = {};
    for (const content of allSources) {
      Object.assign(imports, extractImportsFromSource(content));
    }

    const source = buildSourceContent(discoveredFiles, dir);
    const { exports, hasDefault } = extractExports(indexPath, indexSource);
    const { configParams, chainSpecificParams } = extractConfigParams(allSources);
    const hasSpecPattern = exports.some(e => e.endsWith('Spec') || e.endsWith('spec'));
    const testFiles = await detectTestFiles(dir);
    const usesProcessEnv = allSources.some(s => s.includes('process.env'));

    if (fileCount > 1) {
      console.log(`    ${entry.name}: discovered ${fileCount} files (${totalLines} LOC)`);
    }

    chains.push({
      name: entry.name,
      tier,
      source,
      readme: readme ? readme.slice(0, 4000) : undefined,
      hasReadme: readme !== undefined,
      sourceLines: totalLines,
      fileCount,
      imports,
      exports,
      hasDefault,
      configParams,
      chainSpecificParams,
      hasSpecPattern,
      usesProcessEnv,
      testFiles,
    });
  }

  return chains;
}

// ============================================================
// Phase 2: Pre-check (deterministic ceilings)
// ============================================================

export function computeCeilings(chain) {
  const ceilings = {};
  const imports = chain.imports;

  // Logging: no lifecycle-logger -> ceiling <= 2
  if (!imports['lib/lifecycle-logger']) {
    ceilings.logging = 2;
  }

  // Events: no progress-callback -> ceiling <= 1
  if (!imports['lib/progress-callback']) {
    ceilings.events = 1;
  }

  // Token management: no text-batch -> ceiling <= 1
  if (!imports['lib/text-batch']) {
    ceilings['token-management'] = 1;
  }

  // Browser-server: uses process.env directly -> ceiling <= 1
  if (chain.usesProcessEnv) {
    ceilings['browser-server'] = 1;
  }

  // Composability: no *Spec export -> ceiling <= 2
  if (!chain.hasSpecPattern) {
    ceilings.composability = 2;
  }

  // Testing: no spec + no examples -> ceiling 0
  if (!chain.testFiles.hasSpec && !chain.testFiles.hasExamples) {
    ceilings.testing = 0;
  } else if (!chain.testFiles.hasSpec) {
    ceilings.testing = 2;
  }

  // Errors-retry: no retry import -> ceiling <= 1
  if (!imports['lib/retry']) {
    ceilings['errors-retry'] = 1;
  }

  // Documentation: no README -> ceiling 0
  if (!chain.hasReadme) {
    ceilings.documentation = 0;
  }

  return ceilings;
}

export function extractDeterministicFindings(chains, dimensionFilter) {
  const findings = [];
  for (const chain of chains) {
    if (chain.ceilings.documentation === 0 &&
        (!dimensionFilter || dimensionFilter.includes('documentation'))) {
      findings.push({
        chain: chain.name, tier: chain.tier, dimension: 'documentation',
        phase: 'deterministic', level: 0,
        evidence: 'No README.md file exists in the chain directory',
        gap: 'Create README.md with description, API section, parameter table, example',
        nextAction: 'Create README.md following the project README template',
      });
    }
    if (chain.ceilings.testing === 0 &&
        (!dimensionFilter || dimensionFilter.includes('testing'))) {
      findings.push({
        chain: chain.name, tier: chain.tier, dimension: 'testing',
        phase: 'deterministic', level: 0,
        evidence: 'No .spec.js or .examples.js test files found',
        gap: 'Add example tests covering basic functionality',
        nextAction: 'Create index.examples.js with vitest core wrappers',
      });
    }
  }
  return findings;
}

export function preCheck(chains, dimensionFilter) {
  return chains.map(chain => {
    const ceilings = computeCeilings(chain);

    const dimensionsNeedingLLM = (dimensionFilter || ALL_DIMENSIONS).filter(dim => {
      const ceiling = ceilings[dim];
      if (ceiling === undefined) return true;
      if (ceiling === 0) return false;
      return true;
    });

    return { ...chain, ceilings, dimensionsNeedingLLM };
  });
}

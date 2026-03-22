/**
 * Deterministic Publishability Checker
 *
 * Runs without LLM calls. Enforces rules discovered during manual analysis.
 * This is the "deterministic automation" counterpart to publishability.mjs.
 *
 * Checks:
 *   1. Every named export in code appears in the README
 *   2. Config params from destructuring appear in the README (or shared config ref)
 *   3. README references shared config where appropriate
 *   4. Instruction builders use { specification, processing } naming
 *   5. Chains with spec patterns (fooSpec + instruction builders) document the workflow
 *
 * Usage: node .workspace/scripts/check-publishability.mjs [chain-name]
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import scanFile from '../../src/lib/parse-js-parts/index.js';

const ROOT = new URL('../..', import.meta.url).pathname;
const CHAINS_DIR = join(ROOT, 'src/chains');

// Shared config params — these should reference ../README.md#shared-configuration
// rather than being documented per-chain
const SHARED_CONFIG_PARAMS = new Set([
  'llm', 'maxAttempts', 'onProgress', 'now', 'logger',
  'batchSize', 'maxParallel', 'listStyle', 'autoModeThreshold',
  'model', // alias for llm in some chains
  'responseFormat', // common batch processing config
]);

// Internal/spread params that don't need README documentation
const INTERNAL_PARAMS = new Set([
  'options', 'rest', 'restConfig', 'restOptions',
  'chainStartTime', '_schema',
]);

// Exports that are internal/testing utilities, not worth separate README docs
const INTERNAL_EXPORTS = new Set([
  'useTestSortPrompt',
  'defaultSortChunkSize', 'defaultSortExtremeK', 'defaultSortIterations',
  'filterOnce', 'findOnce', // aliases for default exports
  'SAMPLE_GENERATION_PROMPT', // internal constant
]);

// ============================================================
// Extraction
// ============================================================

async function extractChainData(chainName) {
  const dir = join(CHAINS_DIR, chainName);
  const indexPath = join(dir, 'index.js');

  let source, readme;
  try {
    source = await readFile(indexPath, 'utf-8');
  } catch {
    return { name: chainName, hasCode: false };
  }

  try {
    readme = await readFile(join(dir, 'README.md'), 'utf-8');
  } catch {
    readme = undefined;
  }

  let parsed;
  try {
    parsed = scanFile(indexPath, source);
  } catch {
    // parse-js-parts can crash on certain export patterns (e.g. re-exports without declarations)
    // Fall back to regex-based export extraction
    parsed = { exportsMap: {}, functionsMap: {} };
  }

  // Extract named exports
  const exports = [];
  let hasDefault = false;
  for (const [name, exp] of Object.entries(parsed.exportsMap)) {
    if (name === 'default') {
      hasDefault = true;
    } else {
      exports.push({ name, type: exp.type, local: exp.local });
    }
  }

  // Also detect exports via regex as fallback (catches cases parse-js-parts misses)
  const exportRegex = /export\s+(?:async\s+)?function\s+(\w+)|export\s+(?:const|let|var)\s+(\w+)/g;
  let expMatch;
  const exportNames = new Set(exports.map(e => e.name));
  while ((expMatch = exportRegex.exec(source)) !== null) {
    const name = expMatch[1] || expMatch[2];
    if (name && !exportNames.has(name)) {
      exports.push({ name, type: 'regex-detected' });
      exportNames.add(name);
    }
  }

  // Extract config params from destructuring patterns
  // Matches: const { param1, param2 = default, ...rest } = config;
  const configParams = [];
  const destructurePattern = /(?:const|let)\s*\{([^}]+)\}\s*=\s*(?:config|options|rest)/g;
  let match;
  while ((match = destructurePattern.exec(source)) !== null) {
    // Strip inline comments before splitting
    const cleaned = match[1].replace(/\/\/[^\n]*/g, '').replace(/\/\*.*?\*\//g, '');
    const params = cleaned.split(',').map(p => p.trim()).filter(Boolean);
    for (const param of params) {
      const name = param.split('=')[0].trim().replace(/^\.\.\./, '');
      const isSpread = param.trim().startsWith('...');
      if (!isSpread && name && /^[a-zA-Z_$]/.test(name)) {
        configParams.push(name);
      }
    }
  }

  // Detect spec pattern: exports containing 'Spec' and 'Instructions'
  const hasSpecPattern = exports.some(e => e.name.endsWith('Spec') || e.name.endsWith('spec'));
  const instructionBuilders = exports.filter(e => e.name.endsWith('Instructions'));

  return {
    name: chainName,
    hasCode: true,
    hasReadme: readme !== undefined,
    readme,
    exports,
    hasDefault,
    configParams,
    hasSpecPattern,
    instructionBuilders,
  };
}

// ============================================================
// Checks
// ============================================================

function checkExportsInReadme(chain) {
  const issues = [];
  if (!chain.hasReadme || !chain.readme) return issues;

  for (const exp of chain.exports) {
    if (INTERNAL_EXPORTS.has(exp.name)) continue;

    // Check if the export name appears anywhere in the README
    if (!chain.readme.includes(exp.name)) {
      issues.push({
        type: 'missing-export-in-readme',
        severity: 'high',
        message: `Export \`${exp.name}\` not mentioned in README`,
      });
    }
  }

  return issues;
}

function checkConfigParamsInReadme(chain) {
  const issues = [];
  if (!chain.hasReadme || !chain.readme) return issues;

  const hasSharedConfigRef = chain.readme.includes('shared-configuration') ||
                              chain.readme.includes('shared configuration');

  // Check chain-specific params (not shared config)
  const chainSpecificParams = chain.configParams.filter(
    p => !SHARED_CONFIG_PARAMS.has(p) && !INTERNAL_PARAMS.has(p)
  );

  for (const param of chainSpecificParams) {
    if (!chain.readme.includes(param)) {
      issues.push({
        type: 'missing-config-in-readme',
        severity: 'medium',
        message: `Config param \`${param}\` not mentioned in README`,
      });
    }
  }

  // Check shared config ref
  const usesSharedParams = chain.configParams.some(p => SHARED_CONFIG_PARAMS.has(p));
  if (usesSharedParams && !hasSharedConfigRef) {
    issues.push({
      type: 'missing-shared-config-ref',
      severity: 'low',
      message: `Uses shared config params but doesn't reference shared configuration docs`,
    });
  }

  return issues;
}

function checkInstructionBuilderNaming(chain) {
  const issues = [];
  if (!chain.hasReadme || !chain.readme) return issues;

  for (const builder of chain.instructionBuilders) {
    // Check that README shows { specification, processing } not chain-specific param names
    // Match pattern: builderName({ scoring: or entities: or relations: or scaling: etc.)
    const readmePattern = new RegExp(
      `${builder.name}\\s*\\(\\s*\\{[^}]*\\b(?:scoring|entities|relations|scaling)\\s*:`,
      'g'
    );
    if (readmePattern.test(chain.readme)) {
      issues.push({
        type: 'wrong-builder-params',
        severity: 'high',
        message: `README for \`${builder.name}\` uses chain-specific param name instead of \`specification\``,
      });
    }
  }

  return issues;
}

function checkSpecPatternDocumented(chain) {
  const issues = [];
  if (!chain.hasReadme || !chain.readme) return issues;

  if (chain.hasSpecPattern) {
    const specExport = chain.exports.find(
      e => e.name.endsWith('Spec') || e.name.endsWith('spec')
    );
    if (specExport && !chain.readme.includes(specExport.name)) {
      issues.push({
        type: 'spec-pattern-undocumented',
        severity: 'high',
        message: `Has spec pattern (\`${specExport.name}\`) but it's not in README`,
      });
    }
  }

  return issues;
}

function checkMissingReadme(chain) {
  if (chain.hasCode && !chain.hasReadme) {
    return [{
      type: 'no-readme',
      severity: 'medium',
      message: `No README.md`,
    }];
  }
  return [];
}

// ============================================================
// Main
// ============================================================

async function main() {
  const targetChain = process.argv[2];

  let chainNames;
  if (targetChain) {
    chainNames = [targetChain];
  } else {
    const entries = await readdir(CHAINS_DIR, { withFileTypes: true });
    chainNames = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
  }

  console.log(`Checking ${chainNames.length} chains...\n`);

  const allIssues = [];
  const summary = { clean: 0, issues: 0, noCode: 0, noReadme: 0 };

  for (const name of chainNames) {
    const chain = await extractChainData(name);

    if (!chain.hasCode) {
      summary.noCode++;
      continue;
    }

    const issues = [
      ...checkMissingReadme(chain),
      ...checkExportsInReadme(chain),
      ...checkConfigParamsInReadme(chain),
      ...checkInstructionBuilderNaming(chain),
      ...checkSpecPatternDocumented(chain),
    ];

    if (issues.length === 0) {
      summary.clean++;
    } else {
      summary.issues++;
      allIssues.push({ chain: name, issues });
    }
  }

  // Output
  if (allIssues.length === 0) {
    console.log('All chains pass publishability checks.');
  } else {
    for (const { chain, issues } of allIssues) {
      console.log(`${chain}:`);
      for (const issue of issues) {
        const icon = issue.severity === 'high' ? '!' : issue.severity === 'medium' ? '~' : '-';
        console.log(`  ${icon} ${issue.message}`);
      }
      console.log();
    }
  }

  console.log(`--- Summary ---`);
  console.log(`Clean: ${summary.clean}`);
  console.log(`Issues: ${summary.issues}`);
  if (summary.noCode > 0) console.log(`No code: ${summary.noCode}`);

  // Exit with error code if there are high-severity issues
  const highSeverityCount = allIssues.reduce(
    (count, { issues }) => count + issues.filter(i => i.severity === 'high').length,
    0
  );
  if (highSeverityCount > 0) {
    console.log(`\nHigh-severity issues: ${highSeverityCount}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Check failed:', err);
  process.exit(1);
});

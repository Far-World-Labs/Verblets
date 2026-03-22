/**
 * Publishability Analysis
 *
 * A program that analyzes verblets modules for publishability issues by comparing
 * what documentation claims to what code actually does, then recommends fixes at
 * the right level (code, docs, or meta/architectural).
 *
 * Phases:
 *   1. Mechanical extraction — AST parsing for exports, signatures, config patterns
 *   2. Semantic extraction — verblets reads READMEs for claims about API behavior
 *   3. Comparison — match claims to code, classify discrepancies
 *   4. Cross-module patterns — identify systematic issues
 *   5. Recommendations — group findings, reason about fix location
 *
 * Usage: node .workspace/scripts/publishability.mjs [--modules chains|verblets|all]
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import scanFile from '../../src/lib/parse-js-parts/index.js';
import map from '../../src/chains/map/index.js';
import group from '../../src/chains/group/index.js';
import score from '../../src/chains/score/index.js';
import filter from '../../src/chains/filter/index.js';

const ROOT = new URL('../..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const OUTPUT = new URL('../discoveries/publishability.md', import.meta.url).pathname;

const LLM = 'fastGoodCheap';

// ============================================================
// Phase 1: Mechanical Extraction
// ============================================================

/**
 * Extract structured data from a module's source code using AST parsing.
 * Returns exports, function signatures, config parameters, and imports.
 */
async function extractCodeProfile(moduleDir) {
  const indexPath = join(moduleDir, 'index.js');
  let source;
  try {
    source = await readFile(indexPath, 'utf-8');
  } catch {
    return { exists: false };
  }

  const profile = {
    exists: true,
    source,
    exports: [],
    configParams: [],
    imports: [],
    hasDefaultExport: false,
    defaultExportName: undefined,
  };

  // AST extraction
  try {
    let parsed;
    try {
      parsed = scanFile(indexPath, source);
    } catch {
      parsed = { exportsMap: {}, functionsMap: {}, importsMap: {} };
    }

    // Extract exports
    for (const [name, exp] of Object.entries(parsed.exportsMap)) {
      profile.exports.push({ name, type: exp.type, local: exp.local });
      if (exp.type === 'DefaultExport') {
        profile.hasDefaultExport = true;
        profile.defaultExportName = exp.local || name;
      }
    }

    // Extract function signatures
    profile.functions = [];
    for (const [key, fn] of Object.entries(parsed.functionsMap)) {
      profile.functions.push({
        key,
        name: fn.functionName || fn.name,
        type: fn.type,
        async: fn.async,
        exported: fn.exported,
        startLine: source.slice(0, fn.start).split('\n').length,
      });
    }

    // Extract imports
    for (const [src, imp] of Object.entries(parsed.importsMap)) {
      profile.imports.push({
        source: src,
        default: imp.declaration,
        named: imp.specifiers,
      });
    }
  } catch (err) {
    profile.parseError = err.message;
  }

  // Config parameter extraction via regex (catches destructured config patterns)
  const configMatch = source.match(
    /(?:config|options)\s*=\s*\{\}[\s\S]*?\{([^}]+)\}/
  );
  if (configMatch) {
    const destructured = configMatch[1];
    const params = destructured
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const [name, defaultVal] = p.split('=').map((s) => s.trim());
        const cleanName = name.replace(/^\.\.\./, '');
        return {
          name: cleanName,
          hasDefault: p.includes('='),
          defaultValue: defaultVal,
          isSpread: name.startsWith('...'),
        };
      });
    profile.configParams = params;
  }

  return profile;
}

/**
 * Read a module's README and return its content.
 */
async function readReadme(moduleDir) {
  try {
    return await readFile(join(moduleDir, 'README.md'), 'utf-8');
  } catch {
    return undefined;
  }
}

/**
 * Gather all module directories for a given category (chains or verblets).
 */
async function gatherModules(category) {
  const base = join(SRC, category);
  const entries = await readdir(base, { withFileTypes: true });
  const modules = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(base, entry.name);
    const code = await extractCodeProfile(dir);
    const readme = await readReadme(dir);

    modules.push({
      name: entry.name,
      category,
      dir,
      path: `src/${category}/${entry.name}`,
      code,
      readme,
      hasReadme: readme !== undefined,
    });
  }

  return modules;
}

// ============================================================
// Phase 2: Semantic Extraction — README claim analysis
// ============================================================

/**
 * Use verblets to extract structured claims from README prose.
 * Each module's README is analyzed for what it promises about the API.
 */
async function extractReadmeClaims(modules) {
  const modulesWithReadmes = modules.filter((m) => m.hasReadme && m.code.exists);

  if (modulesWithReadmes.length === 0) return modules;

  // Build items: each is a module's README + code summary, for map to analyze
  const items = modulesWithReadmes.map((m) => {
    const exportsList = m.code.exports.map((e) => e.name).join(', ');
    const configList = m.code.configParams.map((p) => p.name).join(', ');
    return `MODULE: ${m.path}
EXPORTS (from code): ${exportsList || '(none found)'}
CONFIG PARAMS (from code): ${configList || '(none found)'}
---README---
${m.readme.slice(0, 3000)}`;
  });

  console.log(`  Extracting claims from ${items.length} READMEs...`);
  const start = Date.now();

  const claims = await map(
    items,
    `Compare the README documentation against the code-extracted information provided.
For each module, produce a structured analysis:

1. PARAMETER CLAIMS: List every parameter the README mentions by name, with any documented defaults or types.
2. PARAMETER REALITY: Note which README-mentioned parameters match the code exports/config, which don't exist in code, and which code parameters are missing from README.
3. BEHAVIOR CLAIMS: List specific behavioral promises the README makes (e.g., "handles X gracefully", "retries automatically", "returns Y").
4. API SHAPE: What does the README say the function signature is? Does it match the actual exports?
5. DISCREPANCIES: List specific mismatches between README claims and code reality. Be precise — quote the README claim and state what the code actually does.

Only report real discrepancies with evidence. If the README accurately describes the code, say so.`,
    { llm: LLM }
  );

  console.log(`  Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);

  // Attach claims back to modules
  modulesWithReadmes.forEach((m, i) => {
    m.claims = claims[i];
  });

  return modules;
}

// ============================================================
// Phase 3: Cross-module pattern analysis
// ============================================================

/**
 * Identify systematic patterns across modules — things that are true
 * of many modules and should be fixed at the meta level.
 */
function analyzeSystematicPatterns(modules) {
  const patterns = {
    sharedConfig: {},
    missingReadmes: [],
    missingExports: [],
  };

  // Count config parameter frequency across modules
  for (const m of modules) {
    if (!m.code.exists) continue;
    for (const param of m.code.configParams) {
      if (param.isSpread) continue;
      const key = param.name;
      patterns.sharedConfig[key] = patterns.sharedConfig[key] || {
        count: 0,
        modules: [],
        defaults: new Set(),
      };
      patterns.sharedConfig[key].count++;
      patterns.sharedConfig[key].modules.push(m.name);
      if (param.hasDefault) {
        patterns.sharedConfig[key].defaults.add(param.defaultValue);
      }
    }
  }

  // Modules without READMEs
  patterns.missingReadmes = modules
    .filter((m) => !m.hasReadme && m.code.exists)
    .map((m) => m.path);

  // Config params that appear in 3+ modules — these are systematic
  patterns.systematicParams = Object.entries(patterns.sharedConfig)
    .filter(([, v]) => v.count >= 3)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, v]) => ({
      name,
      count: v.count,
      defaults: [...v.defaults],
    }));

  return patterns;
}

// ============================================================
// Phase 4: Classify and group findings
// ============================================================

/**
 * Use verblets to classify discrepancies and recommend fix locations.
 */
async function classifyFindings(modules, patterns) {
  // Collect all claims that contain discrepancies
  const findings = modules
    .filter((m) => m.claims)
    .map((m) => `${m.path}:\n${m.claims}`)
    .filter((c) => c.toLowerCase().includes('discrepan') ||
                    c.toLowerCase().includes('mismatch') ||
                    c.toLowerCase().includes('missing') ||
                    c.toLowerCase().includes('not documented') ||
                    c.toLowerCase().includes('does not'));

  if (findings.length === 0) {
    console.log('  No discrepancies found to classify.');
    return { grouped: {}, recommendations: [] };
  }

  // Group findings by type using verblets
  console.log(`  Grouping ${findings.length} findings by type...`);
  const start = Date.now();

  const grouped = await group(
    findings,
    `Group these module analysis findings into categories based on what type of fix they need:
- "naming-drift": README uses different parameter/function names than the code
- "phantom-feature": README documents something that doesn't exist in code
- "hidden-behavior": Code does something significant that README doesn't mention
- "systematic-gap": Same issue across multiple modules (should be fixed once, not per-module)
- "stale-reference": README references deprecated or renamed functions/modules
- "accurate": README correctly describes the code (no fix needed)`,
    { llm: LLM }
  );

  console.log(`  Grouped in ${((Date.now() - start) / 1000).toFixed(1)}s`);

  // Generate recommendations for non-accurate groups
  const actionableGroups = Object.entries(grouped)
    .filter(([cat]) => cat !== 'accurate')
    .filter(([, items]) => items.length > 0);

  const recItems = actionableGroups.map(
    ([cat, items]) => `Category: ${cat} (${items.length} findings)\nExamples:\n${items.slice(0, 3).join('\n---\n')}`
  );

  // Add systematic pattern data
  if (patterns.systematicParams.length > 0) {
    const sysParamSummary = patterns.systematicParams
      .map((p) => `  ${p.name}: ${p.count} modules, defaults: ${p.defaults.join(', ') || 'none'}`)
      .join('\n');
    recItems.push(
      `Category: systematic-config (cross-cutting)\nShared config parameters found across multiple chains but never formally defined:\n${sysParamSummary}`
    );
  }

  if (recItems.length === 0) {
    return { grouped, recommendations: [] };
  }

  console.log(`  Generating recommendations for ${recItems.length} categories...`);
  const recStart = Date.now();

  const recommendations = await map(
    recItems,
    `For this category of publishability issues, recommend the right fix:

- If the issue is in many modules, recommend a META fix (shared type, generated docs, convention).
- If the README is wrong and the code is right, recommend a DOCS fix with what to change.
- If the code naming is worse than what the README says, recommend a CODE fix.
- If a feature is documented but unimplemented, recommend either IMPLEMENT or REMOVE-FROM-DOCS.

Be specific. Name the files and what should change. One paragraph per recommendation.`,
    { llm: LLM }
  );

  console.log(`  Recommendations in ${((Date.now() - recStart) / 1000).toFixed(1)}s`);

  return {
    grouped,
    recommendations: recItems.map((item, i) => ({
      category: item.split('\n')[0],
      recommendation: recommendations[i],
    })),
  };
}

// ============================================================
// Output
// ============================================================

function buildReport(modules, patterns, classified, elapsed) {
  const { grouped, recommendations } = classified;
  const totalModules = modules.length;
  const withReadmes = modules.filter((m) => m.hasReadme).length;
  const withCode = modules.filter((m) => m.code.exists).length;
  const withClaims = modules.filter((m) => m.claims).length;

  let report = `# Publishability Analysis
> Generated ${new Date().toISOString().split('T')[0]} | ${elapsed}s
> Modules: ${totalModules} total, ${withCode} with code, ${withReadmes} with READMEs, ${withClaims} analyzed

## Systematic Config Pattern

${patterns.systematicParams.length} parameters appear across 3+ chains but have no shared type definition:

| Parameter | Chains | Default(s) |
|-----------|--------|------------|
${patterns.systematicParams.map((p) => `| \`${p.name}\` | ${p.count} | ${p.defaults.join(', ') || '—'} |`).join('\n')}

**This is a meta-level fix**: define a shared config type, document it once, reference it from each chain's README.

`;

  if (patterns.missingReadmes.length > 0) {
    report += `## Modules Missing READMEs

${patterns.missingReadmes.map((p) => `- \`${p}\``).join('\n')}

`;
  }

  if (recommendations.length > 0) {
    report += `## Recommendations

${recommendations
  .filter((r) => r.recommendation)
  .map((r) => `### ${r.category}\n\n${r.recommendation}`)
  .join('\n\n')}

`;
  }

  if (grouped && Object.keys(grouped).length > 0) {
    report += `## Findings by Category

`;
    for (const [cat, items] of Object.entries(grouped)) {
      report += `### ${cat} (${items.length})\n\n`;
      for (const item of items) {
        // Truncate long items for readability
        const truncated = item.length > 500 ? item.slice(0, 500) + '...' : item;
        report += `- ${truncated.replace(/\n/g, '\n  ')}\n\n`;
      }
    }
  }

  // Per-module details for modules with claims
  report += `## Per-Module Analysis\n\n`;
  for (const m of modules.filter((mod) => mod.claims)) {
    report += `### ${m.path}\n\n`;
    report += `**Exports**: ${m.code.exports.map((e) => e.name).join(', ') || '(none found)'}\n`;
    report += `**Config params**: ${m.code.configParams.filter((p) => !p.isSpread).map((p) => p.name).join(', ') || '(none found)'}\n\n`;
    report += `${m.claims}\n\n---\n\n`;
  }

  return report;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const totalStart = Date.now();
  const targetArg = process.argv[2] || 'all';
  const targets = targetArg === 'all' ? ['chains', 'verblets'] : [targetArg];

  console.log(`Publishability Analysis\n`);

  // Phase 1: Gather and extract
  console.log('Phase 1: Mechanical extraction');
  let modules = [];
  for (const target of targets) {
    const gathered = await gatherModules(target);
    modules = modules.concat(gathered);
    console.log(`  ${target}: ${gathered.length} modules`);
  }
  console.log(`  Total: ${modules.length} modules\n`);

  // Phase 2: Semantic claim extraction
  console.log('Phase 2: Semantic claim extraction');
  modules = await extractReadmeClaims(modules);
  console.log();

  // Phase 3: Cross-module patterns
  console.log('Phase 3: Cross-module pattern analysis');
  const patterns = analyzeSystematicPatterns(modules);
  console.log(`  ${patterns.systematicParams.length} systematic config parameters`);
  console.log(`  ${patterns.missingReadmes.length} modules without READMEs\n`);

  // Phase 4: Classify and recommend
  console.log('Phase 4: Classification and recommendations');
  const classified = await classifyFindings(modules, patterns);
  console.log();

  // Output
  const elapsed = ((Date.now() - totalStart) / 1000).toFixed(1);
  const report = buildReport(modules, patterns, classified, elapsed);
  await writeFile(OUTPUT, report);

  console.log(`Done in ${elapsed}s`);
  console.log(`Report: ${OUTPUT}`);

  // Surface key findings
  console.log('\n=== Key Findings ===\n');
  console.log(`Systematic config params (undocumented shared interface):`);
  for (const p of patterns.systematicParams.slice(0, 8)) {
    console.log(`  ${p.name}: ${p.count} chains`);
  }
  if (patterns.missingReadmes.length > 0) {
    console.log(`\nMissing READMEs: ${patterns.missingReadmes.join(', ')}`);
  }
  if (classified.recommendations.length > 0) {
    console.log(`\nRecommendations:`);
    for (const r of classified.recommendations) {
      if (r.recommendation) {
        console.log(`  ${r.category}`);
        console.log(`    ${r.recommendation.slice(0, 200)}...`);
      }
    }
  }
}

main().catch((err) => {
  console.error('Analysis failed:', err);
  process.exit(1);
});

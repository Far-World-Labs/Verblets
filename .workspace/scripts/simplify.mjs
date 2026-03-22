/**
 * Code Simplification — Composable Verblets Operation
 *
 * Applies simplification analysis to source files using map.
 * The simplification spec is adapted from Anthropic's code-simplifier prompt,
 * merged with project conventions from CLAUDE.md.
 *
 * Composable: the simplification instructions are strings that can be passed
 * to map, filter, score, or any other chain. This script is one composition;
 * the same instructions work in other compositions.
 *
 * Phases:
 *   1. Gather — read target source files
 *   2. Analyze — map: identify simplification opportunities per file
 *   3. Score — map: rate each file's simplification potential (1-10)
 *   4. Report — reduce: synthesize findings into actionable summary
 *
 * Usage:
 *   node .workspace/scripts/simplify.mjs [--path src/chains] [--filter "*.js"]
 *   node .workspace/scripts/simplify.mjs --files src/chains/map/index.js,src/chains/score/index.js
 */

import dotenv from 'dotenv';
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, relative, basename, extname } from 'node:path';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

import map from '../../src/chains/map/index.js';
import reduce from '../../src/chains/reduce/index.js';

const ROOT = new URL('../..', import.meta.url).pathname;
const OUTPUT_DIR = new URL('../discoveries/simplification', import.meta.url).pathname;
const LLM = 'fastGoodCheap';

// ============================================================
// Simplification Instructions (composable — usable with any chain)
// ============================================================

/**
 * Build simplification analysis instructions.
 * Adapted from Anthropic's code-simplifier, merged with project conventions.
 * Returns a string suitable for map, filter, or any chain that takes instructions.
 */
function buildSimplifyAnalysisInstructions(projectConventions = '') {
  return `Analyze this source file for simplification opportunities.

You are an expert code simplification specialist. Your goal: identify concrete
changes that improve clarity, consistency, and maintainability WITHOUT changing
what the code does.

CORE RULES:
- Never change functionality — only how the code expresses it
- Prefer clarity over brevity — explicit code beats clever one-liners
- Avoid nested ternaries — use if/else or switch for multiple conditions
- Reduce nesting depth where possible
- Eliminate redundant code and unnecessary abstractions
- Improve variable and function names only when genuinely unclear
- Remove comments that describe obvious code
- Don't over-simplify — preserve helpful abstractions

${projectConventions ? `PROJECT CONVENTIONS:\n${projectConventions}\n` : ''}
For each opportunity found, report:
1. WHAT: The specific code pattern or section
2. WHY: Why it could be simpler
3. HOW: The concrete change (show before/after when meaningful)
4. RISK: Low/medium/high — how likely the change is to break something

If the file is already clean and well-written, say so briefly.`;
}

function buildSimplifyScoreInstructions() {
  return `Rate this file's simplification potential from 1 to 10.
1 = already clean and simple, no changes needed
5 = moderate improvements possible (naming, small refactors)
10 = significant simplification needed (deep nesting, redundancy, unclear logic)
Return ONLY a single integer from 1 to 10, nothing else.`;
}

// ============================================================
// Gather
// ============================================================

async function gatherFiles(config) {
  const { path: searchPath, files: specificFiles, filter: globFilter } = config;

  if (specificFiles) {
    const results = [];
    for (const filePath of specificFiles) {
      const absPath = filePath.startsWith('/') ? filePath : join(ROOT, filePath);
      try {
        const source = await readFile(absPath, 'utf-8');
        results.push({
          path: relative(ROOT, absPath),
          absPath,
          source,
          lines: source.split('\n').length,
        });
      } catch {
        console.warn(`  Skipping ${filePath} (not found)`);
      }
    }
    return results;
  }

  const searchDir = join(ROOT, searchPath || 'src/chains');
  const results = [];

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        if (globFilter && !entry.name.match(globFilter.replace('*', '.*'))) continue;
        if (ext !== '.js' && ext !== '.mjs') continue;
        if (entry.name.includes('.spec.') || entry.name.includes('.test.')) continue;

        const source = await readFile(fullPath, 'utf-8');
        results.push({
          path: relative(ROOT, fullPath),
          absPath: fullPath,
          source: source.slice(0, 6000), // cap for LLM context
          lines: source.split('\n').length,
        });
      }
    }
  }

  await walk(searchDir);
  return results;
}

// ============================================================
// Analyze (map)
// ============================================================

async function analyzeFiles(files, conventions) {
  const instructions = buildSimplifyAnalysisInstructions(conventions);

  const items = files.map(
    (f) => `FILE: ${f.path} (${f.lines} lines)\n---\n${f.source}`
  );

  console.log(`  Analyzing ${items.length} files for simplification...`);
  const start = Date.now();

  const analyses = await map(items, instructions, {
    llm: LLM,
    batchSize: 1,
    maxTokenBudget: 32000,
  });

  console.log(`  Analyzed in ${((Date.now() - start) / 1000).toFixed(1)}s`);

  return files.map((f, i) => ({
    ...f,
    analysis: analyses[i],
  }));
}

// ============================================================
// Score (map)
// ============================================================

async function scoreFiles(files) {
  const scoreInstructions = buildSimplifyScoreInstructions();

  const items = files.map(
    (f) =>
      `${f.path} (${f.lines} lines): ${f.analysis?.replace(/<\/?[^>]+>/g, '').slice(0, 500) || '(no analysis)'}`
  );

  console.log(`  Scoring ${items.length} files...`);
  const start = Date.now();

  const raw = await map(items, scoreInstructions, {
    llm: LLM,
    batchSize: 1,
    maxTokenBudget: 16000,
  });

  console.log(`  Scored in ${((Date.now() - start) / 1000).toFixed(1)}s`);

  return files.map((f, i) => ({
    ...f,
    simplificationScore: parseInt(raw[i], 10) || 0,
  }));
}

// ============================================================
// Report (reduce)
// ============================================================

async function synthesize(files) {
  const sorted = [...files].sort(
    (a, b) => (b.simplificationScore ?? 0) - (a.simplificationScore ?? 0)
  );

  const summaryItems = sorted.map(
    (f) =>
      `${f.path} (score: ${f.simplificationScore}/10, ${f.lines} lines): ${f.analysis?.replace(/<\/?[^>]+>/g, '').slice(0, 400) || 'clean'}`
  );

  console.log(`  Synthesizing report...`);
  const start = Date.now();

  const report = await reduce(
    summaryItems,
    `Build a concise simplification report. For each file with simplification
opportunities (score > 3), summarize what could be improved and how.
Group by priority: high-impact changes first.
Include specific file paths and line references when available.
If most files are clean, note that — don't invent problems.`,
    { llm: LLM, initial: '' }
  );

  console.log(`  Synthesized in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  return report;
}

// ============================================================
// Output
// ============================================================

async function writeReport(files, synthesis) {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const sorted = [...files].sort(
    (a, b) => (b.simplificationScore ?? 0) - (a.simplificationScore ?? 0)
  );

  const report = `# Code Simplification Report
> Generated ${new Date().toISOString().split('T')[0]}
> ${files.length} files analyzed
> Chains used: map (analysis + scoring), reduce (synthesis)

## Summary

${synthesis}

## Scores

| File | Lines | Score | Key Finding |
|------|-------|-------|-------------|
${sorted
  .map((f) => {
    const finding = f.analysis
      ?.replace(/<\/?[^>]+>/g, '')
      .replace(/\n/g, ' ')
      .slice(0, 80) || 'clean';
    return `| ${f.path} | ${f.lines} | ${f.simplificationScore}/10 | ${finding} |`;
  })
  .join('\n')}

## Detailed Analysis

${sorted
  .filter((f) => (f.simplificationScore ?? 0) > 2)
  .map((f) => `### ${f.path} (${f.simplificationScore}/10)\n\n${f.analysis || 'No analysis'}`)
  .join('\n\n---\n\n')}
`;

  const outPath = join(OUTPUT_DIR, 'report.md');
  await writeFile(outPath, report);
  console.log(`\nReport: ${outPath}`);
  return outPath;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const totalStart = Date.now();
  const args = process.argv.slice(2);
  const config = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path' && args[i + 1]) {
      config.path = args[i + 1];
      i++;
    }
    if (args[i] === '--files' && args[i + 1]) {
      config.files = args[i + 1].split(',');
      i++;
    }
    if (args[i] === '--filter' && args[i + 1]) {
      config.filter = args[i + 1];
      i++;
    }
  }

  console.log('Code Simplification Analysis\n');

  // Load project conventions from CLAUDE.md
  let conventions = '';
  try {
    const claudeMd = await readFile(join(ROOT, 'CLAUDE.md'), 'utf-8');
    // Extract code style and rules sections
    const styleMatch = claudeMd.match(/### Code Style Preferences[\s\S]*?(?=\n##|\n### [A-Z])/);
    const rulesMatch = claudeMd.match(/## ABSOLUTE RULES:[\s\S]*$/);
    if (styleMatch) conventions += styleMatch[0] + '\n';
    if (rulesMatch) conventions += rulesMatch[0];
  } catch {
    console.log('  No CLAUDE.md found, using default conventions');
  }

  // Phase 1: Gather
  console.log('Phase 1: Gather files');
  const files = await gatherFiles(config);
  console.log(`  Found ${files.length} files\n`);

  if (files.length === 0) {
    console.log('No files to analyze.');
    return;
  }

  // Phase 2: Analyze (map)
  console.log('Phase 2: Analyze (map)');
  const analyzed = await analyzeFiles(files, conventions);
  console.log();

  // Phase 3: Score (map)
  console.log('Phase 3: Score (map)');
  const scored = await scoreFiles(analyzed);
  console.log();

  // Phase 4: Synthesize (reduce)
  console.log('Phase 4: Synthesize (reduce)');
  const synthesis = await synthesize(scored);
  console.log();

  // Write report
  const outPath = await writeReport(scored, synthesis);

  const totalTime = ((Date.now() - totalStart) / 1000).toFixed(1);
  console.log(`Done in ${totalTime}s`);

  // Quick summary
  const needsWork = scored.filter((f) => (f.simplificationScore ?? 0) > 3);
  console.log(`\n${needsWork.length}/${scored.length} files need simplification`);
  needsWork.slice(0, 5).forEach((f) =>
    console.log(`  ${f.simplificationScore}/10 ${f.path}`)
  );
}

main().catch((err) => {
  console.error('Simplification analysis failed:', err);
  process.exit(1);
});

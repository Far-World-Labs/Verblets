/**
 * Module Profiler — Verblets Composition Exercise
 *
 * Exercises the verblets library on its own codebase. Uses map, score, group,
 * reduce, filter, and sort in composition to build a semantic profile of every
 * public chain module.
 *
 * This is NOT a deterministic checker (that's check-publishability.mjs).
 * This uses LLM analysis to surface things parsing can't see: design quality,
 * API consistency, conceptual clarity, documentation accuracy.
 *
 * Phases:
 *   1. Gather — Read source + README for every public chain
 *   2. Profile — map: extract semantic profile per module
 *   3. Score — score: rate on multiple quality dimensions
 *   4. Group — group: cluster by architectural pattern
 *   5. Rank — sort: order by "needs attention"
 *   6. Synthesize — reduce: build cross-module health report
 *
 * Usage:
 *   node .workspace/scripts/module-profiler.mjs [--chains name1,name2,...] [--phase N]
 *
 * Designed to run for a while. Saves intermediate results after each phase
 * so you can resume from any phase if interrupted.
 */

import dotenv from 'dotenv';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

// Load .env from project root
dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

import map from '../../src/chains/map/index.js';
import group from '../../src/chains/group/index.js';
import reduce from '../../src/chains/reduce/index.js';
import sort from '../../src/chains/sort/index.js';

const ROOT = new URL('../..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const OUTPUT_DIR = new URL('../discoveries/profiler', import.meta.url).pathname;

const LLM = 'fastGoodCheap';

// Public chains only (from catalog analysis)
const INTERNAL_CHAINS = new Set([
  'conversation-turn-reduce',
  'test-analysis',
  'test-analyzer',
]);
const DEV_CHAINS = new Set([
  'test',
  'test-advice',
  'ai-arch-expect',
  'scan-js',
]);

// ============================================================
// Helpers
// ============================================================

async function savePhase(name, data) {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const path = join(OUTPUT_DIR, `${name}.json`);
  await writeFile(path, JSON.stringify(data, null, 2));
  console.log(`  Saved ${path}`);
  return data;
}

async function loadPhase(name) {
  try {
    const path = join(OUTPUT_DIR, `${name}.json`);
    const raw = await readFile(path, 'utf-8');
    console.log(`  Loaded cached ${name}`);
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function elapsed(start) {
  return ((Date.now() - start) / 1000).toFixed(1);
}

// ============================================================
// Phase 1: Gather
// ============================================================

async function gatherModules(chainFilter) {
  const chainsDir = join(SRC, 'chains');
  const entries = await readdir(chainsDir, { withFileTypes: true });
  const modules = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (INTERNAL_CHAINS.has(entry.name)) continue;

    if (chainFilter && !chainFilter.includes(entry.name)) continue;

    const dir = join(chainsDir, entry.name);
    let source, readme;
    try {
      source = await readFile(join(dir, 'index.js'), 'utf-8');
    } catch {
      continue; // skip directories without index.js
    }
    try {
      readme = await readFile(join(dir, 'README.md'), 'utf-8');
    } catch {
      readme = undefined;
    }

    modules.push({
      name: entry.name,
      isDev: DEV_CHAINS.has(entry.name),
      source: source.slice(0, 4000), // truncate for LLM context
      readme: readme ? readme.slice(0, 3000) : undefined,
      hasReadme: readme !== undefined,
      sourceLines: source.split('\n').length,
    });
  }

  return modules;
}

// ============================================================
// Phase 2: Profile (map)
// ============================================================

async function profileModules(modules) {
  const items = modules.map((m) => {
    const readmePart = m.readme
      ? `\n---README (first 3000 chars)---\n${m.readme}`
      : '\n(no README)';
    return `MODULE: ${m.name} (${m.sourceLines} lines, ${m.isDev ? 'dev tooling' : 'public'})
---SOURCE (first 4000 chars)---
${m.source}${readmePart}`;
  });

  console.log(`  Profiling ${items.length} modules via map...`);
  const start = Date.now();

  const profiles = await map(
    items,
    `Analyze this module and produce a structured semantic profile. For each module, assess:

1. PURPOSE: What does this module do? One sentence.
2. DESIGN PATTERN: Which pattern does it use? (spec-based, direct-function, class-based, composition-of-chains, utility)
3. API SURFACE: How many exported functions? Are they well-named and consistent?
4. DOCUMENTATION: Does the README accurately describe what the code does? Any phantom features or missing behaviors?
5. COMPOSABILITY: How easily can this be wired into a larger pipeline? Does it accept/return standard types?
6. COMPLEXITY: Is the implementation straightforward or complex? Any surprising behaviors?
7. DEPENDENCIES: What other chains/verblets does it use internally?
8. CONCERNS: Any issues, inconsistencies, or things that would confuse a new user?

Be specific and evidence-based. Quote code when relevant. If the module is clean and well-designed, say so briefly.`,
    { llm: LLM, batchSize: 1, maxTokenBudget: 32000 }
  );

  console.log(`  Profiled in ${elapsed(start)}s`);

  return modules.map((m, i) => ({
    ...m,
    profile: profiles[i],
  }));
}

// ============================================================
// Phase 3: Score (map-based scoring)
// ============================================================

/**
 * Score modules using map to extract numeric ratings.
 *
 * Note: We use map directly instead of the score chain here. The score
 * chain's spec-based approach generates a scoring rubric first, but the
 * generated rubric sometimes misinterprets what needs scoring (treating
 * profiles as invalid input). Using map with explicit scoring instructions
 * is more reliable for this use case. This is itself a finding about the
 * score chain — its spec generation assumes numeric input domains.
 */
async function scoreModules(modules) {
  // Strip XML tags from profiles — map's XML list formatting confuses downstream scoring
  const stripXml = (s) => {
    if (!s) return '(no profile)';
    const text = typeof s === 'string' ? s : JSON.stringify(s);
    return text.replace(/<\/?[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  };
  const items = modules.map(
    (m) => `${m.name}: ${stripXml(m.profile || '(no profile)')}`
  );

  const mapConfig = { llm: LLM, batchSize: 1, maxTokenBudget: 16000 };

  console.log(`  Scoring ${items.length} modules on documentation quality...`);
  const docStart = Date.now();
  const docRaw = await map(
    items,
    `Rate this module's documentation quality from 1 to 10 based on its profile.
Consider: Does the README exist? Does it accurately describe the code?
Are all exports documented? Are examples realistic? Is the API shape clear?
Return ONLY a single integer from 1 to 10, nothing else.`,
    mapConfig
  );
  const docScores = docRaw.map((s) => parseInt(s, 10) || 0);
  console.log(`  Documentation scores: ${JSON.stringify(docScores)} (${elapsed(docStart)}s)`);

  console.log(`  Scoring on API design quality...`);
  const apiStart = Date.now();
  const apiRaw = await map(
    items,
    `Rate this module's API design quality from 1 to 10 based on its profile.
Consider: Are function names clear and consistent? Does the API compose well
with other chains? Are there surprises? Is the interface minimal but sufficient?
Return ONLY a single integer from 1 to 10, nothing else.`,
    mapConfig
  );
  const apiScores = apiRaw.map((s) => parseInt(s, 10) || 0);
  console.log(`  API design scores: ${JSON.stringify(apiScores)} (${elapsed(apiStart)}s)`);

  console.log(`  Scoring on attention-needed...`);
  const attStart = Date.now();
  const attRaw = await map(
    items,
    `Rate how much attention this module needs from 1 to 10 based on its profile.
Consider: documentation gaps, API inconsistencies, missing features,
confusing behavior, deviation from codebase patterns.
Higher scores mean MORE attention needed (worse state).
Return ONLY a single integer from 1 to 10, nothing else.`,
    mapConfig
  );
  const attentionScores = attRaw.map((s) => parseInt(s, 10) || 0);
  console.log(`  Attention scores: ${JSON.stringify(attentionScores)} (${elapsed(attStart)}s)`);

  return modules.map((m, i) => ({
    ...m,
    scores: {
      documentation: docScores[i],
      apiDesign: apiScores[i],
      attentionNeeded: attentionScores[i],
    },
  }));
}

// ============================================================
// Phase 4: Group (group)
// ============================================================

async function groupModules(modules) {
  const items = modules.map(
    (m) =>
      `${m.name} (doc:${m.scores?.documentation ?? '?'}, api:${m.scores?.apiDesign ?? '?'}, attention:${m.scores?.attentionNeeded ?? '?'}): ${m.profile?.slice(0, 300) ?? '(no profile)'}`
  );

  console.log(`  Grouping ${items.length} modules by architectural pattern...`);
  const start = Date.now();

  const grouped = await group(
    items,
    `Group these modules by their architectural pattern and quality level.
Don't just group by the scores — use the profile content to identify
meaningful clusters: modules that share a design approach, modules that
have similar issues, modules at the same maturity level.
Name groups descriptively (e.g., "spec-pattern well-documented", "utility
chains needing examples", "complex chains with hidden behavior").`,
    { llm: LLM }
  );

  console.log(`  Grouped in ${elapsed(start)}s`);
  return grouped;
}

// ============================================================
// Phase 5: Rank (sort)
// ============================================================

async function rankModules(modules) {
  const items = modules.map(
    (m) =>
      `${m.name} (doc:${m.scores?.documentation ?? '?'}, api:${m.scores?.apiDesign ?? '?'}, attention:${m.scores?.attentionNeeded ?? '?'}): ${m.profile?.slice(0, 200) ?? '(no profile)'}`
  );

  console.log(`  Sorting ${items.length} modules by "needs attention"...`);
  const start = Date.now();

  const sorted = await sort(
    items,
    `Order from MOST needing attention to LEAST needing attention.
Consider: documentation gaps, API design issues, inconsistency with
codebase patterns, confusing behavior. Modules that are clean and
well-documented go to the bottom. Modules with real problems go to the top.`,
    { llm: LLM }
  );

  console.log(`  Sorted in ${elapsed(start)}s`);
  return sorted;
}

// ============================================================
// Phase 6: Synthesize (reduce)
// ============================================================

async function synthesize(modules, groups, ranked) {
  const moduleCount = modules.length;
  const avgDoc =
    modules.reduce((sum, m) => sum + (m.scores?.documentation ?? 0), 0) /
    moduleCount;
  const avgApi =
    modules.reduce((sum, m) => sum + (m.scores?.apiDesign ?? 0), 0) /
    moduleCount;
  const avgAtt =
    modules.reduce((sum, m) => sum + (m.scores?.attentionNeeded ?? 0), 0) /
    moduleCount;

  const groupSummary = Object.entries(groups)
    .map(([name, items]) => `${name}: ${items.length} modules`)
    .join('\n');

  const topAttention = ranked.slice(0, 8).join('\n');
  const cleanest = ranked.slice(-5).join('\n');

  // Build a compact synthesis input — keep it under 10 items so reduce doesn't timeout
  const profileSummaries = modules
    .filter((m) => m.profile)
    .map((m) => `${m.name} (doc:${m.scores?.documentation}, api:${m.scores?.apiDesign}, att:${m.scores?.attentionNeeded}): ${m.profile.slice(0, 200)}`)
    .join('\n');

  const synthesisItems = [
    `OVERALL: ${moduleCount} modules, avg doc=${avgDoc.toFixed(1)}, api=${avgApi.toFixed(1)}, attention=${avgAtt.toFixed(1)}`,
    `GROUPS: ${groupSummary}`,
    `ATTENTION RANKING: ${ranked.slice(0, 8).map(r => r.split(':')[0]).join(', ')} (most→least)`,
    `CLEANEST: ${ranked.slice(-3).map(r => r.split(':')[0]).join(', ')}`,
    `PROFILES:\n${profileSummaries}`,
  ];

  console.log(`  Synthesizing health report via reduce...`);
  const start = Date.now();

  const report = await reduce(
    synthesisItems,
    `Build a comprehensive library health report. For each piece of data,
integrate it into the accumulator. The final report should cover:

1. EXECUTIVE SUMMARY: Overall library health in 2-3 sentences
2. PATTERNS: What architectural patterns dominate? Which work well?
3. PROBLEM AREAS: Specific modules or patterns that need work, with evidence
4. CONSISTENCY: How consistent is the API surface? Naming, conventions, documentation
5. RECOMMENDATIONS: Top 5 specific, actionable improvements ranked by impact
6. STRENGTHS: What the library does well — patterns worth preserving

Be specific. Name modules. Quote evidence. This report should be actionable.`,
    { llm: LLM, initial: '' }
  );

  console.log(`  Synthesized in ${elapsed(start)}s`);
  return report;
}

// ============================================================
// Output
// ============================================================

async function writeReport(modules, groups, ranked, synthesis) {
  const report = `# Module Profiler Report
> Generated ${new Date().toISOString().split('T')[0]}
> ${modules.length} public chain modules analyzed via verblets composition
> Chains used: map, score (x3), group, sort, reduce

## Synthesis

${synthesis}

## Module Scores

| Module | Documentation | API Design | Attention Needed | Dev? |
|--------|--------------|------------|-----------------|------|
${modules
  .sort((a, b) => (b.scores?.attentionNeeded ?? 0) - (a.scores?.attentionNeeded ?? 0))
  .map(
    (m) =>
      `| ${m.name} | ${m.scores?.documentation ?? '—'} | ${m.scores?.apiDesign ?? '—'} | ${m.scores?.attentionNeeded ?? '—'} | ${m.isDev ? 'Yes' : ''} |`
  )
  .join('\n')}

## Groups

${Object.entries(groups)
  .map(
    ([name, items]) =>
      `### ${name} (${items.length})\n${items.map((i) => `- ${i.split(':')[0]}`).join('\n')}`
  )
  .join('\n\n')}

## Attention Ranking (most → least)

${ranked.map((item, i) => `${i + 1}. ${item.split(':')[0]}`).join('\n')}

## Individual Profiles

${modules
  .map(
    (m) =>
      `### ${m.name}\n**Scores**: doc=${m.scores?.documentation ?? '—'}, api=${m.scores?.apiDesign ?? '—'}, attention=${m.scores?.attentionNeeded ?? '—'}\n\n${m.profile ?? '(no profile)'}`
  )
  .join('\n\n---\n\n')}
`;

  const outPath = join(OUTPUT_DIR, 'report.md');
  await writeFile(outPath, report);
  console.log(`\nReport written to ${outPath}`);
  return outPath;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const totalStart = Date.now();
  const args = process.argv.slice(2);
  let chainFilter;
  let startPhase = 1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--chains' && args[i + 1]) {
      chainFilter = args[i + 1].split(',');
      i++;
    }
    if (args[i] === '--phase' && args[i + 1]) {
      startPhase = parseInt(args[i + 1], 10);
      i++;
    }
  }

  console.log('Module Profiler — Verblets Composition Exercise\n');
  if (chainFilter) console.log(`  Filtering to: ${chainFilter.join(', ')}`);
  if (startPhase > 1) console.log(`  Starting from phase ${startPhase}`);

  // Phase 1: Gather
  console.log('\nPhase 1: Gather modules');
  let modules;
  if (startPhase <= 1) {
    modules = await gatherModules(chainFilter);
    console.log(`  Found ${modules.length} modules`);
    await savePhase('1-gathered', modules);
  } else {
    modules = await loadPhase('1-gathered');
  }

  // Phase 2: Profile (map)
  console.log('\nPhase 2: Profile modules (map)');
  if (startPhase <= 2) {
    modules = await profileModules(modules);
    await savePhase('2-profiled', modules);
  } else {
    modules = await loadPhase('2-profiled');
  }

  // Phase 3: Score
  console.log('\nPhase 3: Score modules (score x3)');
  if (startPhase <= 3) {
    modules = await scoreModules(modules);
    await savePhase('3-scored', modules);
  } else {
    modules = await loadPhase('3-scored');
  }

  // Phase 4: Group
  console.log('\nPhase 4: Group modules (group)');
  let groups;
  if (startPhase <= 4) {
    groups = await groupModules(modules);
    await savePhase('4-grouped', groups);
  } else {
    groups = await loadPhase('4-grouped');
  }

  // Phase 5: Rank (sort)
  console.log('\nPhase 5: Rank modules (sort)');
  let ranked;
  if (startPhase <= 5) {
    ranked = await rankModules(modules);
    await savePhase('5-ranked', ranked);
  } else {
    ranked = await loadPhase('5-ranked');
  }

  // Phase 6: Synthesize (reduce)
  console.log('\nPhase 6: Synthesize health report (reduce)');
  let synthesis;
  if (startPhase <= 6) {
    synthesis = await synthesize(modules, groups, ranked);
    await savePhase('6-synthesis', synthesis);
  } else {
    synthesis = await loadPhase('6-synthesis');
  }

  // Write final report
  console.log('\nWriting final report...');
  const outPath = await writeReport(modules, groups, ranked, synthesis);

  console.log(`\nDone in ${elapsed(totalStart)}s`);
  console.log(`Report: ${outPath}`);

  // Quick summary
  const avgAtt =
    modules.reduce((sum, m) => sum + (m.scores?.attentionNeeded ?? 0), 0) /
    modules.length;
  console.log(`\nAvg attention score: ${avgAtt.toFixed(1)}`);
  console.log(`Groups: ${Object.keys(groups).join(', ')}`);
  console.log(`Top 5 needing attention:`);
  ranked.slice(0, 5).forEach((r, i) => console.log(`  ${i + 1}. ${r.split(':')[0]}`));
}

main().catch((err) => {
  console.error('Profiler failed:', err);
  process.exit(1);
});

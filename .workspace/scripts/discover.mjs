// Discovery script v3: Data processing first, focused interpretation second
// Lesson from v1/v2: verblets processes data well, but "find the insight" produces platitudes.
// This version: mechanical analysis → verblets for categorization → specific interpretation questions
// Run: node --import ./.workspace/scripts/register-json.mjs ./.workspace/scripts/discover.mjs

import 'dotenv/config';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import group from '../../src/chains/group/index.js';
import reduce from '../../src/chains/reduce/index.js';
import map from '../../src/chains/map/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const WORKSPACE = join(__dirname, '..');
const OUTPUT_DIR = join(WORKSPACE, 'discoveries');

const log = (phase, msg) => console.log(`[${phase}] ${msg}`);
const elapsed = (start) => `${((Date.now() - start) / 1000).toFixed(1)}s`;
const stripXML = (s) => s.replace(/<\/?[^>]+>/g, '').trim();

// -- Phase 1: Mechanical analysis (no LLM calls) --

function gatherAndCrunch() {
  log('gather', 'Collecting and crunching...');
  const start = Date.now();

  // Parse git log with file changes
  const rawLog = execSync(
    'git log --no-merges --format="COMMIT_START %ai|%s" --name-only',
    { cwd: ROOT, encoding: 'utf-8' }
  );

  const commits = [];
  let current = undefined;
  for (const line of rawLog.split('\n')) {
    if (line.startsWith('COMMIT_START ')) {
      const rest = line.slice('COMMIT_START '.length);
      const pipeIdx = rest.indexOf('|');
      current = {
        date: rest.slice(0, pipeIdx).trim(),
        month: rest.slice(0, 7),
        message: rest.slice(pipeIdx + 1).trim(),
        files: [],
        areas: new Set(),
      };
      commits.push(current);
    } else if (current && line.trim()) {
      const file = line.trim();
      current.files.push(file);
      const area = categorizeFile(file);
      if (area) current.areas.add(area);
    }
  }

  // Enrich commits mechanically
  const enriched = commits.map(c => ({
    ...c,
    areaList: [...c.areas],
    description: `[${c.month}] ${c.message} (${[...c.areas].join(', ') || 'root'}, ${c.files.length} files)`,
  }));

  // Area investment
  const areaInvestment = {};
  for (const c of enriched) {
    for (const area of c.areaList) {
      areaInvestment[area] = (areaInvestment[area] || 0) + 1;
    }
  }

  // Rework detection (mechanical)
  const reworkPattern = /\b(fix|cleanup|clean up|refactor|rename|rework|revert|minor fixes|restore|re-run|reorganize)\b/i;
  const rework = enriched.filter(c => reworkPattern.test(c.message));
  const features = enriched.filter(c => !reworkPattern.test(c.message));

  // Per-area rework rate
  const areaRework = {};
  for (const c of rework) {
    for (const area of c.areaList) {
      areaRework[area] = (areaRework[area] || 0) + 1;
    }
  }
  const areaReworkRates = Object.entries(areaInvestment)
    .map(([area, total]) => ({
      area,
      total,
      rework: areaRework[area] || 0,
      rate: Math.round(100 * (areaRework[area] || 0) / total),
    }))
    .sort((a, b) => b.rate - a.rate);

  // Era analysis (mechanical)
  const era1 = enriched.filter(c => c.date.startsWith('2023'));
  const era2 = enriched.filter(c => c.date.startsWith('2025'));
  const era1Rework = era1.filter(c => reworkPattern.test(c.message));
  const era2Rework = era2.filter(c => reworkPattern.test(c.message));

  // Monthly velocity
  const monthlyVelocity = {};
  for (const c of enriched) {
    monthlyVelocity[c.month] = (monthlyVelocity[c.month] || 0) + 1;
  }

  // Most-touched files per area
  const filesByArea = {};
  for (const c of enriched) {
    for (const file of c.files) {
      const area = categorizeFile(file) || 'root';
      if (!filesByArea[area]) filesByArea[area] = {};
      filesByArea[area][file] = (filesByArea[area][file] || 0) + 1;
    }
  }

  // Read key source files (top 2 per high-churn area)
  const codeSamples = {};
  for (const area of ['chains', 'verblets', 'lib']) {
    const files = Object.entries(filesByArea[area] || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([f]) => f);
    for (const file of files) {
      try {
        const content = readFileSync(join(ROOT, file), 'utf-8');
        codeSamples[file] = content.split('\n').slice(0, 60).join('\n');
      } catch {}
    }
  }

  // Read intent documents
  const readFile = (path) => { try { return readFileSync(path, 'utf-8'); } catch { return ''; } };
  const claudeMd = readFile(join(ROOT, 'CLAUDE.md'));
  const context = readFile(join(WORKSPACE, 'context.md'));

  log('gather', `Done (${elapsed(start)}). ${commits.length} commits, ${Object.keys(codeSamples).length} code samples.`);

  return {
    commits: enriched,
    rework, features,
    areaInvestment, areaReworkRates,
    era1, era2, era1Rework, era2Rework,
    monthlyVelocity,
    codeSamples,
    claudeMd, context,
  };
}

function categorizeFile(file) {
  if (file.startsWith('src/chains/')) return 'chains';
  if (file.startsWith('src/verblets/')) return 'verblets';
  if (file.startsWith('src/lib/')) return 'lib';
  if (file.startsWith('src/prompts/')) return 'prompts';
  if (file.startsWith('src/constants/')) return 'constants';
  if (file.startsWith('src/services/')) return 'services';
  if (file.startsWith('src/json-schemas/')) return 'schemas';
  if (file.startsWith('scripts/')) return 'scripts';
  if (file.startsWith('.github/')) return 'ci';
  if (file.endsWith('.md')) return 'docs';
  if (file === 'package.json' || file === 'package-lock.json') return 'packaging';
  if (file === 'src/index.js' || file === 'src/shared.js') return 'exports';
  return undefined;
}

// -- Phase 2: Targeted verblets (ask specific questions about specific data) --

async function analyze(data) {
  log('analyze', 'Starting targeted analysis...');
  const start = Date.now();

  // 2a: Categorize the rework (group works well on this)
  log('analyze', `Categorizing ${data.rework.length} rework commits...`);
  const reworkGroups = await group(
    data.rework.map(c => c.description),
    'Categorize by the specific kind of rework: naming changes, API surface cleanup, test fixes, documentation sync, bug fixes, restructuring/reorganizing, publish/release fixes. Be precise.',
    { topN: 8 }
  );
  const reworkSummary = Object.entries(reworkGroups)
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([cat, items]) => ({ category: cat, count: items.length, examples: items.slice(0, 3) }));
  log('analyze', `Rework types (${elapsed(start)}): ${reworkSummary.map(r => `${r.category} (${r.count})`).join(', ')}`);

  // 2b: Interpret specific data points (not "find the insight" — "explain THIS number")
  log('analyze', 'Interpreting specific patterns...');
  const dataPoints = [
    `NAMING CHURN: ${reworkSummary.find(r => /nam/i.test(r.category))?.count || 'several'} rework commits involve renaming. The project has renamed its core module three times: openai/completions → chatgpt → llm. Each rename touches dozens of files across the codebase.`,
    `AREA REWORK RATES:\n${data.areaReworkRates.map(a => `  ${a.area}: ${a.rework}/${a.total} commits are rework (${a.rate}%)`).join('\n')}`,
    `ERA SHIFT: Era 1 (2023) had ${data.era1.length} commits with ${data.era1Rework.length} rework (${Math.round(100 * data.era1Rework.length / data.era1.length)}%). Era 2 (2025) had ${data.era2.length} commits with ${data.era2Rework.length} rework (${Math.round(100 * data.era2Rework.length / data.era2.length)}%). The developer came back after 2 years with ${data.era2.length - data.era1.length} more commits than the first era.`,
    `ORCHESTRATOR INVESTMENT: chains (${data.areaInvestment.chains || 0}) get far more work than verblets (${data.areaInvestment.verblets || 0}) or lib (${data.areaInvestment.lib || 0}). The orchestration layer receives ~60% more attention than the primitives.`,
  ];

  const interpretations = await map(
    dataPoints,
    `You are interpreting a specific data point about a developer's work patterns. Don't be generic or corporate. Be specific about what this particular number or pattern MEANS. What does it suggest about how this person thinks, what they value, or where they struggle? One paragraph, grounded in the specific data. Speak directly.`,
  );
  const cleanInterps = interpretations.map(i => i ? stripXML(i) : '').filter(Boolean);
  log('analyze', `Interpretations (${elapsed(start)}): ${cleanInterps.length} produced`);

  // 2c: What the code itself reveals (map with cleaner prompt)
  log('analyze', 'Reading code for craft signals...');
  const codeEntries = Object.entries(data.codeSamples).map(
    ([file, code]) => `=== ${file} ===\n${code}`
  );
  const codeSignals = await map(
    codeEntries,
    `Read this source code. Identify ONE specific design decision that reveals something about the developer's priorities. Not "clean code" or "good practices" — name the specific technique and what it trades off. Example: "Uses Fisher-Yates shuffle before reduce to prevent ordering bias, trading determinism for analytical fairness." One sentence.`,
  );
  const cleanCodeSignals = codeSignals.map(s => s ? stripXML(s) : '').filter(Boolean);
  log('analyze', `Code signals (${elapsed(start)}): ${cleanCodeSignals.length} found`);

  // 2d: One focused automation proposal (with real context)
  log('analyze', 'Proposing automation...');
  const topReworkType = reworkSummary[0];
  const automation = await reduce(
    [
      `TOP REWORK CATEGORY: "${topReworkType.category}" with ${topReworkType.count} commits.`,
      `EXAMPLES: ${topReworkType.examples.join('; ')}`,
      `DEVELOPER CONTEXT: Ideas person working at LaunchDarkly (feature flags / runtime configuration). Builds AI-powered functional primitives (verblets). Wants automation to handle maintenance so they can focus on ideas. Has a library with: map (transform lists at scale), filter (semantic filtering), group (categorize), reduce (accumulate), score (consistent rating), documentShrink (compress docs), entities (extract structured data). All handle batching, retry, progress automatically.`,
      `THE ASK: Propose ONE specific automation that would eliminate the most common rework type. Describe the exact verblets pipeline: which chains, what inputs, what outputs. Be concrete enough that a developer could implement it in an afternoon. Name it.`,
    ],
    `Propose one concrete automation. Not hypothetical — grounded in the specific rework data. Include the pipeline (which verblets chains in what order), what triggers it, and what it outputs. Brief.`,
    { initial: '' }
  );
  log('analyze', `Automation proposed (${elapsed(start)})`);

  return { reworkSummary, cleanInterps, cleanCodeSignals, automation };
}

// -- Output --

function formatOutput(data, findings, elapsedTotal) {
  const reworkPct = Math.round(100 * data.rework.length / data.commits.length);

  const areaTable = Object.entries(data.areaInvestment)
    .sort(([, a], [, b]) => b - a)
    .map(([area, count]) => `${area.padEnd(12)} ${String(count).padStart(3)} commits`)
    .join('\n');

  const reworkRateTable = data.areaReworkRates
    .filter(a => a.total >= 5)
    .map(a => `${a.area.padEnd(12)} ${String(a.rework).padStart(2)}/${String(a.total).padStart(3)} (${String(a.rate).padStart(2)}%)`)
    .join('\n');

  const velocityChart = Object.entries(data.monthlyVelocity)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => `${month} ${'█'.repeat(Math.ceil(count / 3))} ${count}`)
    .join('\n');

  return `# Discovery v3: Developer × Codebase
> Generated ${new Date().toISOString()} | ${elapsedTotal}

## Raw Data

### Area Investment
\`\`\`
${areaTable}
\`\`\`

### Rework Rate: ${data.rework.length}/${data.commits.length} (${reworkPct}%)

By area (min 5 commits):
\`\`\`
${reworkRateTable}
\`\`\`

By type:
${findings.reworkSummary.map(r => `- **${r.category}** (${r.count}): ${r.examples.slice(0, 2).join('; ')}`).join('\n')}

### Monthly Velocity
\`\`\`
${velocityChart}
\`\`\`

### Era Comparison
| | Commits | Rework | Rate |
|---|---|---|---|
| Era 1 (2023) | ${data.era1.length} | ${data.era1Rework.length} | ${Math.round(100 * data.era1Rework.length / data.era1.length)}% |
| Era 2 (2025) | ${data.era2.length} | ${data.era2Rework.length} | ${Math.round(100 * data.era2Rework.length / data.era2.length)}% |

## Interpretations

${findings.cleanInterps.map((interp, i) => `### ${i + 1}\n${interp}`).join('\n\n')}

## What the Code Reveals
${findings.cleanCodeSignals.map(s => `- ${s}`).join('\n')}

## Proposed Automation
${findings.automation}

---
*Source: git log (${data.commits.length} commits), ${Object.keys(data.codeSamples).length} source files, CLAUDE.md, context.md*
*Provenance: derived from repository data + workspace context — safe to delete*
`;
}

// -- Main --

async function main() {
  const overallStart = Date.now();
  console.log('=== Verblets Discovery v3 ===\n');

  const data = gatherAndCrunch();

  // Surface mechanical findings immediately
  const reworkPct = Math.round(100 * data.rework.length / data.commits.length);
  console.log('AREA INVESTMENT:');
  Object.entries(data.areaInvestment)
    .sort(([, a], [, b]) => b - a)
    .forEach(([area, count]) => console.log(`  ${area.padEnd(12)} ${count}`));

  console.log(`\nREWORK: ${data.rework.length}/${data.commits.length} (${reworkPct}%)`);
  console.log('\nPER-AREA REWORK RATES:');
  data.areaReworkRates
    .filter(a => a.total >= 5)
    .forEach(a => console.log(`  ${a.area.padEnd(12)} ${a.rework}/${a.total} (${a.rate}%)`));

  console.log(`\nERA 1 (2023): ${data.era1.length} commits, ${data.era1Rework.length} rework (${Math.round(100 * data.era1Rework.length / data.era1.length)}%)`);
  console.log(`ERA 2 (2025): ${data.era2.length} commits, ${data.era2Rework.length} rework (${Math.round(100 * data.era2Rework.length / data.era2.length)}%)\n`);

  const findings = await analyze(data);

  const total = elapsed(overallStart);

  // Write full output
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = join(OUTPUT_DIR, `${timestamp}-discovery-v3.md`);
  writeFileSync(outputPath, formatOutput(data, findings, total));

  // Surface key findings conversationally
  console.log('\n' + '='.repeat(60));
  console.log('\nINTERPRETATIONS:\n');
  for (const interp of findings.cleanInterps) {
    console.log(`${interp}\n`);
  }
  console.log('CODE SIGNALS:');
  for (const sig of findings.cleanCodeSignals) {
    console.log(`  · ${sig}`);
  }
  console.log('\nPROPOSED AUTOMATION:');
  console.log(findings.automation);
  console.log('\n' + '='.repeat(60));
  console.log(`\nFull output: ${outputPath}`);
  console.log(`Total time: ${total}`);
}

main().catch(err => {
  console.error('Discovery failed:', err);
  process.exit(1);
});

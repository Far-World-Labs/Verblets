#!/usr/bin/env node
/**
 * Derive tables.md, factories.md, and coverage.md from inventory.json.
 *
 * Usage: node .claude/spec/test-inventory/derive.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const INV = join(REPO_ROOT, '.claude/spec/test-inventory/inventory.json');
const TABLES = join(REPO_ROOT, '.claude/spec/test-inventory/tables.md');
const FACTORIES = join(REPO_ROOT, '.claude/spec/test-inventory/factories.md');
const COVERAGE = join(REPO_ROOT, '.claude/spec/test-inventory/coverage.md');

const rows = JSON.parse(readFileSync(INV, 'utf8'));

// ─── tables.md ─────────────────────────────────────────────────────────────

const groups = {};
for (const r of rows) {
  const g = r.proposedTableGroup;
  if (!groups[g]) groups[g] = { rows: [], processors: new Set() };
  groups[g].rows.push(r);
  groups[g].processors.add(r.processorShape);
}

const groupEntries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
const multiRow = groupEntries.filter(([, v]) => v.rows.length > 1);
const singleRow = groupEntries.filter(([, v]) => v.rows.length === 1);

let tables = `# Proposed table groups

Derived from \`inventory.json\` by \`derive.mjs\`. Hand-edit to refine groupings; re-running the script will overwrite.

Each group lists the rows that share an \`inputs\`/\`want\` shape and could share one processor. Singletons (one row only) are listed at the bottom for completeness.

## Multi-row groups (${multiRow.length})

`;

for (const [name, g] of multiRow) {
  const procs = [...g.processors];
  tables += `### ${name}\n\n`;
  tables += `- **Rows**: ${g.rows.length}\n`;
  tables += `- **Files**: ${g.rows.map((r) => `\`${r.file}\``).join(', ')}\n`;
  tables += `- **Processor${procs.length > 1 ? ' (varies)' : ''}**: ${procs.map((p) => '`' + p + '`').join(' / ')}\n`;
  const factories = new Set();
  for (const r of g.rows) for (const f of r.factoryCandidates) factories.add(f);
  if (factories.size) tables += `- **Factories**: ${[...factories].join(', ')}\n`;
  const totalClaims = g.rows.reduce((s, r) => s + (r.claims?.length || 0), 0);
  tables += `- **Total claims**: ${totalClaims}\n\n`;
}

tables += `## Singletons (${singleRow.length})\n\nFiles whose tests don't share a processor with any other file. Listed for completeness; many will absorb into shared groups during migration.\n\n`;
tables += '| Group / file id | Surface | Rows | Pattern | Factories |\n';
tables += '|---|---|---:|---|---|\n';
for (const [name, g] of singleRow) {
  const r = g.rows[0];
  tables += `| \`${name}\` | ${r.surface} | ${r.rowCount} | \`${r.currentPattern}\` | ${r.factoryCandidates.join(', ') || '—'} |\n`;
}

writeFileSync(TABLES, tables);

// ─── factories.md ──────────────────────────────────────────────────────────

const FAMILY_DESCRIPTIONS = {
  LlmMockResponse: {
    base: 'mock response from `callLlm` — well-formed JSON object matching a chain\'s declared `responseFormat`',
    variants: ['wellFormed', 'isNull', 'empty', 'undersizedArray', 'oversizedArray', 'malformedShape', 'rejected', 'rejectedThenResolved'],
    notes: 'Used in every chain spec that mocks `vi.mock(\'../../lib/llm/index.js\')`. Stress tests reimplement variants inline; this is the highest-value family to extract first. Variants `empty` (returns `{}`/`""`), `malformedShape` (wrong field name or type), `rejected` (`mockRejectedValueOnce`), `rejectedThenResolved` (retry path).',
  },
  Scan: {
    base: 'one entry of `{ flagged: boolean, hits: [{ category, score }] }` consumed by `calibrate*`/`detect-patterns`',
    variants: ['unflagged', 'single-category', 'multi-category', 'NaN score', 'missing hits', 'empty hits'],
    notes: 'Drives calibrate, detect-patterns, detect-threshold rows. The shape comes from `probeScan` output.',
  },
  ChainConfig: {
    base: '`{ batchSize, maxParallel, maxAttempts, errorPosture }` — the standard list-orchestrator config',
    variants: ['strictPosture', 'resilientPosture', 'sequential', 'wide', 'smallBatches', 'largeBatches', 'noRetry'],
    notes: 'Cross product with `LlmMockResponse` powers the parametric stress test patterns. `sequential` = `maxParallel: 1`; `wide` = `maxParallel: 8`; `smallBatches` = `batchSize: 1-2`; `largeBatches` = `batchSize: 50+`; `noRetry` = `maxAttempts: 1`.',
  },
  ProgressEvent: {
    base: '`{ event: \'chain:complete\', step, outcome: \'success\'|\'partial\'|\'degraded\', totalItems, successCount, failedItems }`',
    variants: ['success', 'partial', 'degraded', 'error', 'withInput', 'withOutput', 'phase'],
    notes: 'Every partial-outcome assertion across chains looks for these. A `eventsFor(chain)` factory + `assertOutcome(events, step, expected)` helper would replace dozens of inline scans. Variants: `error` adds an `error` field; `withInput`/`withOutput`/`phase` use the matching `event` string.',
  },
  InstructionBundle: {
    base: '`{ text, ...known }` — instruction-as-context bundles consumed by `resolveTexts`',
    variants: ['plainText', 'withSpec', 'withVocabulary', 'withCategories', 'withAnchors', 'withGuidance', 'withCtx'],
    notes: 'Each chain has a known-keys list (`tagInstructions`, `scoreInstructions`, etc.). Factory variants line up with those keys.',
  },
};

const factoryUsage = {};
for (const r of rows) {
  for (const f of r.factoryCandidates) {
    if (!factoryUsage[f]) factoryUsage[f] = [];
    factoryUsage[f].push(r);
  }
}

let factories = `# Factory families

Recurring fixture shapes that should become fishery factories. No factory code is written in this PR — this file *names* and *characterizes* the families, and links each to its consumers in \`inventory.json\`.

The \`factory-like\` count for the repo (inline \`mk*\`/\`make*\`/\`build*\` helpers in spec files) is **134** as of inventory start. Each family below would absorb a slice of those.

`;

const familiesSorted = Object.entries(FAMILY_DESCRIPTIONS).sort(([a], [b]) => (factoryUsage[b]?.length || 0) - (factoryUsage[a]?.length || 0));
for (const [name, desc] of familiesSorted) {
  const consumers = factoryUsage[name] || [];
  factories += `## ${name}\n\n`;
  factories += `**Base**: ${desc.base}.\n\n`;
  factories += `**Variants**:\n`;
  for (const v of desc.variants) factories += `- \`${name}.${v}\`\n`;
  factories += `\n**Consumers** (${consumers.length} files):\n\n`;
  if (consumers.length === 0) {
    factories += `_None detected by enrichment heuristics. Likely under-detected — refine during migration._\n\n`;
  } else {
    factories += `<details><summary>${consumers.length} files (click to expand)</summary>\n\n`;
    for (const c of consumers.slice(0, 50)) factories += `- \`${c.id}\` — ${c.file}\n`;
    if (consumers.length > 50) factories += `- _…and ${consumers.length - 50} more_\n`;
    factories += `\n</details>\n\n`;
  }
  factories += `**Notes**: ${desc.notes}\n\n`;
}

factories += `## Notes on existing test-utils

These are *not* factories — they are real subjects registered in shared contract files. Cross-referenced from inventory rows via \`contractCandidate\`.

- \`src/lib/test-utils/mapper-contracts.spec.js\` — registers 29 mappers across object/numeric/string/enum contracts.
- \`src/lib/test-utils/schema-contracts.spec.js\` — registers value/items/factory schema subjects.
- \`src/lib/test-utils/config-forwarding.js\` — \`testPromptShapingOption()\` helper used by 7 verblets.

## Open decisions

- Whether to adopt fishery or roll a smaller helper. Fishery's \`extend()\` / \`transient\` / \`sequence\` features map well to the variant trees above.
- Whether factory output is asserted via type checks (jsdoc + IDE) or runtime guards (\`expect-shape\`).
- Where factory files live — proposed: \`src/lib/test-utils/factories/<family>.js\`.
`;

writeFileSync(FACTORIES, factories);

// ─── coverage.md ───────────────────────────────────────────────────────────

const counts = {
  spec: rows.filter((r) => r.surface === 'spec').length,
  examples: rows.filter((r) => r.surface === 'examples').length,
  arch: rows.filter((r) => r.surface === 'arch').length,
  stress: rows.filter((r) => r.surface === 'stress').length,
};
const totalClaims = rows.reduce((s, r) => s + (r.claims?.length || 0), 0);
const totalRowCounts = rows.reduce((s, r) => s + (r.rowCount || 0), 0);
const browserExcluded = rows.filter((r) => r.browserVariant === false).length;
const ambiguousStress = rows.filter((r) => r.surface === 'stress' && r.notes?.includes('does not yet exist')).length;
const requiresReporter = rows.filter((r) => r.aiReporterCompat === 'required').length;
const optionalReporter = rows.filter((r) => r.aiReporterCompat === 'optional').length;

const factoryDist = {};
for (const r of rows) for (const f of r.factoryCandidates) factoryDist[f] = (factoryDist[f] || 0) + 1;
const contractDist = {};
for (const r of rows) {
  const k = r.contractCandidate || '(null)';
  contractDist[k] = (contractDist[k] || 0) + 1;
}
const patternDist = rows.reduce((a, r) => { a[r.currentPattern] = (a[r.currentPattern] || 0) + 1; return a; }, {});

let cov = `# Coverage

Auto-generated by \`derive.mjs\`. Re-run after any inventory change.

## Top-line counts

| Surface | Files | Claims (per-test rows) | rowCount sum |
|---|---:|---:|---:|
| \`spec\` | ${counts.spec} | ${rows.filter((r) => r.surface === 'spec').reduce((s, r) => s + (r.claims?.length || 0), 0)} | ${rows.filter((r) => r.surface === 'spec').reduce((s, r) => s + (r.rowCount || 0), 0)} |
| \`examples\` | ${counts.examples} | ${rows.filter((r) => r.surface === 'examples').reduce((s, r) => s + (r.claims?.length || 0), 0)} | ${rows.filter((r) => r.surface === 'examples').reduce((s, r) => s + (r.rowCount || 0), 0)} |
| \`arch\` | ${counts.arch} | ${rows.filter((r) => r.surface === 'arch').reduce((s, r) => s + (r.claims?.length || 0), 0)} | ${rows.filter((r) => r.surface === 'arch').reduce((s, r) => s + (r.rowCount || 0), 0)} |
| \`stress\` | ${counts.stress} | ${rows.filter((r) => r.surface === 'stress').reduce((s, r) => s + (r.claims?.length || 0), 0)} | ${rows.filter((r) => r.surface === 'stress').reduce((s, r) => s + (r.rowCount || 0), 0)} |
| **Total** | **${rows.length}** | **${totalClaims}** | **${totalRowCounts}** |

## Pattern distribution

| Pattern | Files |
|---|---:|
${Object.entries(patternDist).sort(([, a], [, b]) => b - a).map(([k, v]) => `| \`${k}\` | ${v} |`).join('\n')}

## Factory candidate distribution

| Factory | Files using |
|---|---:|
${Object.entries(factoryDist).sort(([, a], [, b]) => b - a).map(([k, v]) => `| \`${k}\` | ${v} |`).join('\n')}

## Contract candidate distribution

| Contract | Files |
|---|---:|
${Object.entries(contractDist).sort(([, a], [, b]) => b - a).map(([k, v]) => `| \`${k}\` | ${v} |`).join('\n')}

## AI reporter

| Compat | Files |
|---|---:|
| \`required\` | ${requiresReporter} |
| \`optional\` | ${optionalReporter} |
| \`n/a\` | ${rows.length - requiresReporter - optionalReporter} |

## Browser exclusions

${browserExcluded} files are excluded from \`vitest.config.browser.js\`.

## Stress targets requiring new spec files

${ambiguousStress} stress files target chain dirs that don't yet have an \`index.spec.js\` (the migration creates one). Listed in inventory rows with \`notes: "target spec does not yet exist..."\`.

## Phase status

| Phase | Surface | Files | Status |
|---|---|---:|---|
| 1 | \`src/lib/**/*.spec.js\` | ${rows.filter((r) => r.surface === 'spec' && r.file.startsWith('src/lib/')).length} | done |
| 2 | \`src/verblets\` + \`src/embed\` + \`src/services\` + \`src/constants\` + \`src/init.spec.js\` + \`src/prompts\` | ${rows.filter((r) => r.surface === 'spec' && (r.file.startsWith('src/verblets/') || r.file.startsWith('src/embed/') || r.file.startsWith('src/services/') || r.file.startsWith('src/constants/') || r.file.startsWith('src/prompts/') || r.file === 'src/init.spec.js')).length} | done |
| 3 | \`src/chains/**/*.spec.js\` | ${rows.filter((r) => r.surface === 'spec' && r.file.startsWith('src/chains/')).length} | done |
| 4 | \`src/**/*.examples.js\` | ${counts.examples} | done |
| 5 | \`index.arch.js\` | ${counts.arch} | done |
| 6 | \`/tmp/*-stress.test.mjs\` | ${counts.stress} | done |

All phases populated mechanically by \`scan.mjs\` + \`scan-stress.mjs\` + \`enrich.mjs\` + \`derive.mjs\`.

## Verification

\`\`\`sh
# File-system count must equal row count per surface.
[ "$(find src -name '*.spec.js' | wc -l)" = "${counts.spec}" ] || echo "spec mismatch"
[ "$(find src -name '*.examples.js' | wc -l)" = "${counts.examples}" ] || echo "examples mismatch"
[ "$(ls /tmp/*-stress.test.mjs 2>/dev/null | wc -l)" = "${counts.stress}" ] || echo "stress mismatch"
\`\`\`

Last run: \`node .claude/spec/test-inventory/derive.mjs\` (current).
`;

writeFileSync(COVERAGE, cov);

console.log('Wrote tables.md, factories.md, coverage.md');
console.log(`  ${multiRow.length} multi-row groups, ${singleRow.length} singletons`);
console.log(`  ${Object.keys(factoryDist).length} factory families with consumers`);

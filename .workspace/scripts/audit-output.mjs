/**
 * audit-output.mjs — Phases 8-9: Synthesize findings, build reports, write output
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import reduce from '../../src/chains/reduce/index.js';
import { DESIGN_DIMENSIONS, OUTPUT_DIR, SYNTHESIS_LLM, elapsed } from './audit-shared.mjs';
import { scorecardSynthesisPrompt, strategicAssessmentPrompt } from './audit-prompts.mjs';

// ============================================================
// Phase 8: Synthesize
// ============================================================

function buildSynthesisData(findings, chains) {
  // Per-dimension distribution
  const dimensionDist = {};
  for (const f of findings) {
    if (!dimensionDist[f.dimension]) dimensionDist[f.dimension] = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    dimensionDist[f.dimension][f.level]++;
  }

  const distSummary = Object.entries(dimensionDist)
    .map(([dim, levels]) =>
      `${dim}: L0=${levels[0]} L1=${levels[1]} L2=${levels[2]} L3=${levels[3]} L4=${levels[4]}`
    )
    .join('\n');

  // Per-chain scores — separate design and impl
  const chainScores = {};
  for (const f of findings) {
    if (!chainScores[f.chain]) chainScores[f.chain] = { tier: f.tier, design: {}, impl: {} };
    if (DESIGN_DIMENSIONS.includes(f.dimension)) {
      chainScores[f.chain].design[f.dimension] = f.level;
    } else {
      chainScores[f.chain].impl[f.dimension] = f.level;
    }
  }

  const chainSummary = Object.entries(chainScores)
    .map(([name, data]) => {
      const designLevels = Object.values(data.design);
      const implLevels = Object.values(data.impl);
      const designAvg = designLevels.length > 0
        ? (designLevels.reduce((s, l) => s + l, 0) / designLevels.length).toFixed(1)
        : '—';
      const implAvg = implLevels.length > 0
        ? (implLevels.reduce((s, l) => s + l, 0) / implLevels.length).toFixed(1)
        : '—';
      const designStr = Object.entries(data.design).map(([d, l]) => `${d}=${l}`).join(', ');
      const implStr = Object.entries(data.impl).map(([d, l]) => `${d}=${l}`).join(', ');
      return `${name} (${data.tier}) | DESIGN avg=${designAvg}: ${designStr} | IMPL avg=${implAvg}: ${implStr}`;
    })
    .join('\n');

  // Top gaps by frequency
  const gapsByDim = {};
  for (const f of findings) {
    if (f.gap) {
      if (!gapsByDim[f.dimension]) gapsByDim[f.dimension] = [];
      gapsByDim[f.dimension].push(`${f.chain}: ${f.gap}`);
    }
  }

  const gapSummary = Object.entries(gapsByDim)
    .map(([dim, gaps]) => `${dim}:\n${gaps.slice(0, 5).map(g => `  - ${g}`).join('\n')}`)
    .join('\n');

  // Chain portfolio overview — only audited chains (those with findings)
  const auditedNames = new Set(findings.map(f => f.chain));
  const portfolioSummary = chains
    .filter(c => auditedNames.has(c.name))
    .map(c => {
      const importList = Object.keys(c.imports).join(', ');
      return `${c.name} (${c.tier}, ${c.sourceLines} lines): imports [${importList}], exports [${c.exports.join(', ')}]`;
    })
    .join('\n');

  return { distSummary, chainSummary, gapSummary, portfolioSummary };
}

export async function synthesize(findings, chains, strategicContext) {
  const { distSummary, chainSummary, gapSummary, portfolioSummary } = buildSynthesisData(findings, chains);

  // 8a: Scorecard synthesis
  const scorecardItems = [
    `DISTRIBUTION BY DIMENSION:\n${distSummary}`,
    `PER-CHAIN SCORES:\n${chainSummary}`,
    `TOP GAPS:\n${gapSummary}`,
    `TOTALS: ${chains.length} chains, ${findings.length} findings across ${[...new Set(findings.map(f => f.dimension))].length} dimensions`,
  ];

  console.log(`  Synthesizing scorecard patterns via reduce...`);
  let scorecardStart = Date.now();

  const scorecardSynthesis = await reduce(
    scorecardItems,
    scorecardSynthesisPrompt(new Date().toISOString()),
    { llm: SYNTHESIS_LLM, initial: '', now: new Date() }
  );

  console.log(`  Scorecard synthesis done (${elapsed(scorecardStart)}s)`);

  // 8b: Strategic assessment — all data in 2 items to reduce recency bias
  // Item 1: context + portfolio (framing), Item 2: all findings data (evidence)
  const contextBlock = strategicContext
    ? `STRATEGIC CONTEXT (from project maintainer):\n${strategicContext}\n\n`
    : '';
  const strategicItems = [
    `${contextBlock}CHAIN PORTFOLIO:\n${portfolioSummary}`,
    `SCORECARD FINDINGS:\n${chainSummary}\n\nGAPS AND PATTERNS:\n${gapSummary}`,
  ];

  console.log(`  Building strategic assessment via reduce...`);
  const strategicStart = Date.now();

  const runTimestamp = new Date().toISOString();
  const strategicAssessment = await reduce(
    strategicItems,
    strategicAssessmentPrompt(runTimestamp),
    { llm: SYNTHESIS_LLM, initial: `CONTEXT: This library already uses response_format with JSON schemas for structured output. Only audited chains have scorecard data — do not invent details about chains not in the scorecard findings. Audited chains: ${[...new Set(findings.map(f => f.chain))].join(', ')}.`, now: new Date() }
  );

  console.log(`  Strategic assessment done (${elapsed(strategicStart)}s)`);

  return { scorecardSynthesis, strategicAssessment };
}

// ============================================================
// Phase 9: Build output
// ============================================================

function buildScoreTable(sortedChains, dims, title) {
  if (dims.length === 0) return '';

  let md = `## ${title}

| Chain | Tier | ${dims.join(' | ')} | Avg |
|-------|------|${dims.map(() => '---').join('|')}|-----|
`;

  for (const [name, data] of sortedChains) {
    const levels = dims.map(d => data.dimensions[d]?.level ?? '—');
    const numericLevels = levels.filter(l => typeof l === 'number');
    const avg = numericLevels.length > 0
      ? (numericLevels.reduce((s, l) => s + l, 0) / numericLevels.length).toFixed(1)
      : '—';
    md += `| ${name} | ${data.tier} | ${levels.join(' | ')} | ${avg} |\n`;
  }

  return md;
}

function buildScorecards(findings, chains) {
  const byChain = {};
  for (const f of findings) {
    if (!byChain[f.chain]) byChain[f.chain] = { tier: f.tier, dimensions: {} };
    byChain[f.chain].dimensions[f.dimension] = f;
  }

  const allDims = [...new Set(findings.map(f => f.dimension))].sort();
  const designDims = allDims.filter(d => DESIGN_DIMENSIONS.includes(d));
  const implDims = allDims.filter(d => !DESIGN_DIMENSIONS.includes(d));
  const sortedChains = Object.entries(byChain).sort(([a], [b]) => a.localeCompare(b));

  let md = `# Maturity Audit Scorecards
> Generated ${new Date().toISOString().split('T')[0]}
> ${chains.length} chains audited, ${findings.length} dimension evaluations

`;

  if (designDims.length > 0) {
    md += buildScoreTable(sortedChains, designDims, 'Tier 1 — Design Fitness');
    md += '\n';

    // Flag chains with low design fitness
    const designAlerts = [];
    for (const [name, data] of sortedChains) {
      const designLevels = designDims
        .map(d => data.dimensions[d]?.level)
        .filter(l => l !== undefined);
      if (designLevels.length > 0) {
        const avg = designLevels.reduce((s, l) => s + l, 0) / designLevels.length;
        if (avg < 2.0) {
          designAlerts.push(`**${name}**: avg ${avg.toFixed(1)} — consider redesign before hardening`);
        }
      }
    }
    if (designAlerts.length > 0) {
      md += '### Design Alerts\n\n';
      md += 'These chains score below 2.0 on design fitness. NFR hardening (Tier 2) should wait until design issues are addressed.\n\n';
      for (const alert of designAlerts) md += `- ${alert}\n`;
      md += '\n';
    }
  }

  if (implDims.length > 0) {
    md += buildScoreTable(sortedChains, implDims, 'Tier 2 — Implementation Quality');
    md += '\n';
  }

  md += '## Detail\n';
  for (const [name, data] of sortedChains) {
    md += `\n### ${name} (${data.tier})\n`;

    // Design fitness first
    const chainDesignDims = designDims.filter(d => data.dimensions[d]);
    if (chainDesignDims.length > 0) {
      md += '\n#### Design Fitness\n\n';
      for (const dim of chainDesignDims) {
        const f = data.dimensions[dim];
        md += `**${dim}** — Level ${f.level}\n`;
        md += `- Evidence: ${f.evidence}\n`;
        if (f.gap) md += `- Gap: ${f.gap}\n`;
        if (f.nextAction) md += `- Next: ${f.nextAction}\n`;
        md += '\n';
      }
    }

    // Implementation quality second
    const chainImplDims = implDims.filter(d => data.dimensions[d]);
    if (chainImplDims.length > 0) {
      md += '\n#### Implementation Quality\n\n';
      for (const dim of chainImplDims) {
        const f = data.dimensions[dim];
        md += `**${dim}** — Level ${f.level}\n`;
        md += `- Evidence: ${f.evidence}\n`;
        if (f.gap) md += `- Gap: ${f.gap}\n`;
        if (f.nextAction) md += `- Next: ${f.nextAction}\n`;
        md += '\n';
      }
    }
  }

  return md;
}

function buildDimensionUpdates(findings, scorecardSynthesis) {
  const byDim = {};
  for (const f of findings) {
    if (!byDim[f.dimension]) byDim[f.dimension] = [];
    byDim[f.dimension].push(f);
  }

  let md = `# Suggested Dimension Updates
> Generated ${new Date().toISOString().split('T')[0]}
> Review and merge relevant observations into .workspace/maturity/*.md

## Synthesis

${scorecardSynthesis}

## Per-Dimension Findings

`;

  for (const [dim, dimFindings] of Object.entries(byDim).sort(([a], [b]) => a.localeCompare(b))) {
    md += `### ${dim}\n\n`;

    const dist = { 0: [], 1: [], 2: [], 3: [], 4: [] };
    for (const f of dimFindings) dist[f.level].push(f.chain);

    md += '**Distribution:**\n';
    for (const [level, names] of Object.entries(dist)) {
      if (names.length > 0) md += `- Level ${level}: ${names.join(', ')}\n`;
    }
    md += '\n';

    const gaps = dimFindings.filter(f => f.gap).map(f => `${f.chain}: ${f.gap}`);
    if (gaps.length > 0) {
      md += '**Gaps:**\n';
      for (const g of gaps) md += `- ${g}\n`;
      md += '\n';
    }
  }

  return md;
}

function buildStrategicAssessment(assessment) {
  return `# Strategic Assessment
> Generated ${new Date().toISOString().split('T')[0]}
> Portfolio-level analysis grounded in maturity audit findings + strategic context

${assessment}
`;
}

function buildWorkspaceUpdates(findings, rejected) {
  const total = findings.length + rejected.length;
  const rejectionRate = total > 0
    ? ((rejected.length / total) * 100).toFixed(1)
    : '0.0';

  let md = `# Workspace Updates
> Generated ${new Date().toISOString().split('T')[0]}

## Self-Assessment Quality

| Metric | Value |
|--------|-------|
| Findings produced | ${total} |
| Findings accepted | ${findings.length} |
| Findings rejected | ${rejected.length} |
| Rejection rate | ${rejectionRate}% |

### Rejection breakdown

`;

  const byReason = {};
  for (const r of rejected) {
    for (const reason of r.rejectionReasons) {
      byReason[reason] = (byReason[reason] || 0) + 1;
    }
  }
  for (const [reason, count] of Object.entries(byReason).sort(([, a], [, b]) => b - a)) {
    md += `- ${reason}: ${count}\n`;
  }

  if (rejected.length > 0) {
    md += '\n### Rejected findings\n\n';
    for (const r of rejected) {
      md += `- [${r.chain}/${r.dimension}] Level ${r.level} — ${r.rejectionReasons.join('; ')}\n`;
    }
  }

  return md;
}

function buildIndex(findings, chains) {
  const timestamp = new Date().toISOString();
  const chainCount = chains.length;
  const dimensionCount = [...new Set(findings.map(f => f.dimension))].length;
  const avgLevel = findings.length > 0
    ? (findings.reduce((s, f) => s + f.level, 0) / findings.length).toFixed(1)
    : '—';

  const chainNames = [...new Set(findings.map(f => f.chain))].sort();

  return `# Maturity Audit Results
> Run: ${timestamp} | Chains: ${chainCount} | Dimensions: ${dimensionCount} | Avg level: ${avgLevel}

Chains audited: ${chainNames.join(', ')}

## Reading order

1. **scorecards.md** — Start here. Per-chain scorecard grid with design alerts.
2. **strategic-assessment.md** — Portfolio-level: which designs are sound, which need rework.
3. **dimension-updates.md** — Per-dimension gaps. Use to update maturity rubrics.
4. **workspace-updates.md** — Self-assessment quality: rejection rate, breakdown by reason.

## cache/

Phase cache (JSON). Use \`--phase N\` to resume from any phase. Delete \`cache/\` to force full re-evaluation.

| File | Phase | What's in it |
|------|-------|-------------|
| 1-gathered.json | 1. Gather | Chain source, imports, exports, metadata |
| 2-prechecked.json | 2. Pre-check | Chains with deterministic ceilings |
| 2-deterministic.json | 2. Pre-check | Findings from deterministic analysis |
| 3-design-findings.json | 3. Design eval | Tier 1 dimension evaluations |
| 4-code-findings.json | 4. Code eval | Code dimension evaluations |
| 5-interface-findings.json | 5. Interface eval | Interface dimension evaluations |
| 6-prompt-findings.json | 6. Prompt eval | Prompt engineering evaluations |
| 7-validated.json | 7. Self-assess | Accepted findings |
| 7-rejected.json | 7. Self-assess | Rejected findings with reasons |
| 8-synthesis.json | 8. Synthesize | Scorecard + strategic assessment text |
`;
}

// ============================================================
// Write output (atomic: build all in memory, then write; index.md last)
// ============================================================

export async function writeOutput(findings, rejected, synthesis, chains) {
  // Build all content in memory first — if any build fails, no partial output
  const scorecards = buildScorecards(findings, chains);
  const dimUpdates = buildDimensionUpdates(findings, synthesis.scorecardSynthesis);
  const strategic = buildStrategicAssessment(synthesis.strategicAssessment);
  const wsUpdates = buildWorkspaceUpdates(findings, rejected);
  const index = buildIndex(findings, chains);

  // Write all files — index.md last (its presence signals a complete run)
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(join(OUTPUT_DIR, 'scorecards.md'), scorecards);
  await writeFile(join(OUTPUT_DIR, 'dimension-updates.md'), dimUpdates);
  await writeFile(join(OUTPUT_DIR, 'strategic-assessment.md'), strategic);
  await writeFile(join(OUTPUT_DIR, 'workspace-updates.md'), wsUpdates);
  await writeFile(join(OUTPUT_DIR, 'index.md'), index);

  console.log(`  Written to ${OUTPUT_DIR}/`);
  console.log(`    scorecards.md`);
  console.log(`    dimension-updates.md`);
  console.log(`    strategic-assessment.md`);
  console.log(`    workspace-updates.md`);
  console.log(`    index.md`);
}

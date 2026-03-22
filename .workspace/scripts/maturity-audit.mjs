/**
 * Maturity Audit — Verblets Composition + Self-Assessment
 *
 * Two-tier evaluation:
 *   Tier 1 — Design Fitness: strategic value, architectural fitness,
 *            generalizability, composition fit, design efficiency
 *   Tier 2 — Implementation Quality: logging, events, browser-server,
 *            code-quality, token-management, errors-retry, documentation,
 *            api-surface, composability, testing, prompt-engineering
 *
 * Phases:
 *   1. Gather — Read source, README, tests, imports, exports for each chain
 *   2. Pre-check — Deterministic ceiling detection from imports (no LLM)
 *   3. Evaluate design fitness — map: Tier 1 dimensions
 *   4. Evaluate code dimensions — map: logging, events, browser-server,
 *      code-quality, token-management, errors-retry
 *   5. Evaluate interface dimensions — map: documentation, api-surface,
 *      composability, testing
 *   6. Evaluate prompt dimension — map: prompt-engineering
 *   7. Self-assess — deterministic validation + LLM filter
 *   8. Synthesize — reduce: scorecard synthesis + strategic assessment
 *   9. Output — Write scorecards, dimension updates, strategic assessment
 *
 * Usage:
 *   node .workspace/scripts/maturity-audit.mjs [options]
 *
 *   --chains name1,name2    Only audit specific chains
 *   --dimensions a,b,c      Only evaluate specific dimensions
 *   --phase N               Resume from phase N
 *   --tier core|standard    Only audit chains in this tier
 *   --dry-run               Phases 1-2 only (deterministic, no LLM cost)
 */

import dotenv from 'dotenv';

// Load .env from project root
dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

import {
  OUTPUT_DIR, ARCHIVE_DIR, ALL_DIMENSIONS,
  elapsed, savePhase, loadPhase, archiveRun,
} from './audit-shared.mjs';
import { gatherChains, preCheck, extractDeterministicFindings } from './audit-gather.mjs';
import {
  loadRubrics, loadStrategicContext,
  evaluateDesignFitness, evaluateCodeDimensions,
  evaluateInterfaceDimensions, evaluatePromptDimension,
} from './audit-evaluate.mjs';
import { selfAssess } from './audit-assess.mjs';
import { synthesize, writeOutput } from './audit-output.mjs';

// ============================================================
// CLI parsing
// ============================================================

function parseArgs(argv) {
  const args = argv.slice(2);
  let chainFilter, dimensionFilter, tierFilter;
  let startPhase = 1;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--chains' && args[i + 1]) {
      chainFilter = args[i + 1].split(',');
      i++;
    } else if (args[i] === '--dimensions' && args[i + 1]) {
      dimensionFilter = args[i + 1].split(',');
      i++;
    } else if (args[i] === '--phase' && args[i + 1]) {
      startPhase = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--tier' && args[i + 1]) {
      tierFilter = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  return { chainFilter, dimensionFilter, tierFilter, startPhase, dryRun };
}

// ============================================================
// Phase orchestration
// ============================================================

async function main() {
  const totalStart = Date.now();
  const { chainFilter, dimensionFilter, tierFilter, startPhase, dryRun } = parseArgs(process.argv);

  console.log('Maturity Audit — Verblets Composition + Self-Assessment\n');
  if (chainFilter) console.log(`  Chains: ${chainFilter.join(', ')}`);
  if (dimensionFilter) console.log(`  Dimensions: ${dimensionFilter.join(', ')}`);
  if (tierFilter) console.log(`  Tier: ${tierFilter}`);
  if (startPhase > 1) console.log(`  Resuming from phase ${startPhase}`);
  if (dryRun) console.log(`  DRY RUN (phases 1-2 only)`);

  // Archive previous run on fresh start (skip on --phase resume)
  if (startPhase <= 1) {
    const archived = await archiveRun(OUTPUT_DIR, ARCHIVE_DIR);
    if (archived) console.log(`  Archived previous run to ${archived}`);
  }

  // Load rubrics and strategic context
  const rubrics = await loadRubrics(dimensionFilter);
  const strategicContext = await loadStrategicContext();
  console.log(`  Loaded ${Object.keys(rubrics).length} dimension rubrics`);
  if (strategicContext) console.log(`  Loaded strategic context`);

  // Phase 1: Gather
  console.log('\nPhase 1: Gather chain data');
  let chains;
  if (startPhase <= 1) {
    chains = await gatherChains(chainFilter, tierFilter);
    console.log(`  Found ${chains.length} chains`);
    for (const c of chains) {
      console.log(`    ${c.name} (${c.tier}) — ${c.sourceLines} lines, ${Object.keys(c.imports).length} imports, ${c.exports.length} named exports`);
    }
    await savePhase('1-gathered', chains);
  } else {
    chains = await loadPhase('1-gathered');
  }

  // Phase 2: Pre-check
  console.log('\nPhase 2: Pre-check (deterministic ceilings)');
  let deterministicFindings;
  if (startPhase <= 2) {
    chains = preCheck(chains, dimensionFilter);
    deterministicFindings = extractDeterministicFindings(chains, dimensionFilter);
    for (const c of chains) {
      const ceilingStr = Object.entries(c.ceilings)
        .map(([d, l]) => `${d}\u2264${l}`)
        .join(', ');
      console.log(`    ${c.name}: ${ceilingStr || '(no ceilings)'} | LLM needed: ${c.dimensionsNeedingLLM.length}/${ALL_DIMENSIONS.length}`);
    }
    if (deterministicFindings.length > 0) {
      console.log(`  Deterministic findings: ${deterministicFindings.length}`);
    }
    await savePhase('2-prechecked', chains);
    await savePhase('2-deterministic', deterministicFindings);
  } else {
    chains = await loadPhase('2-prechecked');
    deterministicFindings = await loadPhase('2-deterministic') || [];
  }

  if (dryRun) {
    console.log(`\nDry run complete in ${elapsed(totalStart)}s`);
    return;
  }

  // Phase 3: Evaluate design fitness
  console.log('\nPhase 3: Evaluate design fitness');
  let designFindings;
  if (startPhase <= 3) {
    designFindings = await evaluateDesignFitness(chains, rubrics, dimensionFilter);
    console.log(`  Produced ${designFindings.length} design findings`);
    await savePhase('3-design-findings', designFindings);
  } else {
    designFindings = await loadPhase('3-design-findings') || [];
  }

  // Phase 4: Evaluate code dimensions
  console.log('\nPhase 4: Evaluate code dimensions');
  let codeFindings;
  if (startPhase <= 4) {
    codeFindings = await evaluateCodeDimensions(chains, rubrics, dimensionFilter);
    console.log(`  Produced ${codeFindings.length} code findings`);
    await savePhase('4-code-findings', codeFindings);
  } else {
    codeFindings = await loadPhase('4-code-findings') || [];
  }

  // Phase 5: Evaluate interface dimensions
  console.log('\nPhase 5: Evaluate interface dimensions');
  let interfaceFindings;
  if (startPhase <= 5) {
    interfaceFindings = await evaluateInterfaceDimensions(chains, rubrics, dimensionFilter);
    console.log(`  Produced ${interfaceFindings.length} interface findings`);
    await savePhase('5-interface-findings', interfaceFindings);
  } else {
    interfaceFindings = await loadPhase('5-interface-findings') || [];
  }

  // Phase 6: Evaluate prompt dimension
  console.log('\nPhase 6: Evaluate prompt dimension');
  let promptFindings;
  if (startPhase <= 6) {
    promptFindings = await evaluatePromptDimension(chains, rubrics, dimensionFilter);
    console.log(`  Produced ${promptFindings.length} prompt findings`);
    await savePhase('6-prompt-findings', promptFindings);
  } else {
    promptFindings = await loadPhase('6-prompt-findings') || [];
  }

  const llmFindings = [...designFindings, ...codeFindings, ...interfaceFindings, ...promptFindings];
  console.log(`\n  Total LLM findings: ${llmFindings.length}`);

  // Phase 7: Self-assess (LLM findings only — deterministic findings bypass)
  console.log('\nPhase 7: Self-assess findings');
  let validated, rejected;
  if (startPhase <= 7) {
    const assessment = await selfAssess(llmFindings, chains);
    validated = [...deterministicFindings, ...assessment.validated];
    rejected = assessment.rejected;
    console.log(`  Final validated: ${validated.length} (${deterministicFindings.length} deterministic + ${assessment.validated.length} LLM)`);
    console.log(`  Rejected: ${rejected.length}`);
    await savePhase('7-validated', validated);
    await savePhase('7-rejected', rejected);
  } else {
    validated = await loadPhase('7-validated') || [];
    rejected = await loadPhase('7-rejected') || [];
  }

  // Phase 8: Synthesize
  console.log('\nPhase 8: Synthesize');
  let synthesis;
  if (startPhase <= 8) {
    synthesis = await synthesize(validated, chains, strategicContext);
    await savePhase('8-synthesis', synthesis);
  } else {
    synthesis = await loadPhase('8-synthesis');
  }

  // Phase 9: Output
  console.log('\nPhase 9: Write output');
  await writeOutput(validated, rejected, synthesis, chains);

  console.log(`\nDone in ${elapsed(totalStart)}s`);

  // Quick summary
  if (validated.length > 0) {
    const dims = [...new Set(validated.map(f => f.dimension))];
    const avgLevel = validated.reduce((s, f) => s + f.level, 0) / validated.length;
    const total = validated.length + rejected.length;
    console.log(`\nAverage level: ${avgLevel.toFixed(1)} across ${dims.length} dimensions`);
    console.log(`Rejection rate: ${((rejected.length / total) * 100).toFixed(1)}%`);
    console.log(`Output: ${OUTPUT_DIR}/`);
  }
}

main().catch((err) => {
  console.error('Maturity audit failed:', err);
  process.exit(1);
});

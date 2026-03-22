/**
 * audit-evaluate.mjs — Phases 3-6: LLM evaluation of design, code, interface, prompt dimensions
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import map from '../../src/chains/map/index.js';
import {
  MATURITY_DIR, DESIGN_DIMENSIONS, CODE_DIMENSIONS, INTERFACE_DIMENSIONS,
  ALL_DIMENSIONS, LLM, elapsed, parseJsonFromLLM,
} from './audit-shared.mjs';
import {
  designEvalPrompt, codeEvalPrompt, interfaceEvalPrompt, PROMPT_EVAL_PROMPT,
} from './audit-prompts.mjs';

// ============================================================
// Rubric loading
// ============================================================

export async function loadRubrics(dimensionFilter) {
  const rubrics = {};
  const dimensions = dimensionFilter || ALL_DIMENSIONS;

  for (const dim of dimensions) {
    const filePath = join(MATURITY_DIR, `${dim}.md`);
    try {
      rubrics[dim] = await readFile(filePath, 'utf-8');
    } catch {
      console.warn(`  Warning: no rubric file for dimension '${dim}'`);
    }
  }

  return rubrics;
}

export async function loadStrategicContext() {
  const filePath = join(MATURITY_DIR, 'strategic-context.md');
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return undefined;
  }
}

// ============================================================
// Phase 3: Evaluate design fitness (LLM, map)
// ============================================================

function buildDesignEvalItem(chain, rubrics, portfolioContext) {
  const rubricText = DESIGN_DIMENSIONS
    .filter(dim => rubrics[dim])
    .map(dim => `\n--- RUBRIC: ${dim} ---\n${rubrics[dim]}`)
    .join('');

  const importList = Object.keys(chain.imports).join(', ') || '(none)';
  const chainImports = Object.keys(chain.imports)
    .filter(k => k.startsWith('chains/') || k.startsWith('../'))
    .join(', ') || '(none)';

  const readmePart = chain.readme
    ? `\n---README (first 2000 chars)---\n${chain.readme.slice(0, 2000)}`
    : '\n(no README)';

  return `CHAIN: ${chain.name} (tier: ${chain.tier})
LINES OF CODE: ${chain.sourceLines}
FILES IN MODULE: ${chain.fileCount || 'unknown'}
ALL IMPORTS: ${importList}
CHAIN-LEVEL IMPORTS (uses other chains): ${chainImports}
EXPORTS: ${chain.exports.join(', ') || '(default only)'}
HAS DEFAULT EXPORT: ${chain.hasDefault}
HAS SPEC PATTERN: ${chain.hasSpecPattern}
CONFIG PARAMS: ${chain.configParams.join(', ') || '(none)'}

PORTFOLIO CONTEXT (other chains in the library):
${portfolioContext}
${readmePart}

---SOURCE CODE (first 6000 chars)---
${chain.source.slice(0, 6000)}${rubricText}`;
}

export async function evaluateDesignFitness(chains, rubrics, dimensionFilter) {
  const dimensions = DESIGN_DIMENSIONS.filter(d =>
    (!dimensionFilter || dimensionFilter.includes(d)) && rubrics[d]
  );
  if (dimensions.length === 0) return [];

  // Build portfolio context: what other chains exist and what they do
  const portfolioContext = chains
    .map(c => `  ${c.name} (${c.tier}, ${c.sourceLines} lines): exports [${c.exports.join(', ') || 'default'}]`)
    .join('\n');

  const items = chains.map(c => buildDesignEvalItem(c, rubrics, portfolioContext));
  const dimensionList = dimensions.map(d => `"${d}"`).join(', ');

  console.log(`  Evaluating ${dimensions.length} design dimensions across ${items.length} chains...`);
  const start = Date.now();

  const results = await map(
    items,
    designEvalPrompt(dimensionList),
    { llm: LLM, batchSize: 1, maxTokenBudget: 32000, outputRatio: 0.5 }
  );

  console.log(`  Evaluated in ${elapsed(start)}s`);

  const findings = [];
  chains.forEach((chain, i) => {
    const parsed = parseJsonFromLLM(results[i]);
    if (!parsed?.dimensions) {
      console.warn(`  Warning: failed to parse design eval for ${chain.name}`);
      return;
    }

    for (const dim of dimensions) {
      const eval_ = parsed.dimensions[dim];
      if (!eval_) continue;
      findings.push({
        chain: chain.name,
        tier: chain.tier,
        dimension: dim,
        phase: 'design',
        level: eval_.level,
        evidence: eval_.evidence || '',
        gap: eval_.gap || '',
        nextAction: eval_.nextAction || '',
      });
    }
  });

  return findings;
}

// ============================================================
// Phase 4: Evaluate code dimensions (LLM, map)
// ============================================================

function buildCodeEvalItem(chain, rubrics, dimensions) {
  const ceilingsText = dimensions
    .map(dim => {
      const ceiling = chain.ceilings[dim];
      return ceiling !== undefined ? `  ${dim}: max level ${ceiling}` : `  ${dim}: no ceiling`;
    })
    .join('\n');

  const rubricText = dimensions
    .filter(dim => rubrics[dim])
    .map(dim => `\n--- RUBRIC: ${dim} ---\n${rubrics[dim]}`)
    .join('');

  const importList = Object.keys(chain.imports).join(', ') || '(none)';

  return `CHAIN: ${chain.name} (tier: ${chain.tier}, ${chain.sourceLines} lines)
IMPORTS: ${importList}
EXPORTS: ${chain.exports.join(', ') || '(default only)'}
CONFIG PARAMS: ${chain.configParams.join(', ') || '(none)'}
DETERMINISTIC CEILINGS (your evaluation MUST NOT exceed these):
${ceilingsText}

---SOURCE CODE---
${chain.source}${rubricText}`;
}

export async function evaluateCodeDimensions(chains, rubrics, dimensionFilter) {
  const dimensions = CODE_DIMENSIONS.filter(d =>
    (!dimensionFilter || dimensionFilter.includes(d)) && rubrics[d]
  );
  if (dimensions.length === 0) return [];

  const relevantChains = chains.filter(c =>
    dimensions.some(d => c.dimensionsNeedingLLM.includes(d))
  );
  if (relevantChains.length === 0) return [];

  const items = relevantChains.map(c => buildCodeEvalItem(c, rubrics, dimensions));
  const dimensionList = dimensions.map(d => `"${d}"`).join(', ');

  console.log(`  Evaluating ${dimensions.length} code dimensions across ${items.length} chains...`);
  const start = Date.now();

  const results = await map(
    items,
    codeEvalPrompt(dimensionList),
    { llm: LLM, batchSize: 1, maxTokenBudget: 32000, outputRatio: 0.5 }
  );

  console.log(`  Evaluated in ${elapsed(start)}s`);

  const findings = [];
  relevantChains.forEach((chain, i) => {
    const parsed = parseJsonFromLLM(results[i]);
    if (!parsed?.dimensions) {
      console.warn(`  Warning: failed to parse code eval for ${chain.name}`);
      return;
    }

    for (const dim of dimensions) {
      const eval_ = parsed.dimensions[dim];
      if (!eval_) continue;
      findings.push({
        chain: chain.name,
        tier: chain.tier,
        dimension: dim,
        phase: 'code',
        level: Math.min(eval_.level, chain.ceilings[dim] ?? 4),
        evidence: eval_.evidence || '',
        gap: eval_.gap || '',
        nextAction: eval_.nextAction || '',
      });
    }
  });

  return findings;
}

// ============================================================
// Phase 5: Evaluate interface dimensions (LLM, map)
// ============================================================

function buildInterfaceEvalItem(chain, rubrics, dimensions) {
  const ceilingsText = dimensions
    .map(dim => {
      const ceiling = chain.ceilings[dim];
      return ceiling !== undefined ? `  ${dim}: max level ${ceiling}` : `  ${dim}: no ceiling`;
    })
    .join('\n');

  const rubricText = dimensions
    .filter(dim => rubrics[dim])
    .map(dim => `\n--- RUBRIC: ${dim} ---\n${rubrics[dim]}`)
    .join('');

  const readmePart = chain.readme
    ? `\n---README---\n${chain.readme}`
    : '\n(no README)';

  const testInfo = [
    chain.testFiles.hasSpec ? 'has index.spec.js' : 'no spec tests',
    chain.testFiles.hasExamples ? 'has index.examples.js' : 'no example tests',
    chain.testFiles.usesAiExpect ? 'uses aiExpect' : 'no aiExpect',
  ].join(', ');

  return `CHAIN: ${chain.name} (tier: ${chain.tier}, ${chain.sourceLines} lines)
EXPORTS: ${chain.exports.join(', ') || '(default only)'}
HAS DEFAULT EXPORT: ${chain.hasDefault}
CONFIG PARAMS: ${chain.configParams.join(', ') || '(none)'}
CHAIN-SPECIFIC PARAMS: ${chain.chainSpecificParams.join(', ') || '(none)'}
HAS SPEC PATTERN: ${chain.hasSpecPattern}
TESTING: ${testInfo}
DETERMINISTIC CEILINGS:
${ceilingsText}

---SOURCE CODE (first 4000 chars)---
${chain.source.slice(0, 4000)}${readmePart}
${rubricText}`;
}

export async function evaluateInterfaceDimensions(chains, rubrics, dimensionFilter) {
  const dimensions = INTERFACE_DIMENSIONS.filter(d =>
    (!dimensionFilter || dimensionFilter.includes(d)) && rubrics[d]
  );
  if (dimensions.length === 0) return [];

  const relevantChains = chains.filter(c =>
    dimensions.some(d => c.dimensionsNeedingLLM.includes(d))
  );
  if (relevantChains.length === 0) return [];

  const items = relevantChains.map(c => buildInterfaceEvalItem(c, rubrics, dimensions));
  const dimensionList = dimensions.map(d => `"${d}"`).join(', ');

  console.log(`  Evaluating ${dimensions.length} interface dimensions across ${items.length} chains...`);
  const start = Date.now();

  const results = await map(
    items,
    interfaceEvalPrompt(dimensionList),
    { llm: LLM, batchSize: 1, maxTokenBudget: 32000, outputRatio: 0.5 }
  );

  console.log(`  Evaluated in ${elapsed(start)}s`);

  const findings = [];
  relevantChains.forEach((chain, i) => {
    const parsed = parseJsonFromLLM(results[i]);
    if (!parsed?.dimensions) {
      console.warn(`  Warning: failed to parse interface eval for ${chain.name}`);
      return;
    }

    for (const dim of dimensions) {
      const eval_ = parsed.dimensions[dim];
      if (!eval_) continue;
      findings.push({
        chain: chain.name,
        tier: chain.tier,
        dimension: dim,
        phase: 'interface',
        level: Math.min(eval_.level, chain.ceilings[dim] ?? 4),
        evidence: eval_.evidence || '',
        gap: eval_.gap || '',
        nextAction: eval_.nextAction || '',
      });
    }
  });

  return findings;
}

// ============================================================
// Phase 6: Evaluate prompt dimension (LLM, map)
// ============================================================

function buildPromptEvalItem(chain, rubrics) {
  const promptImports = Object.keys(chain.imports)
    .filter(k => k === 'prompts' || k.startsWith('prompts/'))
    .join(', ') || '(no prompt imports)';

  return `CHAIN: ${chain.name} (tier: ${chain.tier}, ${chain.sourceLines} lines)
PROMPT-RELATED IMPORTS: ${promptImports}
ALL IMPORTS: ${Object.keys(chain.imports).join(', ') || '(none)'}

---SOURCE CODE---
${chain.source}

--- RUBRIC: prompt-engineering ---
${rubrics['prompt-engineering']}`;
}

export async function evaluatePromptDimension(chains, rubrics, dimensionFilter) {
  if (dimensionFilter && !dimensionFilter.includes('prompt-engineering')) return [];
  if (!rubrics['prompt-engineering']) return [];

  const relevantChains = chains.filter(c =>
    c.dimensionsNeedingLLM.includes('prompt-engineering')
  );
  if (relevantChains.length === 0) return [];

  const items = relevantChains.map(c => buildPromptEvalItem(c, rubrics));

  console.log(`  Evaluating prompt-engineering across ${items.length} chains...`);
  const start = Date.now();

  const results = await map(
    items,
    PROMPT_EVAL_PROMPT,
    { llm: LLM, batchSize: 1, maxTokenBudget: 16000 }
  );

  console.log(`  Evaluated in ${elapsed(start)}s`);

  const findings = [];
  relevantChains.forEach((chain, i) => {
    const parsed = parseJsonFromLLM(results[i]);
    if (parsed?.level === undefined) {
      console.warn(`  Warning: failed to parse prompt eval for ${chain.name}`);
      return;
    }
    findings.push({
      chain: chain.name,
      tier: chain.tier,
      dimension: 'prompt-engineering',
      phase: 'prompt',
      level: parsed.level,
      evidence: parsed.evidence || '',
      gap: parsed.gap || '',
      nextAction: parsed.nextAction || '',
    });
  });

  return findings;
}

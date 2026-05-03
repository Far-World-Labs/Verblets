#!/usr/bin/env node
/**
 * Enrichment pass: fills in proposedTableGroup, processorShape, factoryCandidates,
 * contractCandidate using heuristics based on the file source. Outliers and
 * cross-cutting groupings get hand-curated in tables.md afterwards.
 *
 * Usage: node .claude/spec/test-inventory/enrich.mjs
 *
 * Reads .claude/spec/test-inventory/inventory.json, rewrites it in place.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const INV_PATH = join(REPO_ROOT, '.claude/spec/test-inventory/inventory.json');

const KNOWN_CONTRACT_FILES = {
  'src/lib/test-utils/mapper-contracts.spec.js': 'option-mapper',
  'src/lib/test-utils/schema-contracts.spec.js': 'auto-unwrap-schema',
  'src/lib/test-utils/config-integration.spec.js': 'config-pipeline-integration',
};

// Subjects whose tests typically register prompt-shaping forwarding via testPromptShapingOption.
const PROMPT_SHAPING_FORWARDERS = new Set([
  'embed-step-back', 'embed-multi-query', 'embed-subquestions', 'commonalities',
  'fill-missing', 'intent', 'filter',
]);

function detectFactories(source, surface) {
  const factories = new Set();
  if (/\bcallLlm\b|\bvi\.mock\(['"][^'"]*\/lib\/llm\//.test(source)) factories.add('LlmMockResponse');
  if (/\bvi\.mock\(['"][^'"]*\/lib\/parallel-batch\//.test(source) || /\bmaxParallel\b/.test(source) || /\bbatchSize\b/.test(source)) factories.add('ChainConfig');
  if (/\bchain:complete\b|\boutcome:\s*['"]partial|\boutcome:\s*['"]degraded|\bemitter\.complete/.test(source)) factories.add('ProgressEvent');
  if (/\bflagged\s*:|\bhits\s*:\s*\[\s*\{[^}]*category/.test(source)) factories.add('Scan');
  if (/\bspec\s*:|\bvocabulary\s*:|\bcategories\s*:|\banchors\s*:|\bresolveTexts\b/.test(source)) factories.add('InstructionBundle');
  return [...factories];
}

function detectContract(file, source) {
  if (KNOWN_CONTRACT_FILES[file]) return KNOWN_CONTRACT_FILES[file];
  if (/\btestPromptShapingOption\b/.test(source)) return 'prompt-shaping-forwarding';
  // Subjects matching prompt shaping forwarders without explicit helper still cross-reference.
  return null;
}

function deriveProposedGroup(row) {
  // Strip the surface prefix; the file-id is the natural per-file group.
  const tail = row.id.replace(/^(spec|examples|stress|arch)\./, '');
  return tail;
}

function deriveProcessorShape(row, source) {
  // Pull the default-imported subject and the shape of its first test call to suggest a processor.
  const importMatch = source.match(/^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]\.\/(?:index)?['"];?/m);
  const fn = importMatch ? importMatch[1] : row.subject;

  // Heuristic from current pattern.
  switch (row.currentPattern) {
    case 'object-driven':
    case 'it.each-object':
      return `(inputs) => ${fn}(...spread(inputs))`;
    case 'it.each-tuple':
      return `(...args) => ${fn}(...args)`;
    case 'streaming':
      return `async function* (inputs) { yield* ${fn}(inputs) }`;
    case 'interactive':
      return `(steps) => runWithFakeTimers(steps)`;
    default:
      return `(inputs) => ${fn}(inputs)`;
  }
}

function loadSource(rel) {
  try { return readFileSync(join(REPO_ROOT, rel), 'utf8'); } catch { return ''; }
}

const rows = JSON.parse(readFileSync(INV_PATH, 'utf8'));

let touched = 0;
for (const row of rows) {
  const source = loadSource(row.file);
  if (!source) continue;

  if (row.proposedTableGroup === '<pending>') {
    row.proposedTableGroup = deriveProposedGroup(row);
    touched++;
  }
  if (row.processorShape === '<pending>') {
    row.processorShape = deriveProcessorShape(row, source);
  }
  if (row.factoryCandidates.length === 0) {
    const f = detectFactories(source, row.surface);
    if (f.length) row.factoryCandidates = f;
  }
  if (row.contractCandidate === null) {
    row.contractCandidate = detectContract(row.file, source);
  }
}

writeFileSync(INV_PATH, JSON.stringify(rows, null, 2) + '\n');
console.log(`enriched ${touched} rows (proposedTableGroup); inventory has ${rows.length} rows`);

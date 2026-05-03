#!/usr/bin/env node
/**
 * Append stress + arch rows to inventory.json.
 *
 * Stress files live in /tmp/*-stress.test.mjs. Each becomes one row whose
 * `file` is the *target* spec path the rows will land in once migration
 * begins, and whose `stressOrigin` is the /tmp path.
 *
 * Arch: index.arch.js at repo root → one row.
 *
 * Usage: node .claude/spec/test-inventory/scan-stress.mjs
 *        (Reads /tmp/ and appends to .claude/spec/test-inventory/inventory.json.)
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const INV_PATH = join(REPO_ROOT, '.claude/spec/test-inventory/inventory.json');

function safeFiles(dir, pattern) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => pattern.test(n)).map((n) => join(dir, n));
}

function countItCalls(source) {
  return (source.match(/\b(?:it|test)(?:\.skip|\.only|\.todo|\.concurrent)?\s*\(/g) || []).length;
}

function extractClaims(source) {
  const claims = [];
  const itRe = /\b(?:it|test)(?:\.skip|\.only|\.todo|\.concurrent)?\s*\(\s*(['"`])([^\\1]*?)\1/g;
  let m;
  while ((m = itRe.exec(source))) claims.push(m[2]);
  const seen = new Set();
  const out = [];
  for (const c of claims) {
    const k = c.trim();
    if (!k) continue;
    if (seen.has(k)) {
      let i = 2;
      while (seen.has(`${k} (${i})`)) i++;
      const tagged = `${k} (${i})`;
      seen.add(tagged);
      out.push(tagged);
    } else {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

function detectFactoriesStress(source) {
  const f = new Set();
  // Stress tests heavily exercise malformed LLM responses, partial outcomes, etc.
  if (/\bcallLlm\b|\bvi\.mock\(['"][^'"]*\/lib\/llm\//.test(source)) f.add('LlmMockResponse');
  if (/\bvi\.mock\(['"][^'"]*\/lib\/parallel-batch\//.test(source) || /\bmaxParallel\b|\bbatchSize\b/.test(source)) f.add('ChainConfig');
  if (/\bchain:complete\b|\boutcome:\s*['"]partial|\bemitter\.complete/.test(source)) f.add('ProgressEvent');
  if (/\bflagged\s*:|\bhits\s*:\s*\[\s*\{[^}]*category/.test(source)) f.add('Scan');
  if (/\bspec\s*:|\bvocabulary\s*:|\bcategories\s*:|\banchors\s*:|\bresolveTexts\b/.test(source)) f.add('InstructionBundle');
  return [...f];
}

function targetFromStressName(name) {
  // e.g. /tmp/ai-arch-expect-stress.test.mjs → src/chains/ai-arch-expect/index.spec.js
  // e.g. /tmp/map-stress.test.mjs           → src/chains/map/index.spec.js
  // Some have ambiguous targets (verblets vs chains); we pick chains by default and flag in notes.
  const stem = basename(name).replace(/-stress\.test\.mjs$/, '');
  // Try chains first.
  const chainPath = join(REPO_ROOT, 'src/chains', stem, 'index.spec.js');
  if (existsSync(chainPath)) return { target: `src/chains/${stem}/index.spec.js`, ambiguous: false };
  const verbletPath = join(REPO_ROOT, 'src/verblets', stem, 'index.spec.js');
  if (existsSync(verbletPath)) return { target: `src/verblets/${stem}/index.spec.js`, ambiguous: false };
  // Special cases: ai-arch-expect, conversation-turn-reduce, etc. live as chains.
  // If neither exists, drop a placeholder under chains/ and flag.
  return { target: `src/chains/${stem}/index.spec.js`, ambiguous: true };
}

const rows = JSON.parse(readFileSync(INV_PATH, 'utf8'));

// Avoid duplicating runs.
const existingIds = new Set(rows.map((r) => r.id));

let added = 0;

// Stress files.
const stressFiles = safeFiles('/tmp', /-stress\.test\.mjs$/);
for (const file of stressFiles) {
  const stem = basename(file).replace(/-stress\.test\.mjs$/, '');
  const id = `stress.${stem}`;
  if (existingIds.has(id)) continue;
  const source = readFileSync(file, 'utf8');
  const { target, ambiguous } = targetFromStressName(file);
  const rowCount = countItCalls(source);
  const claims = extractClaims(source);
  const factoryCandidates = detectFactoriesStress(source);
  rows.push({
    id,
    surface: 'stress',
    file: target,
    currentPattern: 'imperative',
    rowCount,
    subject: stem,
    claims,
    proposedTableGroup: `${target.replace(/^src\//, '').replace(/\/index\.spec\.js$/, '').split('/').join('.')}.stress`,
    processorShape: '<stress assertions>',
    varyAxes: [],
    factoryCandidates,
    contractCandidate: null,
    aiReporterCompat: 'n/a',
    browserVariant: false,
    stressOrigin: file,
    notes: ambiguous ? `target spec does not yet exist (${target}); pick destination during migration` : '',
  });
  added++;
}

// Arch row.
const archPath = join(REPO_ROOT, 'index.arch.js');
if (existsSync(archPath) && !existingIds.has('arch.repo')) {
  const source = readFileSync(archPath, 'utf8');
  const claims = extractClaims(source);
  const rowCount = countItCalls(source);
  rows.push({
    id: 'arch.repo',
    surface: 'arch',
    file: 'index.arch.js',
    currentPattern: 'imperative',
    rowCount,
    subject: 'repo-architecture',
    claims,
    proposedTableGroup: 'arch.repo',
    processorShape: '(rule) => aiArchExpect(rule).run()',
    varyAxes: [],
    factoryCandidates: [],
    contractCandidate: null,
    aiReporterCompat: 'n/a',
    browserVariant: false,
    stressOrigin: null,
    notes: 'aiArchExpect-driven, dependency-cruiser checks',
  });
  added++;
}

rows.sort((a, b) => {
  const order = { spec: 0, examples: 1, arch: 2, stress: 3 };
  if (a.surface !== b.surface) return order[a.surface] - order[b.surface];
  return a.file.localeCompare(b.file);
});

writeFileSync(INV_PATH, JSON.stringify(rows, null, 2) + '\n');
console.log(`appended ${added} rows; inventory has ${rows.length} rows`);

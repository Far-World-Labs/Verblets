/**
 * audit-shared.mjs — Constants, phase cache, utilities, archive lifecycle
 *
 * Shared by all audit-*.mjs modules.
 */

import { readFile, writeFile, mkdir, access, readdir, rename } from 'node:fs/promises';
import { join } from 'node:path';

// ============================================================
// Paths
// ============================================================

export const ROOT = new URL('../..', import.meta.url).pathname;
export const SRC = join(ROOT, 'src');
export const CHAINS_DIR = join(SRC, 'chains');
export const MATURITY_DIR = new URL('../maturity', import.meta.url).pathname;
export const OUTPUT_DIR = new URL('../discoveries/maturity-audit', import.meta.url).pathname;
export const CACHE_DIR = new URL('../discoveries/maturity-audit/cache', import.meta.url).pathname;
export const ARCHIVE_DIR = new URL('../archive/runs/maturity-audit', import.meta.url).pathname;

// ============================================================
// LLM config
// ============================================================

export const LLM = 'fastGoodCheap';
// Synthesis reduce calls need longer timeout — default 20s is too short for
// multi-item reduce with large context
export const SYNTHESIS_LLM = { modelName: 'fastGoodCheap', requestTimeout: 60_000 };

// ============================================================
// Tier classification (from maturity/index.md)
// ============================================================

export const CORE_CHAINS = new Set([
  'map', 'filter', 'sort', 'score', 'group', 'reduce', 'entities',
]);
export const DEV_CHAINS = new Set([
  'test', 'test-advice', 'ai-arch-expect', 'scan-js',
]);
export const INTERNAL_CHAINS = new Set([
  'conversation-turn-reduce', 'test-analysis', 'test-analyzer',
]);

export function classifyTier(name) {
  if (CORE_CHAINS.has(name)) return 'core';
  if (DEV_CHAINS.has(name)) return 'development';
  if (INTERNAL_CHAINS.has(name)) return 'internal';
  return 'standard';
}

// ============================================================
// Dimension groupings
// ============================================================

// Tier 1 — Design Fitness (evaluate first)
export const DESIGN_DIMENSIONS = [
  'strategic-value', 'architectural-fitness', 'generalizability',
  'composition-fit', 'design-efficiency',
];

// Tier 2 — Implementation Quality (harden after design is stable)
export const CODE_DIMENSIONS = [
  'logging', 'events', 'browser-server',
  'code-quality', 'token-management', 'errors-retry',
];
export const INTERFACE_DIMENSIONS = [
  'documentation', 'api-surface', 'composability', 'testing',
];
export const PROMPT_DIMENSIONS = ['prompt-engineering'];
export const IMPL_DIMENSIONS = [...CODE_DIMENSIONS, ...INTERFACE_DIMENSIONS, ...PROMPT_DIMENSIONS];
export const ALL_DIMENSIONS = [...DESIGN_DIMENSIONS, ...IMPL_DIMENSIONS];

// ============================================================
// Config param sets (from check-publishability.mjs)
// ============================================================

export const SHARED_CONFIG_PARAMS = new Set([
  'llm', 'maxAttempts', 'onProgress', 'now', 'logger',
  'batchSize', 'maxParallel', 'listStyle', 'autoModeThreshold',
  'model', 'responseFormat',
]);

export const INTERNAL_PARAMS = new Set([
  'options', 'rest', 'restConfig', 'restOptions',
  'chainStartTime', '_schema',
]);

// ============================================================
// Phase cache
// ============================================================

export async function savePhase(name, data) {
  await mkdir(CACHE_DIR, { recursive: true });
  const path = join(CACHE_DIR, `${name}.json`);
  await writeFile(path, JSON.stringify(data, null, 2));
  console.log(`  Saved cache/${name}.json`);
  return data;
}

export async function loadPhase(name) {
  try {
    const path = join(CACHE_DIR, `${name}.json`);
    const raw = await readFile(path, 'utf-8');
    console.log(`  Loaded cached ${name}`);
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// ============================================================
// Utilities
// ============================================================

export function elapsed(start) {
  return ((Date.now() - start) / 1000).toFixed(1);
}

export async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function parseJsonFromLLM(raw) {
  if (!raw) return undefined;
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const start = text.indexOf('{');
  if (start === -1) return undefined;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
    if (depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

// ============================================================
// Archive lifecycle
// ============================================================

export async function archiveRun(outputDir, archiveDir) {
  let entries;
  try {
    entries = await readdir(outputDir);
  } catch {
    return undefined;
  }

  // Only archive if there are report files (not just an empty cache/ dir)
  const hasReports = entries.some(e => e.endsWith('.md'));
  if (!hasReports) return undefined;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = join(archiveDir, timestamp);
  await mkdir(dest, { recursive: true });

  for (const entry of entries) {
    const src = join(outputDir, entry);
    // Move cache/ subdirectory as a whole
    if (entry === 'cache') {
      const cacheEntries = await readdir(src);
      if (cacheEntries.length > 0) {
        const cacheDest = join(dest, 'cache');
        await mkdir(cacheDest, { recursive: true });
        for (const cacheFile of cacheEntries) {
          await rename(join(src, cacheFile), join(cacheDest, cacheFile));
        }
      }
    } else {
      await rename(src, join(dest, entry));
    }
  }

  return dest;
}

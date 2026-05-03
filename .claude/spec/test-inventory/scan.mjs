#!/usr/bin/env node
/**
 * Mechanical scanner for the test inventory.
 *
 * Produces the deterministic fields per test file:
 *   id, surface, file, currentPattern, rowCount, subject, claims,
 *   browserVariant, aiReporterCompat
 *
 * Leaves the judgement fields blank for hand-curation:
 *   proposedTableGroup, processorShape, factoryCandidates, contractCandidate,
 *   varyAxes, stressOrigin, notes
 *
 * Usage: node .claude/spec/test-inventory/scan.mjs > .claude/spec/test-inventory/inventory.json
 *
 * Read-only. Does not modify anything outside its own stdout.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

const SURFACES = [
  { surface: 'spec', glob: 'src', match: /\.spec\.js$/, surfaceIdPrefix: 'spec' },
  { surface: 'examples', glob: 'src', match: /\.examples\.js$/, surfaceIdPrefix: 'examples' },
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      out.push(...walk(p));
    } else if (s.isFile()) {
      out.push(p);
    }
  }
  return out;
}

function fileToId(file, surfaceIdPrefix) {
  const rel = relative(REPO_ROOT, file);
  // Drop leading 'src/'.
  const noSrc = rel.startsWith('src/') ? rel.slice(4) : rel;
  // Drop extension(s): .spec.js / .examples.js
  const noExt = noSrc.replace(/\.spec\.js$/, '').replace(/\.examples\.js$/, '');
  // Drop trailing /index
  const noIndex = noExt.endsWith('/index') ? noExt.slice(0, -'/index'.length) : noExt;
  // Convert / to .
  const dotted = noIndex.split('/').join('.');
  return `${surfaceIdPrefix}.${dotted}`;
}

const ROW_REGEXES = {
  // We pick up `it(`, `test(`, `it.skip(`, `it.only(`, etc. (but not `it.each(` — that's expanded separately).
  itLike: /\b(?:it|test)(?:\.skip|\.only|\.todo|\.concurrent)?\s*\(/g,
  // `it.each([...])` — expanded by counting the arg array length.
  itEach: /\b(?:it|test)(?:\.skip|\.only)?\.each\s*\(/g,
};

function countItCalls(source) {
  return (source.match(ROW_REGEXES.itLike) || []).length;
}

function countItEachExpanded(source) {
  // For each `it.each(...)` find the matching `[...]` and count top-level entries.
  // This is heuristic; for tagged template literals (`it.each\`...\``) we count rows of `\n`.
  let total = 0;
  const re = /\b(?:it|test)(?:\.skip|\.only)?\.each\s*(\(|`)/g;
  let m;
  while ((m = re.exec(source))) {
    const opener = m[1];
    if (opener === '`') {
      // Tagged-template form: count newlines until next backtick (excluding the header row).
      const start = m.index + m[0].length;
      const end = source.indexOf('`', start);
      if (end === -1) continue;
      const body = source.slice(start, end);
      const lines = body.split('\n').filter((l) => l.trim().length > 0);
      // First line is the header; rows after that.
      total += Math.max(0, lines.length - 1);
    } else {
      // Function-call form: scan from `(` for the first balanced `[...]`.
      const start = m.index + m[0].length;
      const arrStart = source.indexOf('[', start);
      if (arrStart === -1) continue;
      let depth = 0;
      let end = -1;
      let inString = null;
      for (let i = arrStart; i < source.length; i++) {
        const c = source[i];
        if (inString) {
          if (c === '\\') { i++; continue; }
          if (c === inString) inString = null;
          continue;
        }
        if (c === '"' || c === "'" || c === '`') { inString = c; continue; }
        if (c === '[') depth++;
        else if (c === ']') {
          depth--;
          if (depth === 0) { end = i; break; }
        }
      }
      if (end === -1) continue;
      const body = source.slice(arrStart + 1, end);
      // Count top-level entries by splitting on commas at depth 0.
      let entries = 0;
      let d = 0;
      let inStr = null;
      let sawAny = false;
      for (let i = 0; i < body.length; i++) {
        const c = body[i];
        if (inStr) {
          if (c === '\\') { i++; continue; }
          if (c === inStr) inStr = null;
          continue;
        }
        if (c === '"' || c === "'" || c === '`') { inStr = c; sawAny = true; continue; }
        if (c === '[' || c === '{' || c === '(') d++;
        else if (c === ']' || c === '}' || c === ')') d--;
        else if (c === ',' && d === 0) entries++;
        else if (!/\s/.test(c)) sawAny = true;
      }
      if (sawAny) entries++;
      total += entries;
    }
  }
  return total;
}

function countForEachExamples(source) {
  // Look for `examples.forEach` or `cases.forEach` driven by an array literal nearby.
  // Heuristic: find the const declaration of `examples = [...]` or `cases = [...]` and count entries.
  const re = /\bconst\s+(examples|cases|fixtures|scenarios)\s*=\s*\[/g;
  let total = 0;
  let m;
  while ((m = re.exec(source))) {
    const arrStart = m.index + m[0].length - 1;
    let depth = 0;
    let end = -1;
    let inString = null;
    for (let i = arrStart; i < source.length; i++) {
      const c = source[i];
      if (inString) {
        if (c === '\\') { i++; continue; }
        if (c === inString) inString = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { inString = c; continue; }
      if (c === '[') depth++;
      else if (c === ']') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end === -1) continue;
    const body = source.slice(arrStart + 1, end);
    let entries = 0;
    let d = 0;
    let inStr = null;
    let braceDepth = 0;
    let sawAny = false;
    for (let i = 0; i < body.length; i++) {
      const c = body[i];
      if (inStr) {
        if (c === '\\') { i++; continue; }
        if (c === inStr) inStr = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { inStr = c; sawAny = true; continue; }
      if (c === '{') { braceDepth++; sawAny = true; }
      else if (c === '}') braceDepth--;
      else if (c === '[' || c === '(') d++;
      else if (c === ']' || c === ')') d--;
      else if (c === ',' && d === 0 && braceDepth === 0) entries++;
      else if (!/\s/.test(c)) sawAny = true;
    }
    if (sawAny) entries++;
    // Only count if there's a corresponding forEach somewhere in the file.
    if (new RegExp(`\\b${m[1]}\\.forEach\\s*\\(`).test(source)) {
      total += entries;
    }
  }
  return total;
}

function detectPattern(source) {
  const hasObjectDriven =
    /\bconst\s+(examples|cases|fixtures|scenarios)\s*=\s*\[/.test(source) &&
    /\b(examples|cases|fixtures|scenarios)\.forEach\s*\(/.test(source);
  const hasItEachObject = /\b(?:it|test)(?:\.skip|\.only)?\.each\s*\(\s*\[\s*\{/.test(source);
  const hasItEachTuple = /\b(?:it|test)(?:\.skip|\.only)?\.each\s*\(\s*\[\s*\[/.test(source);
  const hasItEach = /\b(?:it|test)(?:\.skip|\.only)?\.each\s*\(/.test(source);
  const hasFakeTimers = /\bvi\.useFakeTimers\s*\(/.test(source);
  const hasStreaming = /\bfor\s+await\b/.test(source) || /\basync\s*\*\s*function\b/.test(source);

  const patterns = [];
  if (hasObjectDriven) patterns.push('object-driven');
  if (hasItEachObject) patterns.push('it.each-object');
  if (hasItEachTuple) patterns.push('it.each-tuple');
  if (hasItEach && !hasItEachObject && !hasItEachTuple) patterns.push('it.each-tuple');
  if (hasStreaming) patterns.push('streaming');
  if (hasFakeTimers) patterns.push('interactive');

  // Always check for plain it()/test() calls.
  const plainCount = (source.match(/\b(?:it|test)\s*\(/g) || []).length;
  if (plainCount > 0 && patterns.length === 0) patterns.push('imperative');
  else if (plainCount > 0 && !patterns.includes('imperative')) patterns.push('imperative');

  if (patterns.length === 0) return 'imperative';
  if (patterns.length === 1) return patterns[0];
  // Prefer the most table-driven pattern as dominant; flag mixed in notes via caller.
  for (const p of ['contract-registered', 'object-driven', 'it.each-object', 'it.each-tuple', 'streaming', 'interactive', 'imperative']) {
    if (patterns.includes(p)) return p;
  }
  return 'mixed';
}

function detectMixed(source, dominantPattern) {
  // Detect whether multiple patterns coexist. If so, return a notes string.
  const checks = [
    ['object-driven', /\bconst\s+(?:examples|cases|fixtures|scenarios)\s*=\s*\[/.test(source) && /\b(?:examples|cases|fixtures|scenarios)\.forEach\s*\(/.test(source)],
    ['it.each-object', /\b(?:it|test)(?:\.skip|\.only)?\.each\s*\(\s*\[\s*\{/.test(source)],
    ['it.each-tuple', /\b(?:it|test)(?:\.skip|\.only)?\.each\s*\(\s*\[\s*\[/.test(source)],
    ['streaming', /\bfor\s+await\b/.test(source) || /\basync\s*\*\s*function\b/.test(source)],
    ['interactive', /\bvi\.useFakeTimers\s*\(/.test(source)],
    ['imperative', (source.match(/\b(?:it|test)\s*\(/g) || []).length > 0],
  ];
  const present = checks.filter(([, p]) => p).map(([n]) => n);
  if (present.length <= 1) return null;
  const others = present.filter((p) => p !== dominantPattern);
  if (others.length === 0) return null;
  return `mixed: also has ${others.join(', ')}`;
}

function extractClaims(source) {
  // Grab the first-arg string from every `it(...)`, `test(...)`, `it.skip(...)`, `it.only(...)`,
  // and from each row's `name`/`label` field in `examples = [...]` or `it.each([...])`.
  const claims = [];

  // it(...)/test(...) — capture first string arg.
  const itRe = /\b(?:it|test)(?:\.skip|\.only|\.todo|\.concurrent)?\s*\(\s*(['"`])([^\\1]*?)\1/g;
  let m;
  while ((m = itRe.exec(source))) {
    claims.push(m[2]);
  }

  // examples/cases/fixtures/scenarios array — pull `name:` or `label:` strings.
  const arrRe = /\bconst\s+(?:examples|cases|fixtures|scenarios)\s*=\s*\[([\s\S]*?)\];/g;
  while ((m = arrRe.exec(source))) {
    const body = m[1];
    const nameRe = /(?:name|label)\s*:\s*(['"`])([^\\1]*?)\1/g;
    let n;
    while ((n = nameRe.exec(body))) claims.push(n[2]);
  }

  // De-dup while preserving order (some test files repeat names across describes).
  const seen = new Set();
  const out = [];
  for (const c of claims) {
    const k = c.trim();
    if (!k) continue;
    if (seen.has(k)) {
      // Keep duplicates with a numeric suffix so order is preserved without collision.
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

function deriveSubject(idPath, source) {
  // First import default match in the file gives us the subject name.
  // Else fall back to the basename segment.
  const m = source.match(/^\s*import\s+([A-Za-z_$][\w$]*)\s*(?:,\s*\{[^}]*\})?\s+from\s+['"]\.\//m);
  if (m) return m[1];
  const last = idPath.split('.').pop();
  return last;
}

function getBrowserExclusions() {
  const cfgs = ['vitest.config.browser.js', 'vitest.config.base.js'];
  const excluded = new Set();
  for (const cfg of cfgs) {
    let src;
    try { src = readFileSync(join(REPO_ROOT, cfg), 'utf8'); } catch { continue; }
    // Look for arrays named *Exclusions, exclude lists, or simple string arrays of paths.
    const re = /['"`](src\/[^'"`]+\.spec\.js)['"`]/g;
    let m;
    while ((m = re.exec(src))) excluded.add(m[1]);
    // Also look for directory-glob exclusions of the form 'src/foo/**' applied to specs.
  }
  return excluded;
}

function aiReporterCompat(source, surface) {
  if (surface !== 'examples') return 'n/a';
  return /\bgetTestHelpers\s*\(/.test(source) ? 'required' : 'optional';
}

function build() {
  const browserExcluded = getBrowserExclusions();
  const allFiles = [];
  for (const { surface, glob, match, surfaceIdPrefix } of SURFACES) {
    const root = join(REPO_ROOT, glob);
    const files = walk(root).filter((f) => match.test(f));
    for (const file of files) {
      const rel = relative(REPO_ROOT, file);
      const source = readFileSync(file, 'utf8');
      const id = fileToId(file, surfaceIdPrefix);
      const itCount = countItCalls(source);
      const itEachExpanded = countItEachExpanded(source);
      const forEachCount = countForEachExamples(source);
      const rowCount = itCount + itEachExpanded + forEachCount;
      const dominant = detectPattern(source);
      const mixedNote = detectMixed(source, dominant);
      const claims = extractClaims(source);
      const subject = deriveSubject(id, source);
      const browserVariant = !browserExcluded.has(rel);
      const compat = aiReporterCompat(source, surface);
      const stressOrigin = null;

      allFiles.push({
        id,
        surface,
        file: rel,
        currentPattern: dominant,
        rowCount,
        subject,
        claims,
        proposedTableGroup: '<pending>',
        processorShape: '<pending>',
        varyAxes: [],
        factoryCandidates: [],
        contractCandidate: null,
        aiReporterCompat: compat,
        browserVariant,
        stressOrigin,
        notes: mixedNote || '',
      });
    }
  }

  // Stable sort: surface, then file path.
  allFiles.sort((a, b) => {
    if (a.surface !== b.surface) return a.surface.localeCompare(b.surface);
    return a.file.localeCompare(b.file);
  });

  return allFiles;
}

const rows = build();
process.stdout.write(JSON.stringify(rows, null, 2) + '\n');

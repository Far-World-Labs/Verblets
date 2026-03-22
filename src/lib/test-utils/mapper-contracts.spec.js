import { describe, expect, it } from 'vitest';

// ==========================================
// Centralized Mapper Contract Tests
// ==========================================
//
// All option mappers follow one of four structural contracts (object, numeric,
// string, enum). This file verifies every mapper satisfies its contract in a
// single it.each per type, replacing per-chain testObjectMapper/etc calls.
//
// Chain-specific mapper BEHAVIOR (e.g. "low disables all LLM phases") is
// tested in the chain's own spec file via standalone tests.
// ==========================================

// --- Object mappers (low/med/high → object, undefined → default, raw object → passthrough) ---
import { mapEffort } from '../../chains/sort/index.js';
import { mapGranularity as mapGroupGranularity } from '../../chains/group/index.js';
import { mapChallenge } from '../../chains/socratic/index.js';
import { mapPrecision } from '../../chains/extract-blocks/index.js';
import { mapThoroughness as mapDetectPatternsThoroughness } from '../../chains/detect-patterns/index.js';
import { mapPreservation } from '../../chains/split/index.js';
import { mapStrictness } from '../../chains/filter/index.js';
import { mapFidelity } from '../../chains/join/index.js';
import { mapAnalysisDepth } from '../../chains/test-analyzer/index.js';
import { mapDiversity } from '../../chains/category-samples/index.js';
import { mapCoverage } from '../../chains/veiled-variants/index.js';
import { mapEnrichment } from '../../chains/timeline/index.js';
import { mapRigor } from '../../chains/date/index.js';
import { mapAdvice } from '../../chains/expect/index.js';
import { mapThoroughness as mapDocShrinkThoroughness } from '../../chains/document-shrink/index.js';

// --- Numeric mappers (low/med/high → number, undefined → default, raw number → passthrough) ---
import { mapStrictness as mapTruncateStrictness } from '../../chains/truncate/index.js';
import { mapDetection } from '../../chains/probe-scan/index.js';
import { mapSummaryDetail } from '../../chains/summary-map/index.js';
import { mapExploration } from '../../chains/questions/index.js';
import { mapCompression, mapRanking } from '../../chains/document-shrink/index.js';

// --- String mappers (low/med/high → string|undefined, undefined → undefined) ---
import { mapAbstraction } from '../../verblets/embed-step-back/index.js';
import { mapDepth } from '../../verblets/commonalities/index.js';
import { mapGranularity as mapSubquestionsGranularity } from '../../verblets/embed-subquestions/index.js';
import { mapTolerance } from '../../verblets/intent/index.js';
import { mapDivergence } from '../../verblets/embed-multi-query/index.js';
import { mapCreativity } from '../../verblets/fill-missing/index.js';
import { mapSensitivity } from '../../chains/calibrate/index.js';
import { mapCanonicalization } from '../../chains/relations/index.js';

// --- Enum mappers (low/med/high → string, undefined → default string) ---
import { mapAnchoring } from '../../chains/score/index.js';

const objectMappers = [
  ['mapEffort', mapEffort],
  ['mapGroupGranularity', mapGroupGranularity],
  ['mapChallenge', mapChallenge],
  ['mapPrecision', mapPrecision],
  ['mapDetectPatternsThoroughness', mapDetectPatternsThoroughness],
  ['mapPreservation', mapPreservation],
  ['mapStrictness', mapStrictness],
  ['mapFidelity', mapFidelity],
  ['mapAnalysisDepth', mapAnalysisDepth],
  ['mapDiversity', mapDiversity],
  ['mapCoverage', mapCoverage],
  ['mapEnrichment', mapEnrichment],
  ['mapRigor', mapRigor],
  ['mapAdvice', mapAdvice],
  ['mapDocShrinkThoroughness', mapDocShrinkThoroughness],
];

const numericMappers = [
  ['mapTruncateStrictness', mapTruncateStrictness, 'asc'],
  ['mapDetection', mapDetection, 'desc'],
  ['mapSummaryDetail', mapSummaryDetail, 'desc'],
  ['mapExploration', mapExploration, 'asc'],
  ['mapCompression', mapCompression, 'desc'],
  ['mapRanking', mapRanking, 'asc'],
];

const stringMappers = [
  ['mapAbstraction', mapAbstraction],
  ['mapDepth', mapDepth],
  ['mapSubquestionsGranularity', mapSubquestionsGranularity],
  ['mapTolerance', mapTolerance],
  ['mapDivergence', mapDivergence],
  ['mapCreativity', mapCreativity],
  ['mapSensitivity', mapSensitivity],
  ['mapCanonicalization', mapCanonicalization],
];

const enumMappers = [['mapAnchoring', mapAnchoring]];

describe('object mapper contract', () => {
  it.each(objectMappers)('%s: satisfies contract', (_name, fn) => {
    const keys = ['low', 'med', 'high'].map((l) => Object.keys(fn(l)).sort());
    expect(keys[0]).toEqual(keys[1]);
    expect(keys[1]).toEqual(keys[2]);
    expect(fn(undefined)).toBeDefined();
    expect(typeof fn(undefined)).toBe('object');
    const custom = { a: 1, b: 2 };
    expect(fn(custom)).toBe(custom);
    expect(fn('zzz')).toEqual(fn(undefined));
  });
});

describe('numeric mapper contract', () => {
  it.each(numericMappers)('%s: satisfies contract', (_name, fn) => {
    const values = ['low', 'med', 'high'].map(fn);
    expect(new Set(values).size).toBe(3);
    expect(fn(undefined)).toBeDefined();
    expect(fn(0.42)).toBe(0.42);
    expect(fn('zzz')).toBe(fn(undefined));
  });

  it.each(numericMappers.filter(([, , o]) => o === 'asc'))('%s: low < med < high', (_name, fn) => {
    expect(fn('low')).toBeLessThan(fn('med'));
    expect(fn('med')).toBeLessThan(fn('high'));
  });

  it.each(numericMappers.filter(([, , o]) => o === 'desc'))('%s: high < med < low', (_name, fn) => {
    expect(fn('high')).toBeLessThan(fn('med'));
    expect(fn('med')).toBeLessThan(fn('low'));
  });
});

describe('string mapper contract', () => {
  it.each(stringMappers)('%s: satisfies contract', (_name, fn) => {
    const values = ['low', 'med', 'high'].map(fn).filter((v) => v !== undefined);
    expect(new Set(values).size).toBe(values.length);
    expect(fn(undefined)).toBeUndefined();
    expect(fn('zzz')).toBeUndefined();
  });
});

describe('enum mapper contract', () => {
  it.each(enumMappers)('%s: satisfies contract', (_name, fn) => {
    const values = ['low', 'med', 'high'].map(fn);
    expect(new Set(values).size).toBe(3);
    expect(fn(undefined)).toBeDefined();
    expect(fn('zzz')).toBe(fn(undefined));
  });
});

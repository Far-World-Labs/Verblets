import { describe, it, expect } from 'vitest';
import sensitivityProbes from '../prompts/sensitivity-probes.js';
import {
  SEVERITY_ORDER,
  severityAtLeast,
  CATEGORY_SEVERITY,
  PLACEHOLDER_PREFIXES,
  GENERALIZATIONS,
} from './sensitivity-categories.js';

const probeCategories = sensitivityProbes.map((p) => p.category);
const validSeverities = Object.keys(SEVERITY_ORDER);

describe('sensitivity-categories', () => {
  describe('severityAtLeast', () => {
    it('returns true when level exceeds minimum', () => {
      expect(severityAtLeast('critical', 'high')).toBe(true);
    });

    it('returns true when level equals minimum', () => {
      expect(severityAtLeast('high', 'high')).toBe(true);
    });

    it('returns false when level is below minimum', () => {
      expect(severityAtLeast('medium', 'high')).toBe(false);
    });

    it('low is at least none (unknown defaults to 0)', () => {
      expect(severityAtLeast('low', 'none')).toBe(true);
    });

    it('none is not at least low', () => {
      expect(severityAtLeast('none', 'low')).toBe(false);
    });

    it('unknown level defaults to 0', () => {
      expect(severityAtLeast('unknown', 'low')).toBe(false);
      expect(severityAtLeast('unknown', 'none')).toBe(true);
    });
  });

  it('SEVERITY_ORDER has monotonically increasing values', () => {
    expect(SEVERITY_ORDER.low).toBeLessThan(SEVERITY_ORDER.medium);
    expect(SEVERITY_ORDER.medium).toBeLessThan(SEVERITY_ORDER.high);
    expect(SEVERITY_ORDER.high).toBeLessThan(SEVERITY_ORDER.critical);
  });

  it('every probe category has a severity entry', () => {
    for (const category of probeCategories) {
      expect(
        CATEGORY_SEVERITY[category],
        `missing CATEGORY_SEVERITY for "${category}"`
      ).toBeDefined();
    }
  });

  it('every severity value is valid', () => {
    for (const [category, severity] of Object.entries(CATEGORY_SEVERITY)) {
      expect(validSeverities, `invalid severity "${severity}" for "${category}"`).toContain(
        severity
      );
    }
  });

  it('every probe category has a placeholder prefix', () => {
    for (const category of probeCategories) {
      expect(
        PLACEHOLDER_PREFIXES[category],
        `missing PLACEHOLDER_PREFIXES for "${category}"`
      ).toBeDefined();
      expect(PLACEHOLDER_PREFIXES[category]).toBe(PLACEHOLDER_PREFIXES[category].toUpperCase());
    }
  });

  it('every probe category has a generalization', () => {
    for (const category of probeCategories) {
      expect(GENERALIZATIONS[category], `missing GENERALIZATIONS for "${category}"`).toBeDefined();
      expect(typeof GENERALIZATIONS[category]).toBe('string');
      expect(GENERALIZATIONS[category].length).toBeGreaterThan(0);
    }
  });

  it('no extra categories beyond probes exist in any map', () => {
    const probeSet = new Set(probeCategories);
    for (const cat of Object.keys(CATEGORY_SEVERITY)) {
      expect(probeSet.has(cat), `CATEGORY_SEVERITY has unknown category "${cat}"`).toBe(true);
    }
    for (const cat of Object.keys(PLACEHOLDER_PREFIXES)) {
      expect(probeSet.has(cat), `PLACEHOLDER_PREFIXES has unknown category "${cat}"`).toBe(true);
    }
    for (const cat of Object.keys(GENERALIZATIONS)) {
      expect(probeSet.has(cat), `GENERALIZATIONS has unknown category "${cat}"`).toBe(true);
    }
  });

  it('placeholder prefixes contain no spaces or lowercase', () => {
    for (const [category, prefix] of Object.entries(PLACEHOLDER_PREFIXES)) {
      expect(prefix, `prefix for "${category}" contains spaces`).not.toMatch(/\s/);
      expect(prefix, `prefix for "${category}" contains lowercase`).toMatch(/^[A-Z_]+$/);
    }
  });
});

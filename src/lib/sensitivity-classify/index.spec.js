import { describe, it, expect } from 'vitest';
import sensitivityClassify, { policyFromClassification, policyFromAudit } from './index.js';

const hit = (category, score) => ({
  category,
  score,
  label: category,
  chunk: { text: 'x', start: 0, end: 1 },
});

describe('sensitivityClassify', () => {
  it('returns level "none" when scan is not flagged', () => {
    const result = sensitivityClassify({ flagged: false, hits: [] });

    expect(result.level).toBe('none');
    expect(result.maxScore).toBe(0);
    expect(result.categories).toEqual({});
    expect(result.summary).toBe('No sensitive content detected.');
  });

  it('classifies a single low-severity hit', () => {
    const result = sensitivityClassify({
      flagged: true,
      hits: [hit('pii-demographic', 0.55)],
    });

    expect(result.level).toBe('low');
    expect(result.maxScore).toBe(0.55);
    expect(result.categories['pii-demographic']).toEqual({
      count: 1,
      maxScore: 0.55,
      severity: 'low',
    });
    expect(result.summary).toContain('low risk');
    expect(result.summary).toContain('pii-demographic');
  });

  it('classifies medium severity', () => {
    const result = sensitivityClassify({
      flagged: true,
      hits: [hit('pii-name', 0.7)],
    });

    expect(result.level).toBe('medium');
    expect(result.categories['pii-name'].severity).toBe('medium');
  });

  it('classifies high severity', () => {
    const result = sensitivityClassify({
      flagged: true,
      hits: [hit('medical-diagnosis', 0.8)],
    });

    expect(result.level).toBe('high');
    expect(result.categories['medical-diagnosis'].severity).toBe('high');
  });

  it('classifies critical severity', () => {
    const result = sensitivityClassify({
      flagged: true,
      hits: [hit('credential-key', 0.9)],
    });

    expect(result.level).toBe('critical');
    expect(result.categories['credential-key'].severity).toBe('critical');
  });

  it('highest severity wins in mixed-severity hits', () => {
    const result = sensitivityClassify({
      flagged: true,
      hits: [
        hit('pii-demographic', 0.5), // low
        hit('pii-name', 0.6), // medium
        hit('medical-diagnosis', 0.9), // high
      ],
    });

    expect(result.level).toBe('high');
    expect(result.maxScore).toBe(0.9);
    expect(Object.keys(result.categories)).toHaveLength(3);
  });

  it('critical beats all other severities', () => {
    const result = sensitivityClassify({
      flagged: true,
      hits: [
        hit('pii-name', 0.95), // medium — high score
        hit('financial-card', 0.4), // critical — low score
      ],
    });

    expect(result.level).toBe('critical');
    expect(result.maxScore).toBe(0.95);
  });

  it('tracks count and maxScore per category for multiple hits', () => {
    const result = sensitivityClassify({
      flagged: true,
      hits: [hit('pii-name', 0.6), hit('pii-name', 0.8), hit('pii-name', 0.5)],
    });

    expect(result.categories['pii-name'].count).toBe(3);
    expect(result.categories['pii-name'].maxScore).toBe(0.8);
    expect(result.maxScore).toBe(0.8);
  });

  it('defaults unknown categories to low severity', () => {
    const result = sensitivityClassify({
      flagged: true,
      hits: [hit('unknown-category', 0.7)],
    });

    expect(result.level).toBe('low');
    expect(result.categories['unknown-category'].severity).toBe('low');
  });

  it('summary lists categories sorted by severity desc then score desc', () => {
    const result = sensitivityClassify({
      flagged: true,
      hits: [
        hit('pii-demographic', 0.9), // low, high score
        hit('medical-diagnosis', 0.5), // high, low score
        hit('pii-name', 0.7), // medium
      ],
    });

    expect(result.summary).toBe(
      'high risk: 3 categories detected (medical-diagnosis, pii-name, pii-demographic)'
    );
  });

  it('summary uses singular "category" for one category', () => {
    const result = sensitivityClassify({
      flagged: true,
      hits: [hit('biometric', 0.6)],
    });

    expect(result.summary).toContain('1 category detected');
  });

  it('maxScore reflects the global maximum across all hits', () => {
    const result = sensitivityClassify({
      flagged: true,
      hits: [hit('pii-name', 0.3), hit('contact-email', 0.95), hit('location-ip', 0.5)],
    });

    expect(result.maxScore).toBe(0.95);
  });
});

describe('policyFromClassification', () => {
  it('derives strict policy from high-severity medical classification', () => {
    const classification = {
      level: 'high',
      maxScore: 0.85,
      categories: {
        'medical-diagnosis': { count: 2, maxScore: 0.85, severity: 'high' },
        'pii-name': { count: 1, maxScore: 0.7, severity: 'medium' },
      },
      summary: 'high risk: 2 categories detected (medical-diagnosis, pii-name)',
    };

    const result = policyFromClassification(classification);

    expect(result.threshold).toBe(0.35);
    expect(result.protection).toBe('depersonalize');
    expect(result.method).toBe('strict');
    expect(result.verify).toBe(true);
    expect(result.categories).toEqual(['medical-diagnosis', 'pii-name']);
  });

  it('derives lenient defaults from level "none" classification', () => {
    const classification = {
      level: 'none',
      maxScore: 0,
      categories: {},
      summary: 'No sensitive content detected.',
    };

    const result = policyFromClassification(classification);

    expect(result.threshold).toBe(0.45);
    expect(result.protection).toBe('depersonalize');
    expect(result.method).toBe('light');
    expect(result.verify).toBe(false);
    expect(result.categories).toEqual([]);
  });

  it('works with sensitivityCheck-shaped input (extra fields ignored)', () => {
    const checkResult = {
      flagged: true,
      level: 'critical',
      categories: { 'credential-key': { count: 1, maxScore: 0.9, severity: 'critical' } },
      scan: { flagged: true, hits: [] },
    };

    const result = policyFromClassification(checkResult);

    expect(result.threshold).toBe(0.3);
    expect(result.protection).toBe('redact');
    expect(result.method).toBe('strict');
    expect(result.verify).toBe(true);
  });
});

describe('policyFromAudit', () => {
  it('returns lenient defaults for undefined input', () => {
    const result = policyFromAudit(undefined);

    expect(result.threshold).toBe(0.45);
    expect(result.protection).toBe('depersonalize');
    expect(result.method).toBe('light');
    expect(result.mode).toBe('placeholder');
    expect(result.verify).toBe(false);
    expect(result.categories).toEqual([]);
  });

  it('returns lenient defaults for low severity only', () => {
    const result = policyFromAudit({
      totalItems: 10,
      flaggedCount: 1,
      maxLevel: 'low',
      categoryCounts: { 'pii-demographic': 1 },
      levelCounts: { none: 9, low: 1 },
    });

    expect(result.threshold).toBe(0.45);
    expect(result.protection).toBe('depersonalize');
    expect(result.method).toBe('light');
    expect(result.verify).toBe(false);
    expect(result.categories).toEqual(['pii-demographic']);
  });

  it('uses balanced method for medium severity with low flagged ratio', () => {
    const result = policyFromAudit({
      totalItems: 20,
      flaggedCount: 2,
      maxLevel: 'medium',
      categoryCounts: { 'pii-name': 2 },
      levelCounts: { none: 18, medium: 2 },
    });

    expect(result.threshold).toBe(0.4);
    expect(result.method).toBe('balanced');
    expect(result.protection).toBe('depersonalize');
    expect(result.verify).toBe(false);
  });

  it('enables verify when flagged ratio exceeds 25%', () => {
    const result = policyFromAudit({
      totalItems: 10,
      flaggedCount: 3,
      maxLevel: 'medium',
      categoryCounts: { 'pii-name': 3 },
      levelCounts: { none: 7, medium: 3 },
    });

    expect(result.verify).toBe(true);
  });

  it('uses depersonalize/strict for high severity with non-redact categories', () => {
    const result = policyFromAudit({
      totalItems: 10,
      flaggedCount: 3,
      maxLevel: 'high',
      categoryCounts: { 'medical-diagnosis': 3 },
      levelCounts: { none: 7, high: 3 },
    });

    expect(result.threshold).toBe(0.35);
    expect(result.protection).toBe('depersonalize');
    expect(result.method).toBe('strict');
    expect(result.verify).toBe(true);
  });

  it('uses redact for critical severity with government-id category', () => {
    const result = policyFromAudit({
      totalItems: 5,
      flaggedCount: 2,
      maxLevel: 'critical',
      categoryCounts: { 'pii-government-id': 2 },
      levelCounts: { none: 3, critical: 2 },
    });

    expect(result.threshold).toBe(0.3);
    expect(result.protection).toBe('redact');
    expect(result.method).toBe('strict');
    expect(result.mode).toBe('placeholder');
    expect(result.verify).toBe(true);
  });

  it('uses redact for high severity with financial-card category', () => {
    const result = policyFromAudit({
      totalItems: 10,
      flaggedCount: 2,
      maxLevel: 'high',
      categoryCounts: { 'financial-card': 1, 'pii-name': 1 },
      levelCounts: { none: 8, high: 2 },
    });

    expect(result.protection).toBe('redact');
  });

  it('categories reflect only what was detected', () => {
    const result = policyFromAudit({
      totalItems: 10,
      flaggedCount: 3,
      maxLevel: 'high',
      categoryCounts: { 'medical-diagnosis': 2, 'pii-name': 1 },
      levelCounts: { none: 7, medium: 1, high: 2 },
    });

    expect(result.categories).toEqual(['medical-diagnosis', 'pii-name']);
  });

  it('returns all expected fields', () => {
    const result = policyFromAudit({
      totalItems: 5,
      flaggedCount: 1,
      maxLevel: 'low',
      categoryCounts: { 'pii-demographic': 1 },
      levelCounts: { none: 4, low: 1 },
    });

    expect(result).toHaveProperty('threshold');
    expect(result).toHaveProperty('categories');
    expect(result).toHaveProperty('protection');
    expect(result).toHaveProperty('mode');
    expect(result).toHaveProperty('method');
    expect(result).toHaveProperty('verify');
    expect(Object.keys(result)).toHaveLength(6);
  });
});

import { describe, it, expect } from 'vitest';
import {
  CONTEXT_KINDS,
  ENVIRONMENT,
  DOMAIN,
  COMPLIANCE,
  QUALITY_INTENT,
  COST_POSTURE,
} from './context.js';

describe('context constants', () => {
  describe('CONTEXT_KINDS', () => {
    it('contains all four entity kinds', () => {
      expect(CONTEXT_KINDS).toEqual(['application', 'providers', 'request', 'content']);
    });
  });

  describe('ENVIRONMENT', () => {
    it('defines production, development, test', () => {
      expect(ENVIRONMENT.PRODUCTION).toBe('production');
      expect(ENVIRONMENT.DEVELOPMENT).toBe('development');
      expect(ENVIRONMENT.TEST).toBe('test');
      expect(Object.values(ENVIRONMENT)).toHaveLength(3);
    });
  });

  describe('DOMAIN', () => {
    it('defines six domain values', () => {
      const values = Object.values(DOMAIN);
      expect(values).toHaveLength(6);
      expect(values).toContain('medical');
      expect(values).toContain('financial');
      expect(values).toContain('legal');
      expect(values).toContain('technical');
      expect(values).toContain('general');
      expect(values).toContain('unknown');
    });
  });

  describe('COMPLIANCE', () => {
    it('defines five compliance frameworks', () => {
      const values = Object.values(COMPLIANCE);
      expect(values).toHaveLength(5);
      expect(values).toContain('hipaa');
      expect(values).toContain('gdpr');
      expect(values).toContain('pci');
      expect(values).toContain('coppa');
      expect(values).toContain('none');
    });
  });

  describe('QUALITY_INTENT', () => {
    it('defines three quality tiers', () => {
      expect(QUALITY_INTENT.STANDARD).toBe('standard');
      expect(QUALITY_INTENT.HIGH).toBe('high');
      expect(QUALITY_INTENT.CRITICAL).toBe('critical');
      expect(Object.values(QUALITY_INTENT)).toHaveLength(3);
    });
  });

  describe('COST_POSTURE', () => {
    it('defines three cost postures', () => {
      expect(COST_POSTURE.NORMAL).toBe('normal');
      expect(COST_POSTURE.CONSTRAINED).toBe('constrained');
      expect(COST_POSTURE.MINIMAL).toBe('minimal');
      expect(Object.values(COST_POSTURE)).toHaveLength(3);
    });
  });

  it('all value sets contain only lowercase string values', () => {
    const sets = [ENVIRONMENT, DOMAIN, COMPLIANCE, QUALITY_INTENT, COST_POSTURE];
    for (const set of sets) {
      for (const value of Object.values(set)) {
        expect(typeof value).toBe('string');
        expect(value).toBe(value.toLowerCase());
      }
    }
  });

  it('no value set has duplicate values', () => {
    const sets = [ENVIRONMENT, DOMAIN, COMPLIANCE, QUALITY_INTENT, COST_POSTURE];
    for (const set of sets) {
      const values = Object.values(set);
      expect(new Set(values).size).toBe(values.length);
    }
  });
});

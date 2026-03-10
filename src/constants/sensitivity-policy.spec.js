import { describe, it, expect } from 'vitest';
import sensitivityProbes from '../prompts/sensitivity-probes.js';
import { sensitivityPolicy } from './sensitivity-policy.js';

const validCategories = new Set(sensitivityProbes.map((p) => p.category));

describe('sensitivityPolicy', () => {
  for (const [name, policy] of Object.entries(sensitivityPolicy)) {
    describe(name, () => {
      it('all categories are valid probe categories', () => {
        for (const cat of policy.categories) {
          expect(validCategories.has(cat), `"${cat}" is not a valid probe category`).toBe(true);
        }
      });

      it('has no duplicate categories', () => {
        const unique = new Set(policy.categories);
        expect(unique.size, `${name} has duplicate categories`).toBe(policy.categories.length);
      });

      it('has a numeric threshold', () => {
        expect(typeof policy.threshold).toBe('number');
        expect(policy.threshold).toBeGreaterThan(0);
        expect(policy.threshold).toBeLessThan(1);
      });

      it('has a valid protection strategy', () => {
        expect(['redact', 'depersonalize']).toContain(policy.protection);
      });

      it('redact presets have mode, depersonalize presets have method', () => {
        if (policy.protection === 'redact') {
          expect(policy.mode, `${name} is redact but missing mode`).toBeDefined();
        }
        if (policy.protection === 'depersonalize') {
          expect(policy.method, `${name} is depersonalize but missing method`).toBeDefined();
        }
      });
    });
  }

  it('HIPAA includes all medical categories', () => {
    const medicalCategories = [...validCategories].filter((c) => c.startsWith('medical-'));
    for (const cat of medicalCategories) {
      expect(sensitivityPolicy.HIPAA.categories, `HIPAA missing ${cat}`).toContain(cat);
    }
  });

  it('HIPAA includes biometric', () => {
    expect(sensitivityPolicy.HIPAA.categories).toContain('biometric');
  });

  it('PCI_DSS includes financial-card', () => {
    expect(sensitivityPolicy.PCI_DSS.categories).toContain('financial-card');
  });

  it('PCI_DSS includes credential categories', () => {
    expect(sensitivityPolicy.PCI_DSS.categories).toContain('credential-password');
    expect(sensitivityPolicy.PCI_DSS.categories).toContain('credential-key');
  });

  it('COPPA includes minor-identity', () => {
    expect(sensitivityPolicy.COPPA.categories).toContain('minor-identity');
  });

  it('COPPA includes all contact categories', () => {
    const contactCategories = [...validCategories].filter((c) => c.startsWith('contact-'));
    for (const cat of contactCategories) {
      expect(sensitivityPolicy.COPPA.categories, `COPPA missing ${cat}`).toContain(cat);
    }
  });

  it('GDPR excludes only proprietary categories', () => {
    const excluded = [...validCategories].filter(
      (c) => !sensitivityPolicy.GDPR.categories.includes(c)
    );
    expect(excluded).toEqual(expect.arrayContaining(['proprietary-code', 'proprietary-business']));
    expect(excluded).toHaveLength(2);
  });

  it('HIPAA and COPPA use redact with verify', () => {
    expect(sensitivityPolicy.HIPAA.protection).toBe('redact');
    expect(sensitivityPolicy.HIPAA.verify).toBe(true);
    expect(sensitivityPolicy.COPPA.protection).toBe('redact');
    expect(sensitivityPolicy.COPPA.verify).toBe(true);
  });
});

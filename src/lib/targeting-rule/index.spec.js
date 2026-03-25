import { describe, it, expect } from 'vitest';
import {
  OPS,
  clause,
  rule,
  validateClause,
  validateRule,
  validate,
  schema,
  evaluateClause,
  evaluateRule,
  applyFirst,
  applyAll,
} from './index.js';

describe('targeting-rule', () => {
  // ===== Constructors =====

  describe('clause', () => {
    it('creates a clause object', () => {
      const c = clause('domain', 'in', ['medical']);
      expect(c).toEqual({ attribute: 'domain', op: 'in', values: ['medical'] });
    });
  });

  describe('rule', () => {
    it('creates a rule with reasoning', () => {
      const r = rule(
        [clause('domain', 'in', ['medical'])],
        'strictness',
        'high',
        'Medical domains need high strictness'
      );
      expect(r).toEqual({
        clauses: [{ attribute: 'domain', op: 'in', values: ['medical'] }],
        option: 'strictness',
        value: 'high',
        reasoning: 'Medical domains need high strictness',
      });
    });

    it('omits reasoning when undefined', () => {
      const r = rule([clause('plan', 'in', ['enterprise'])], 'thoroughness', 'high');
      expect(r).not.toHaveProperty('reasoning');
    });
  });

  // ===== Validation =====

  describe('validateClause', () => {
    it('returns undefined for valid clause', () => {
      expect(validateClause({ attribute: 'domain', op: 'in', values: ['a'] })).toBeUndefined();
    });

    it('rejects non-object', () => {
      expect(validateClause(null)).toContain('must be an object');
      expect(validateClause('bad')).toContain('must be an object');
    });

    it('rejects empty attribute', () => {
      expect(validateClause({ attribute: '', op: 'in', values: ['a'] })).toContain('attribute');
    });

    it('rejects invalid operator', () => {
      expect(validateClause({ attribute: 'x', op: 'regex', values: ['a'] })).toContain('op');
    });

    it('rejects empty values array', () => {
      expect(validateClause({ attribute: 'x', op: 'in', values: [] })).toContain('values');
    });

    it('rejects non-array values', () => {
      expect(validateClause({ attribute: 'x', op: 'in', values: 'a' })).toContain('values');
    });
  });

  describe('validateRule', () => {
    it('returns undefined for valid rule', () => {
      expect(
        validateRule({
          clauses: [{ attribute: 'domain', op: 'in', values: ['medical'] }],
          option: 'strictness',
          value: 'high',
        })
      ).toBeUndefined();
    });

    it('collects multiple errors', () => {
      const errors = validateRule({ clauses: [], option: '', value: 42 });
      expect(errors).toHaveLength(3);
    });

    it('validates nested clauses', () => {
      const errors = validateRule({
        clauses: [{ attribute: 'x', op: 'bad', values: ['a'] }],
        option: 'strictness',
        value: 'high',
      });
      expect(errors[0]).toContain('clauses[0]');
    });
  });

  describe('validate', () => {
    it('returns undefined for valid rules array', () => {
      expect(
        validate([
          {
            clauses: [{ attribute: 'domain', op: 'in', values: ['medical'] }],
            option: 'strictness',
            value: 'high',
          },
        ])
      ).toBeUndefined();
    });

    it('rejects non-array', () => {
      expect(validate('bad')).toEqual(['rules must be an array']);
    });

    it('prefixes errors with rule index', () => {
      const errors = validate([{ clauses: [], option: '', value: 42 }]);
      expect(errors[0]).toMatch(/^rules\[0\]/);
    });
  });

  // ===== Schema =====

  describe('schema', () => {
    it('has expected top-level shape', () => {
      expect(schema.type).toBe('object');
      expect(schema.required).toEqual(['rules']);
      expect(schema.properties.rules.type).toBe('array');
    });

    it('clause schema enumerates all OPS', () => {
      const clauseProps = schema.properties.rules.items.properties.clauses.items.properties;
      expect(clauseProps.op.enum).toEqual(OPS);
    });
  });

  // ===== Evaluation =====

  describe('evaluateClause', () => {
    it('in: matches when attribute value is in values array', () => {
      expect(
        evaluateClause(
          { attribute: 'domain', op: 'in', values: ['medical', 'legal'] },
          { domain: 'medical' }
        )
      ).toBe(true);
      expect(
        evaluateClause(
          { attribute: 'domain', op: 'in', values: ['medical'] },
          { domain: 'finance' }
        )
      ).toBe(false);
    });

    it('startsWith: matches prefix', () => {
      expect(
        evaluateClause(
          { attribute: 'operation', op: 'startsWith', values: ['filter'] },
          { operation: 'filter/batch' }
        )
      ).toBe(true);
      expect(
        evaluateClause(
          { attribute: 'operation', op: 'startsWith', values: ['score'] },
          { operation: 'filter/batch' }
        )
      ).toBe(false);
    });

    it('endsWith: matches suffix', () => {
      expect(
        evaluateClause(
          { attribute: 'operation', op: 'endsWith', values: ['/batch'] },
          { operation: 'filter/batch' }
        )
      ).toBe(true);
    });

    it('contains: matches substring', () => {
      expect(
        evaluateClause(
          { attribute: 'operation', op: 'contains', values: ['ilter'] },
          { operation: 'filter/batch' }
        )
      ).toBe(true);
    });

    it('lessThan: numeric comparison', () => {
      expect(
        evaluateClause({ attribute: 'count', op: 'lessThan', values: ['100'] }, { count: 50 })
      ).toBe(true);
      expect(
        evaluateClause({ attribute: 'count', op: 'lessThan', values: ['100'] }, { count: 200 })
      ).toBe(false);
    });

    it('greaterThan: numeric comparison', () => {
      expect(
        evaluateClause({ attribute: 'count', op: 'greaterThan', values: ['100'] }, { count: 200 })
      ).toBe(true);
    });

    it('returns false when attribute is missing from context', () => {
      expect(evaluateClause({ attribute: 'domain', op: 'in', values: ['medical'] }, {})).toBe(
        false
      );
    });
  });

  describe('evaluateRule', () => {
    it('matches when all clauses match (conjunction)', () => {
      const r = {
        clauses: [
          { attribute: 'domain', op: 'in', values: ['medical'] },
          { attribute: 'plan', op: 'in', values: ['enterprise'] },
        ],
        option: 'strictness',
        value: 'high',
      };
      expect(evaluateRule(r, { domain: 'medical', plan: 'enterprise' })).toBe(true);
      expect(evaluateRule(r, { domain: 'medical', plan: 'free' })).toBe(false);
    });
  });

  describe('applyFirst', () => {
    const rules = [
      {
        clauses: [{ attribute: 'domain', op: 'in', values: ['medical'] }],
        option: 'strictness',
        value: 'high',
      },
      {
        clauses: [{ attribute: 'domain', op: 'in', values: ['finance'] }],
        option: 'strictness',
        value: 'medium',
      },
    ];

    it('returns the first matching rule', () => {
      expect(applyFirst(rules, { domain: 'medical' })).toEqual({
        option: 'strictness',
        value: 'high',
      });
    });

    it('returns undefined when no rules match', () => {
      expect(applyFirst(rules, { domain: 'retail' })).toBeUndefined();
    });
  });

  describe('applyAll', () => {
    const rules = [
      {
        clauses: [{ attribute: 'domain', op: 'in', values: ['medical'] }],
        option: 'strictness',
        value: 'high',
      },
      {
        clauses: [{ attribute: 'domain', op: 'in', values: ['medical'] }],
        option: 'thoroughness',
        value: 'high',
      },
      {
        clauses: [{ attribute: 'domain', op: 'in', values: ['finance'] }],
        option: 'strictness',
        value: 'medium',
      },
    ];

    it('returns all matching rules', () => {
      const matches = applyAll(rules, { domain: 'medical' });
      expect(matches).toEqual([
        { option: 'strictness', value: 'high' },
        { option: 'thoroughness', value: 'high' },
      ]);
    });

    it('returns empty array when nothing matches', () => {
      expect(applyAll(rules, { domain: 'retail' })).toEqual([]);
    });
  });
});

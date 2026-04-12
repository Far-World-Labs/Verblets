import { describe, it, expect } from 'vitest';
import planRead from './index.js';

const schema = {
  projections: [
    { projectionName: 'billing', description: 'invoices and charges' },
    { projectionName: 'compliance', description: 'legal and policy' },
    { projectionName: 'timeline', description: 'deadlines and timing' },
  ],
  properties: [
    {
      propertyName: 'urgency',
      valueRange: {
        type: 'continuous',
        low: 0,
        high: 1,
        lowLabel: 'not urgent',
        highLabel: 'critical',
      },
      projectionWeights: { timeline: 1.0, billing: 0.3 },
    },
    {
      propertyName: 'complianceRisk',
      valueRange: {
        type: 'continuous',
        low: 0,
        high: 1,
        lowLabel: 'no risk',
        highLabel: 'severe risk',
      },
      projectionWeights: { compliance: 1.0, billing: 0.2 },
    },
  ],
};

describe('planRead', () => {
  it('derives weights from schema defaults for requested properties', () => {
    const plan = planRead({ schema, propertyNames: ['urgency'] });
    expect(plan.propertyNames).toEqual(['urgency']);
    expect(plan.weightsByProjectionName).toEqual({ timeline: 1.0, billing: 0.3 });
  });

  it('merges weights across multiple properties using max', () => {
    const plan = planRead({ schema, propertyNames: ['urgency', 'complianceRisk'] });
    // billing: max(0.3, 0.2) = 0.3
    expect(plan.weightsByProjectionName.billing).toBe(0.3);
    expect(plan.weightsByProjectionName.timeline).toBe(1.0);
    expect(plan.weightsByProjectionName.compliance).toBe(1.0);
  });

  it('caller overrides replace merged defaults', () => {
    const plan = planRead({
      schema,
      propertyNames: ['urgency'],
      weightsByProjectionName: { timeline: 0.5, compliance: 0.9 },
    });
    expect(plan.weightsByProjectionName.timeline).toBe(0.5);
    expect(plan.weightsByProjectionName.compliance).toBe(0.9);
    expect(plan.weightsByProjectionName.billing).toBe(0.3);
  });

  it('ignores projections not in schema', () => {
    const narrowSchema = {
      projections: [{ projectionName: 'billing', description: 'money' }],
      properties: [
        {
          propertyName: 'urgency',
          valueRange: { type: 'continuous' },
          projectionWeights: { billing: 0.5, timeline: 1.0 },
        },
      ],
    };
    const plan = planRead({ schema: narrowSchema, propertyNames: ['urgency'] });
    expect(plan.weightsByProjectionName).toEqual({ billing: 0.5 });
    expect(plan.weightsByProjectionName.timeline).toBeUndefined();
  });

  it('skips unknown property names gracefully', () => {
    const plan = planRead({ schema, propertyNames: ['nonexistent'] });
    expect(plan.propertyNames).toEqual(['nonexistent']);
    expect(plan.weightsByProjectionName).toEqual({});
  });

  it('returns empty weights when no properties requested', () => {
    const plan = planRead({ schema, propertyNames: [] });
    expect(plan.weightsByProjectionName).toEqual({});
  });
});

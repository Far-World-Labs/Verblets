import { describe, it, expect } from 'vitest';
import { read, readDetails } from './index.js';
import { normalize } from '../vector-ops/index.js';

const vec = (...vals) => normalize(new Float32Array(vals));

// Axis-aligned poles: low points left (-x), high points right (+x)
const poles = {
  urgency: {
    low: vec(-1, 0, 0),
    high: vec(1, 0, 0),
  },
  complianceRisk: {
    low: vec(0, -1, 0),
    high: vec(0, 1, 0),
  },
};

const schema = {
  projections: [
    { projectionName: 'timeline', description: 'deadlines' },
    { projectionName: 'compliance', description: 'legal' },
  ],
  properties: [
    {
      propertyName: 'urgency',
      valueRange: { type: 'continuous', low: 0, high: 1, lowLabel: 'calm', highLabel: 'critical' },
      projectionWeights: { timeline: 1.0 },
    },
    {
      propertyName: 'complianceRisk',
      valueRange: { type: 'continuous', low: 0, high: 1, lowLabel: 'safe', highLabel: 'risky' },
      projectionWeights: { compliance: 1.0 },
    },
  ],
  _poles: poles,
};

const readPlan = {
  propertyNames: ['urgency', 'complianceRisk'],
  weightsByProjectionName: { timeline: 1.0, compliance: 1.0 },
};

describe('read', () => {
  it('scores high when projection vector aligns with high pole', () => {
    const state = {
      stateId: 'test:1',
      vectorsByProjectionName: {
        timeline: vec(1, 0, 0), // points toward urgency high
        compliance: vec(0, 1, 0), // points toward complianceRisk high
      },
    };
    const [result] = read({ states: [state], readPlan, schema });
    expect(result.stateId).toBe('test:1');
    expect(result.valuesByPropertyName.urgency).toBeGreaterThan(0.8);
    expect(result.valuesByPropertyName.complianceRisk).toBeGreaterThan(0.8);
  });

  it('scores low when projection vector aligns with low pole', () => {
    const state = {
      stateId: 'test:2',
      vectorsByProjectionName: {
        timeline: vec(-1, 0, 0), // points toward urgency low
        compliance: vec(0, -1, 0), // points toward complianceRisk low
      },
    };
    const [result] = read({ states: [state], readPlan, schema });
    expect(result.valuesByPropertyName.urgency).toBeLessThan(0.2);
    expect(result.valuesByPropertyName.complianceRisk).toBeLessThan(0.2);
  });

  it('scores near midpoint for orthogonal vectors', () => {
    const state = {
      stateId: 'test:3',
      vectorsByProjectionName: {
        timeline: vec(0, 0, 1), // orthogonal to urgency axis
        compliance: vec(0, 0, 1), // orthogonal to risk axis
      },
    };
    const [result] = read({ states: [state], readPlan, schema });
    expect(result.valuesByPropertyName.urgency).toBeCloseTo(0.5, 1);
    expect(result.valuesByPropertyName.complianceRisk).toBeCloseTo(0.5, 1);
  });

  it('returns undefined for properties without poles', () => {
    const noPoleSchema = { ...schema, _poles: {} };
    const state = {
      stateId: 'test:4',
      vectorsByProjectionName: { timeline: vec(1, 0, 0) },
    };
    const [result] = read({ states: [state], readPlan, schema: noPoleSchema });
    expect(result.valuesByPropertyName.urgency).toBeUndefined();
  });

  it('returns undefined when state lacks required projections', () => {
    const state = {
      stateId: 'test:5',
      vectorsByProjectionName: {},
    };
    const [result] = read({ states: [state], readPlan, schema });
    expect(result.valuesByPropertyName.urgency).toBeUndefined();
  });

  it('processes multiple states in bulk', () => {
    const states = [
      {
        stateId: 'a',
        vectorsByProjectionName: { timeline: vec(1, 0, 0), compliance: vec(0, 1, 0) },
      },
      {
        stateId: 'b',
        vectorsByProjectionName: { timeline: vec(-1, 0, 0), compliance: vec(0, -1, 0) },
      },
    ];
    const results = read({ states, readPlan, schema });
    expect(results).toHaveLength(2);
    expect(results[0].stateId).toBe('a');
    expect(results[1].stateId).toBe('b');
    expect(results[0].valuesByPropertyName.urgency).toBeGreaterThan(
      results[1].valuesByPropertyName.urgency
    );
  });

  it('respects custom value ranges', () => {
    const customSchema = {
      ...schema,
      properties: [
        {
          propertyName: 'urgency',
          valueRange: { type: 'continuous', low: -100, high: 100 },
          projectionWeights: { timeline: 1.0 },
        },
      ],
      _poles: poles,
    };
    const state = {
      stateId: 'test:range',
      vectorsByProjectionName: { timeline: vec(1, 0, 0) },
    };
    const [result] = read({
      states: [state],
      readPlan: { propertyNames: ['urgency'], weightsByProjectionName: { timeline: 1.0 } },
      schema: customSchema,
    });
    expect(result.valuesByPropertyName.urgency).toBeGreaterThan(50);
  });
});

describe('readDetails', () => {
  it('returns value and confidence for each property', () => {
    const state = {
      stateId: 'test:d1',
      vectorsByProjectionName: {
        timeline: vec(1, 0, 0),
        compliance: vec(0, 1, 0),
      },
    };
    const [result] = readDetails({ states: [state], readPlan, schema });
    expect(result.stateId).toBe('test:d1');

    const urgency = result.valuesByPropertyName.urgency;
    expect(urgency.value).toBeGreaterThan(0.8);
    expect(urgency.confidence).toBeGreaterThan(0);
    expect(urgency.confidence).toBeLessThanOrEqual(1);

    const risk = result.valuesByPropertyName.complianceRisk;
    expect(risk.value).toBeGreaterThan(0.8);
    expect(risk.confidence).toBeGreaterThan(0);
  });

  it('reports zero confidence when projections are missing', () => {
    const state = {
      stateId: 'test:d2',
      vectorsByProjectionName: {},
    };
    const [result] = readDetails({ states: [state], readPlan, schema });
    expect(result.valuesByPropertyName.urgency.confidence).toBe(0);
    expect(result.valuesByPropertyName.urgency.value).toBeUndefined();
  });

  it('reports zero confidence when poles are missing', () => {
    const noPoleSchema = { ...schema, _poles: {} };
    const state = {
      stateId: 'test:d3',
      vectorsByProjectionName: { timeline: vec(1, 0, 0) },
    };
    const [result] = readDetails({ states: [state], readPlan, schema: noPoleSchema });
    expect(result.valuesByPropertyName.urgency.confidence).toBe(0);
  });

  it('produces same values as read()', () => {
    const state = {
      stateId: 'test:d4',
      vectorsByProjectionName: {
        timeline: vec(0.7, 0.3, 0),
        compliance: vec(0.2, 0.8, 0),
      },
    };
    const [simple] = read({ states: [state], readPlan, schema });
    const [detailed] = readDetails({ states: [state], readPlan, schema });
    expect(detailed.valuesByPropertyName.urgency.value).toBe(simple.valuesByPropertyName.urgency);
    expect(detailed.valuesByPropertyName.complianceRisk.value).toBe(
      simple.valuesByPropertyName.complianceRisk
    );
  });
});

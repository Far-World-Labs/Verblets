import { describe, it, expect, vi } from 'vitest';
import { normalize } from '../vector-ops/index.js';

const vec = (...vals) => normalize(new Float32Array(vals));

vi.mock('../../local/index.js', () => ({
  embedBatch: vi.fn(async (texts) =>
    texts.map(() => normalize(new Float32Array([0.5, 0.5, 0, 0])))
  ),
}));

const { default: match } = await import('./index.js');

describe('match', () => {
  const leftStates = [
    {
      stateId: 'ticket:1',
      vectorsByProjectionName: {
        billing: vec(1, 0, 0, 0),
        compliance: vec(0, 1, 0, 0),
      },
    },
  ];

  const rightStates = [
    {
      stateId: 'policy:retention',
      vectorsByProjectionName: {
        billing: vec(0.9, 0.1, 0, 0),
        compliance: vec(0, 0.8, 0.2, 0),
      },
    },
    {
      stateId: 'policy:billing',
      vectorsByProjectionName: {
        billing: vec(1, 0, 0, 0),
        compliance: vec(0, 0, 1, 0),
      },
    },
  ];

  it('scores higher when projection vectors are more similar', async () => {
    const results = await match({
      leftStates,
      rightStates,
      intent: {
        weightsByProjectionName: { billing: 1.0, compliance: 1.0 },
      },
    });

    expect(results).toHaveLength(2);
    const retention = results.find((r) => r.rightStateId === 'policy:retention');
    const billing = results.find((r) => r.rightStateId === 'policy:billing');
    // ticket:1 compliance aligns better with retention than billing policy
    expect(retention.score).toBeGreaterThan(billing.score);
  });

  it('respects projection weights', async () => {
    // Weight only billing — policy:billing should win (exact billing match)
    const billingOnly = await match({
      leftStates,
      rightStates,
      intent: {
        weightsByProjectionName: { billing: 1.0 },
      },
    });

    const retention = billingOnly.find((r) => r.rightStateId === 'policy:retention');
    const billing = billingOnly.find((r) => r.rightStateId === 'policy:billing');
    expect(billing.score).toBeGreaterThan(retention.score);
  });

  it('suppresses specified projections', async () => {
    // Suppress compliance — only billing matters
    const results = await match({
      leftStates,
      rightStates,
      intent: {
        weightsByProjectionName: { billing: 1.0, compliance: 1.0 },
        suppressProjectionNames: ['compliance'],
      },
    });

    const billing = results.find((r) => r.rightStateId === 'policy:billing');
    expect(billing.score).toBeGreaterThan(0.99); // exact billing match
  });

  it('returns 0 score when no projections overlap', async () => {
    const noOverlap = [
      {
        stateId: 'orphan',
        vectorsByProjectionName: { unknownProj: vec(1, 0, 0, 0) },
      },
    ];
    const results = await match({
      leftStates,
      rightStates: noOverlap,
      intent: {
        weightsByProjectionName: { billing: 1.0 },
      },
    });
    expect(results[0].score).toBe(0);
  });

  it('handles N x M state combinations', async () => {
    const left = [
      { stateId: 'a', vectorsByProjectionName: { billing: vec(1, 0, 0, 0) } },
      { stateId: 'b', vectorsByProjectionName: { billing: vec(0, 1, 0, 0) } },
    ];
    const right = [
      { stateId: 'x', vectorsByProjectionName: { billing: vec(1, 0, 0, 0) } },
      { stateId: 'y', vectorsByProjectionName: { billing: vec(0, 1, 0, 0) } },
      { stateId: 'z', vectorsByProjectionName: { billing: vec(0, 0, 1, 0) } },
    ];
    const results = await match({
      leftStates: left,
      rightStates: right,
      intent: { weightsByProjectionName: { billing: 1.0 } },
    });
    expect(results).toHaveLength(6);
    // a↔x should be highest (identical vectors)
    const ax = results.find((r) => r.leftStateId === 'a' && r.rightStateId === 'x');
    expect(ax.score).toBeGreaterThan(0.99);
  });

  it('incorporates queryTexts when provided', async () => {
    const { embedBatch } = await import('../../local/index.js');
    embedBatch.mockClear();

    const results = await match({
      leftStates,
      rightStates: [rightStates[0]],
      intent: {
        queryTexts: ['retention language risk'],
        weightsByProjectionName: { billing: 1.0, compliance: 1.0 },
      },
    });

    expect(embedBatch).toHaveBeenCalledWith(['retention language risk']);
    expect(results).toHaveLength(1);
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('works without queryTexts', async () => {
    const { embedBatch } = await import('../../local/index.js');
    embedBatch.mockClear();

    await match({
      leftStates,
      rightStates: [rightStates[0]],
      intent: {
        weightsByProjectionName: { billing: 1.0 },
      },
    });

    expect(embedBatch).not.toHaveBeenCalled();
  });

  it('skips projections with zero weight', async () => {
    const results = await match({
      leftStates,
      rightStates: [rightStates[1]],
      intent: {
        weightsByProjectionName: { billing: 0, compliance: 1.0 },
      },
    });
    // Only compliance compared; ticket:1 compliance ↔ policy:billing compliance are orthogonal
    expect(results[0].score).toBeLessThan(0.1);
  });
});

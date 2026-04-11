import { describe, it, expect } from 'vitest';
import shapeState from './shape-state.js';

const vec = (...vals) => new Float32Array(vals);

describe('shapeState', () => {
  const states = [
    {
      stateId: 'ticket:1',
      vectorsByProjectionName: {
        billing: vec(1, 0, 0),
        compliance: vec(0, 1, 0),
        timeline: vec(0, 0, 1),
      },
    },
  ];

  it('scales projection vectors by (1 + edit)', () => {
    const [result] = shapeState({
      states,
      editsByProjectionName: { compliance: 0.5 },
    });
    expect([...result.vectorsByProjectionName.compliance]).toEqual([0, 1.5, 0]);
  });

  it('suppresses projections with negative edits', () => {
    const [result] = shapeState({
      states,
      editsByProjectionName: { compliance: -0.8 },
    });
    expect(result.vectorsByProjectionName.compliance[1]).toBeCloseTo(0.2, 5);
  });

  it('zeroes out projections with edit of -1', () => {
    const [result] = shapeState({
      states,
      editsByProjectionName: { compliance: -1 },
    });
    expect([...result.vectorsByProjectionName.compliance]).toEqual([0, 0, 0]);
  });

  it('passes through untouched projections as copies', () => {
    const [result] = shapeState({
      states,
      editsByProjectionName: { compliance: 0.5 },
    });
    expect([...result.vectorsByProjectionName.billing]).toEqual([1, 0, 0]);
    expect([...result.vectorsByProjectionName.timeline]).toEqual([0, 0, 1]);
    // Verify they are copies, not references
    expect(result.vectorsByProjectionName.billing).not.toBe(
      states[0].vectorsByProjectionName.billing
    );
  });

  it('does not mutate input states', () => {
    const original = [...states[0].vectorsByProjectionName.compliance];
    shapeState({ states, editsByProjectionName: { compliance: 10 } });
    expect([...states[0].vectorsByProjectionName.compliance]).toEqual(original);
  });

  it('applies multiple edits simultaneously', () => {
    const [result] = shapeState({
      states,
      editsByProjectionName: { billing: 1.0, compliance: -0.5, timeline: 0.25 },
    });
    expect([...result.vectorsByProjectionName.billing]).toEqual([2, 0, 0]);
    expect(result.vectorsByProjectionName.compliance[1]).toBeCloseTo(0.5, 5);
    expect(result.vectorsByProjectionName.timeline[2]).toBeCloseTo(1.25, 5);
  });

  it('processes multiple states', () => {
    const multi = [
      { stateId: 'a', vectorsByProjectionName: { billing: vec(1, 0, 0) } },
      { stateId: 'b', vectorsByProjectionName: { billing: vec(0, 2, 0) } },
    ];
    const results = shapeState({ states: multi, editsByProjectionName: { billing: 1.0 } });
    expect(results).toHaveLength(2);
    expect([...results[0].vectorsByProjectionName.billing]).toEqual([2, 0, 0]);
    expect([...results[1].vectorsByProjectionName.billing]).toEqual([0, 4, 0]);
  });

  it('copies baseVector without editing it', () => {
    const withBase = [
      {
        stateId: 'c',
        vectorsByProjectionName: { billing: vec(1, 0, 0) },
        baseVector: vec(0.5, 0.5, 0),
      },
    ];
    const [result] = shapeState({ states: withBase, editsByProjectionName: { billing: 1.0 } });
    expect([...result.baseVector]).toEqual([0.5, 0.5, 0]);
    expect(result.baseVector).not.toBe(withBase[0].baseVector);
  });

  it('handles empty edits as a pure copy', () => {
    const [result] = shapeState({ states, editsByProjectionName: {} });
    expect([...result.vectorsByProjectionName.billing]).toEqual([1, 0, 0]);
    expect(result.vectorsByProjectionName.billing).not.toBe(
      states[0].vectorsByProjectionName.billing
    );
  });
});

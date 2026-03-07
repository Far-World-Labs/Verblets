import { describe, expect, it } from 'vitest';

import toNumberWithUnits from './index.js';

describe('toNumberWithUnits', () => {
  it('parses a JSON object with value and unit', () => {
    const result = toNumberWithUnits('{"value": 42, "unit": "kg"}');
    expect(result).toEqual({ value: 42, unit: 'kg' });
  });

  it('parses string value by stripping numeric', () => {
    const result = toNumberWithUnits('{"value": "approximately 3.14", "unit": "meters"}');
    expect(result).toEqual({ value: 3.14, unit: 'meters' });
  });

  it('returns undefined for "undefined" response', () => {
    expect(toNumberWithUnits('undefined')).toBeUndefined();
  });

  it('handles missing unit', () => {
    const result = toNumberWithUnits('{"value": 100}');
    expect(result).toEqual({ value: 100, unit: undefined });
  });

  it('handles "undefined" unit string', () => {
    const result = toNumberWithUnits('{"value": 7, "unit": "undefined"}');
    expect(result).toEqual({ value: 7, unit: undefined });
  });

  it('handles null value', () => {
    const result = toNumberWithUnits('{"value": null, "unit": "km"}');
    expect(result).toEqual({ value: undefined, unit: 'km' });
  });

  it('strips LLM response wrapper before parsing', () => {
    const result = toNumberWithUnits('Answer: {"value": 5, "unit": "seconds"}');
    expect(result).toEqual({ value: 5, unit: 'seconds' });
  });

  it('throws on non-JSON input', () => {
    expect(() => toNumberWithUnits('not json at all')).toThrow('LLM output [error]');
  });

  it('throws on unsupported value type', () => {
    expect(() => toNumberWithUnits('{"value": true, "unit": "kg"}')).toThrow('Bad datatype');
  });

  it('returns 0 when value string has no digits (stripNumeric returns empty string)', () => {
    const result = toNumberWithUnits('{"value": "no-numbers-here", "unit": "kg"}');
    expect(result).toEqual({ value: 0, unit: 'kg' });
  });
});

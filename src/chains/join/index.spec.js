import { beforeEach, describe, expect, it, vi } from 'vitest';
import join, { mapFidelity } from './index.js';

// Mock the llm function to avoid actual API calls
vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
}));

import llm from '../../lib/llm/index.js';

beforeEach(() => {
  vi.clearAllMocks();
  // Mock llm to return joined text
  llm.mockImplementation((prompt) => {
    // Simple mock that joins fragments mentioned in the prompt
    if (prompt.includes('Hello') && prompt.includes('world') && prompt.includes('today')) {
      return 'Hello and world and today';
    }
    if (prompt.includes('a') && prompt.includes('b') && prompt.includes('c')) {
      return 'a and b and c';
    }
    // For stitching operations, return a reasonable joined result
    if (prompt.includes('SECTION A') || prompt.includes('Stitch')) {
      return 'Hello and world and today';
    }
    // Default fallback
    return 'joined result';
  });
});

describe('mapFidelity', () => {
  it('returns default (windowSize 5, 50% overlap) when undefined', () => {
    expect(mapFidelity(undefined)).toEqual({ windowSize: 5, overlapPercent: 50 });
  });

  it('maps low to large windows with minimal overlap', () => {
    expect(mapFidelity('low')).toEqual({ windowSize: 10, overlapPercent: 25 });
  });

  it('maps high to small windows with high overlap', () => {
    expect(mapFidelity('high')).toEqual({ windowSize: 3, overlapPercent: 67 });
  });

  it('passes through object for power consumers', () => {
    const custom = { windowSize: 7, overlapPercent: 40 };
    expect(mapFidelity(custom)).toBe(custom);
  });

  it('falls back to default on unknown string', () => {
    expect(mapFidelity('ultra')).toEqual({ windowSize: 5, overlapPercent: 50 });
  });
});

describe('join chain', () => {
  it('joins fragments with AI-generated transitions', async () => {
    const result = await join(['Hello', 'world', 'today'], 'Connect with simple words');

    expect(typeof result).toBe('string');
    expect(result).toContain('Hello');
    expect(result).toContain('world');
    expect(result).toContain('today');
    expect(llm).toHaveBeenCalled();
  });

  it('applies windowed processing with configuration', async () => {
    const result = await join(['a', 'b', 'c'], 'Simple connections', { windowSize: 2 });

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(llm).toHaveBeenCalled();
  });

  it('handles empty and single item arrays', async () => {
    const emptyResult = await join([]);
    expect(emptyResult).toBe('');

    const singleResult = await join(['only']);
    expect(singleResult).toBe('only');

    // Should not call llm for edge cases
    expect(llm).not.toHaveBeenCalled();
  });
});

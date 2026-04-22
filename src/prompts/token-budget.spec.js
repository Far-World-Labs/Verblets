import { describe, it, expect } from 'vitest';
import tokenBudget from './token-budget.js';

describe('tokenBudget', () => {
  it('uses default budget of 10', () => {
    expect(tokenBudget()).toBe('Keep the output within 10 tokens.');
  });

  it('uses custom budget', () => {
    expect(tokenBudget(500)).toBe('Keep the output within 500 tokens.');
  });

  it('handles small budgets', () => {
    expect(tokenBudget(1)).toBe('Keep the output within 1 tokens.');
  });
});

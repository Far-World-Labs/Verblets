import { env } from '../lib/env/index.js';

export const longTestTimeout = 2 * 60 * 1000; // 2 minutes

export const extendedTestTimeout = 5 * 60 * 1000; // 5 minutes

// Timeout for AI analysis operations (not a test, but analysis of test results)
export const aiAnalysisTimeout = 30 * 1000; // 30 seconds

export const defaultMaxAttempts = 4;

export const retryDelay = 1000;

// String values that should be considered truthy
export const truthyValues = ['1', 'true', 'TRUE', 'True', 'yes', 'YES', 'Yes'];

// String values that should be considered falsy
export const falsyValues = ['0', 'false', 'FALSE', 'False', 'no', 'NO', 'No'];

// Model capability keys recognized by negotiate and normalizeLlm
export const CAPABILITY_KEYS = ['fast', 'cheap', 'good', 'reasoning', 'multi', 'sensitive'];

// Recognized intensity levels for behavioral dial options
export const INTENSITY_LEVELS = ['low', 'high'];

// Example test cost tiers, gated by VERBLETS_EXAMPLE_BUDGET env var.
// 'low'    (default) — single-call examples only (~190 tests)
// 'medium'           — adds multi-call chains up to ~6 LLM calls per test
// 'high'             — all examples including 10+ call chains
//
// Usage: VERBLETS_EXAMPLE_BUDGET=medium npm run examples
export const exampleBudget = (env.VERBLETS_EXAMPLE_BUDGET || 'low').toLowerCase();
export const isMediumBudget = ['medium', 'high'].includes(exampleBudget);
export const isHighBudget = exampleBudget === 'high';

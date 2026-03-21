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

// Example test cost tiers, gated by EXAMPLE_BUDGET env var.
// 'quick'    (default) — single-call examples only (~185 tests)
// 'standard'          — adds multi-call chains up to ~6 LLM calls per test
// 'full'              — all examples including 10+ call chains
//
// Usage: EXAMPLE_BUDGET=standard npm run examples
export const exampleBudget = (env.EXAMPLE_BUDGET || 'quick').toLowerCase();
export const isStandardBudget = ['standard', 'full'].includes(exampleBudget);
export const isFullBudget = exampleBudget === 'full';

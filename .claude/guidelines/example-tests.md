# Example Test Guidelines

Example files (`*.examples.js`) are living documentation — Vitest suites that run against real LLMs to demonstrate and validate each module's core use case.

## Setup

Every example file uses `getTestHelpers` for vitest core wrappers and AI assertions:

```javascript
import { describe } from 'vitest';
import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Module name');
```

The wrappers feed test structure and results into the test-analysis pipeline, so always destructure `it` and `expect` from `getTestHelpers` rather than importing them directly from vitest.

## Budget Tiers

Examples are gated by `VERBLETS_EXAMPLE_BUDGET` (env var, default: `low`).

| Tier     | Gate             | What runs                              |
|----------|------------------|----------------------------------------|
| `low`    | always           | Single-call chains, quick validations  |
| `medium` | `isMediumBudget` | Multi-call chains (2-10 LLM calls)     |
| `high`   | `isHighBudget`   | Expensive pipelines (10+ LLM calls)    |

Run with: `VERBLETS_EXAMPLE_BUDGET=medium npx vitest run --config vitest.config.examples.js`

Budget-gated describes/tests include a `[tier]` tag in their name so vitest verbose output shows *why* something is skipped:

```javascript
import { isMediumBudget } from '../../constants/common.js';

// Good — reason visible in test output
describe.skipIf(!isMediumBudget)('[medium] multi-step workflow', () => {
  // 3-5 LLM calls
});
```

When adding a new budget-gated test: import the gate from `../../constants/common.js`, use `describe.skipIf` or `it.skipIf`, prefix the name with `[medium]` or `[high]`, and comment the approximate LLM call count.

### Other Skip Gates

| Gate | Trigger | Tests |
|------|---------|-------|
| `skipSensitivity` | Ollama model unreachable | veiled-variants |
| `shouldSkip(key, provider)` | Missing API key or provider mismatch | provider-smoke |
| `it.skip` | Intentional (test-infra validation) | test-analysis race condition |

### Suite Config Banner

The global setup (`test/setup/warm-up-probe.js`) prints a config banner at the start of every example run showing the current budget tier, available providers (detected from API keys), and sensitivity model status.

## Writing Examples

Keep each example focused on one scenario that shows why the module exists. Use realistic input data — an actual paragraph of legal text, a real product review, a plausible dataset. Assertions should verify structure and semantic properties, not exact wording.

```javascript
it('extracts chronological events from a news article', async () => {
  const article = `The company announced Q3 earnings on October 15th, revealing
    a 12% revenue increase. Two weeks later, they acquired StartupCo for $2.1B.`;

  const result = await extractTimeline(article);

  expect(result.length).toBeGreaterThanOrEqual(2);
  await aiExpect(result).toSatisfy('Events appear in chronological order with dates');
});
```

### What makes a good example

Use input that a reader can immediately understand and that exercises the module's primary capability. One compelling scenario per module is enough — save edge cases for unit tests.

### What to avoid

Mocking LLM calls defeats the purpose. Artificial inputs like `'test input'` teach nothing. Overly complex setups with dozens of configuration options obscure the core usage pattern.

## AI Assertions

`aiExpect` from `getTestHelpers` provides LLM-judged semantic assertions. Use standard vitest assertions first for structure, then `aiExpect` for properties that only an LLM can evaluate:

```javascript
// Structure first
expect(result).toBeDefined();
expect(result.length).toBeGreaterThan(0);

// Then semantic checks
await aiExpect(result).toSatisfy('Contains practical advice with an environmental focus');
```

AI assertions work best for qualitative properties: tone, relevance, completeness, coherence, semantic correctness. They are poor at exact matching — keep criteria broad enough that minor wording changes don't cause flakiness.

```javascript
// Too brittle — will flake
await aiExpect(result).toSatisfy('Contains the exact phrase "sustainable gardening"');

// Good — checks meaning
await aiExpect(result).toSatisfy('Covers environmental impact of the proposed policy');
```

## Architecture Test Validation

Architecture tests verify that example files follow these conventions: real LLM calls, proper vitest structure, meaningful assertions, compelling scenarios. Failing an architecture test means the example isn't serving its documentation purpose.

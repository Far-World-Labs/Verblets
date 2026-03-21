# Example Test Conventions

## Budget Tiers

Example tests are gated by `EXAMPLE_BUDGET` (env var, default `low`).

| Tier     | Gate             | What runs                              |
|----------|------------------|----------------------------------------|
| `low`    | always           | Single-call chains, quick validations  |
| `medium` | `isMediumBudget` | Multi-call chains (2-10 LLM calls)     |
| `high`   | `isHighBudget`   | Expensive pipelines (10+ LLM calls)    |

Set via: `EXAMPLE_BUDGET=medium npx vitest run --config vitest.config.examples.js`

## Skip Tagging Convention

Budget-gated describes/tests include a `[tier]` tag in their name so vitest verbose output shows *why* something is skipped:

```js
// Good — reason visible in test output
describe.skipIf(!isMediumBudget)('[medium] scale examples', () => {

// Good — test-level gate
it.skipIf(!isMediumBudget)('[medium] dismantles a motorcycle', async () => {
```

When adding a new budget-gated test:
1. Import `isMediumBudget` or `isHighBudget` from `../../constants/common.js`
2. Use `describe.skipIf` for entire suites or `it.skipIf` for individual tests
3. Prefix the name with `[medium]` or `[high]`
4. Add a comment above with the approximate LLM call count

## Other Skip Gates

| Gate | Trigger | Tests |
|------|---------|-------|
| `skipSensitivity` | Ollama model unreachable | veiled-variants |
| `shouldSkip(key, provider)` | Missing API key or provider mismatch | provider-smoke |
| `it.skip` | Intentional (test-infra validation) | test-analysis race condition |

## Suite Config Banner

The global setup (`test/setup/warm-up-probe.js`) prints a config banner at the start of every example run showing:
- Current budget tier
- Available providers (detected from API keys)
- Sensitivity model status

## Test Helpers

All example tests use `getTestHelpers(suiteName)` from `test-analysis/test-wrappers.js` which provides:
- `it` / `expect` — vitest core wrappers for AI analysis
- `aiExpect(value).toSatisfy(criterion)` — LLM-judged semantic assertions

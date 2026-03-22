# §1j Token/Cost Management

Reference: `lib/text-batch` provides `createBatches` with `maxTokenBudget`,
`outputRatio`, auto-skip of oversized items.

## Levels

| Level | Description | Example |
|-------|-------------|---------|
| 0 | No token awareness, sends entire input regardless of size | themes, veiled-variants, conversation |
| 1 | Manual chunking (split by character/word count) | collect-terms, glossary |
| 2 | Uses `createBatches` for token-budget-aware splitting | map, filter, reduce, find, group |
| 3 | Model-aware budget calculation via `budgetTokens` | disambiguate, dismantle, socratic |
| 4 | Proportional multi-value budget management with auto-summarization | summary-map |

## Observations

- `maxTokenBudget` default is 4000 — too low for many real items. Profiler
  exercise needed 32000. Callers must know to override this.
- `FALLBACK_TOKENS_PER_CHAR = 0.25` used when model tokenizer unavailable.

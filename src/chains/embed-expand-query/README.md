# embed-expand-query

Expand a single search query into multiple queries using diverse strategies. Runs selected query transform verblets in parallel and returns a deduplicated array with the original query first.

```javascript
import embedExpandQuery from '@verblets/chains/embed-expand-query';

const queries = await embedExpandQuery('why do lithium batteries swell');
// → [
//   "why do lithium batteries swell",
//   "What causes swelling in lithium-ion battery cells?",
//   "lithium battery gas buildup and expansion",
//   "electrochemical cell degradation mechanisms",
//   "What are the chemical reactions inside lithium-ion batteries?",
//   "What is the average lifespan of a lithium battery?",
//   "What gases are produced during battery degradation?"
// ]
```

## API

### `embedExpandQuery(query, config?)` → `Promise<string[]>`

| Param | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | — | The original search query |
| `config.strategies` | `string[]` | all | Subset of `['rewrite', 'multi', 'stepBack', 'subquestions']` |
| `config.count` | `number` | `3` | Variant count passed to `multi` and `stepBack` |
| `config.llm` | `object` | — | LLM model options |
| `config.logger` | `object` | — | Logger instance |

### Named exports

- `ALL_STRATEGIES` — `['rewrite', 'multi', 'stepBack', 'subquestions']`
- `embedRewriteQuery`, `embedMultiQuery`, `embedStepBack`, `embedSubquestions` — individual verblets for custom composition

## Use case

Query expansion for RAG pipelines. Instead of searching with a single query, expand into multiple angles to maximize recall from a vector store, then merge and rerank the results.

# embed-rewrite-query

Rewrite a search query for clarity and specificity. Expands abbreviations, resolves ambiguous terms, and adds relevant keywords to improve retrieval quality.

```javascript
import embedRewriteQuery from '@verblets/verblets/embed-rewrite-query';

const improved = await embedRewriteQuery('plants food');
// → "How do green plants produce food through photosynthesis?"
```

## API

### `embedRewriteQuery(query, config?)` → `Promise<string>`

| Param | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | — | The search query to rewrite |
| `config.llm` | `object` | — | LLM model options |
| `config.logger` | `object` | — | Logger instance |

See [shared configuration](../../chains/README.md#shared-configuration) for common config params.

## Use case

Improving retrieval recall by disambiguating terse or vague user queries before they hit the search index.

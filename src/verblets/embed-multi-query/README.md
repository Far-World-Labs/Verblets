# embed-multi-query

Generate diverse search query variants from a single query. Each variant approaches the topic from a different angle or uses different terminology for broader retrieval coverage.

```javascript
import embedMultiQuery from '@verblets/verblets/embed-multi-query';

const variants = await embedMultiQuery('how do plants make food');
// → [
//   "photosynthesis process in green plants",
//   "how do plants convert sunlight to energy",
//   "plant nutrition and glucose production"
// ]
```

## API

### `embedMultiQuery(query, config?)` → `Promise<string[]>`

| Param | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | — | The original search query |
| `config.count` | `number` | `3` | Number of variants to generate |
| `config.llm` | `object` | — | LLM model options |
| `config.logger` | `object` | — | Logger instance |

See [shared configuration](../../chains/README.md#shared-configuration) for common config params.

## Use case

Multi-angle retrieval for higher recall. Searching with several query variants covers synonyms, related concepts, and alternate phrasings that a single query would miss.

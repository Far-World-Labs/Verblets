# embed-subquestions

Split a complex query into atomic sub-questions. Each sub-question targets a single piece of information needed to fully answer the original query.

```javascript
import { embedSubquestions } from '@far-world-labs/verblets';

const parts = await embedSubquestions(
  'Is Tokyo more affordable than London for the average resident?'
);
// → [
//   "What is the average cost of living in Tokyo?",
//   "What is the average cost of living in London?",
//   "What is the average resident income in Tokyo?",
//   "What is the average resident income in London?"
// ]
```

## API

### `embedSubquestions(query, config?)` → `Promise<string[]>`

| Param | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | — | The complex query to decompose |
| `config.llm` | `object` | — | LLM model options |
| `config.logger` | `object` | — | Logger instance |

See [shared configuration](../../chains/README.md#shared-configuration) for common config params.

## Use case

Answering multi-part questions by decomposing then reassembling. Retrieve answers for each sub-question independently, then combine them for a complete, well-supported response.

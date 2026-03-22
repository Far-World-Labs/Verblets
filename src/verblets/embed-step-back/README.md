# embed-step-back

Generate broader, more fundamental questions from a specific query. Steps back from the specifics to underlying concepts and principles.

```javascript
import { embedStepBack } from '@far-world-labs/verblets';

const broader = await embedStepBack('why do lithium batteries swell');
// → [
//   "What are the chemical reactions inside lithium-ion batteries?",
//   "What causes gas generation in electrochemical cells?",
//   "How do battery degradation mechanisms work?"
// ]
```

## API

### `embedStepBack(query, config?)` → `Promise<string[]>`

| Param | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | — | The specific query to step back from |
| `config.count` | `number` | `3` | Number of step-back questions |
| `config.llm` | `object` | — | LLM model options |
| `config.logger` | `object` | — | Logger instance |

See [shared configuration](../../chains/README.md#shared-configuration) for common config params.

## Use case

Retrieving background context for complex questions. When a user asks something specific, step-back questions help surface foundational documents that provide the principles needed to reason about the answer.

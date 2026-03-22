# embed-multi-query

Generate diverse search query variants from a single query. Each variant approaches the topic from a different angle or uses different terminology, improving retrieval coverage when searching a vector store.

```javascript
import { embedMultiQuery } from '@far-world-labs/verblets';

const variants = await embedMultiQuery('how do plants make food');
// ['photosynthesis process in green plants',
//  'how do plants convert sunlight to energy',
//  'plant nutrition and glucose production']
```

## API

### `embedMultiQuery(query, config?)` → `Promise<string[]>`

- `query` (string): The original search query
- `config` (Object):
  - `count` (number, default: 3): Number of variants to generate
  - `divergence` (`'low'`|`'high'`): How far variants stray from the original. `'low'` produces tight paraphrases. `'high'` generates maximally diverse reformulations.
  - `llm` (string|Object): LLM configuration

Multi-angle retrieval covers synonyms, related concepts, and alternate phrasings that a single query would miss.

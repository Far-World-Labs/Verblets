# embed-rewrite-query

Rewrite a search query for clarity and specificity. Expands abbreviations, resolves ambiguous terms, and adds relevant keywords to improve retrieval quality.

```javascript
import { embedRewriteQuery } from '@far-world-labs/verblets';

const improved = await embedRewriteQuery('plants food');
// 'How do green plants produce food through photosynthesis?'
```

## API

### `embedRewriteQuery(query, config?)` → `Promise<string>`

- `query` (string): The search query to rewrite
- `config` (Object):
  - `llm` (string|Object): LLM configuration

Improves retrieval recall by disambiguating terse or vague queries before they hit the search index.

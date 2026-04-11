# embed-rewrite-to-output-doc

Generate a hypothetical document that answers a query, using the HyDE (Hypothetical Document Embeddings) technique. The generated passage can be embedded and used for similarity search, bridging the vocabulary gap between short questions and longer source documents.

```javascript
import { embedRewriteToOutputDoc } from '@far-world-labs/verblets';

const hypothetical = await embedRewriteToOutputDoc(
  'What causes aurora borealis?'
);
// => "The aurora borealis, or northern lights, is caused by charged particles
//     from the solar wind interacting with gases in Earth's magnetosphere..."
```

The hypothetical document shares vocabulary and structure with real source documents, making it more effective as an embedding query than the original short question.

## API

### `embedRewriteToOutputDoc(query, config?)`

- **query** (string): The search query to expand into a hypothetical answer
- **config** (Object): Configuration options
  - **llm** (string|Object): LLM configuration

**Returns:** `Promise<string>` — A hypothetical document passage answering the query

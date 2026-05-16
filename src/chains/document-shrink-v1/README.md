# document-shrink

Compress a document to a target size while preserving content most relevant to a query. The algorithm combines fast TF-IDF scoring for bulk selection with optional LLM scoring and compression for edge cases, all within a token budget.

```javascript
import { documentShrink } from '@far-world-labs/verblets';

const article = // ... long article about climate policy
const result = await documentShrink(article, 'What can individuals do?', {
  targetSize: 800,
  tokenBudget: 1000,
});

console.log(result.content);
// Selected chunks joined with "---" separators between non-consecutive sections

console.log(result.metadata);
// {
//   originalSize: 12400, finalSize: 790, reductionRatio: '0.94',
//   chunks: { total: 25, tfIdfSelected: 3, llmSelected: 1, compressed: 2, gapFillers: 0 },
//   tokens: { budget: 1000, used: 480, breakdown: { expansion: 200, scoring: 160, compression: 120 } }
// }
```

## How It Works

1. **Adaptive chunking** — chunk size adjusts based on reduction ratio and document length. Heavy reduction uses larger chunks for better context; small documents use smaller chunks for granularity.

2. **Query expansion** — uses `collectTerms` to find related search terms, broadening the TF-IDF matching vocabulary. Gated by `thoroughness`.

3. **TF-IDF selection** — scores all chunks against the expanded query and greedily fills a character budget with the highest-scoring chunks. Space is reserved for LLM-processed content so TF-IDF doesn't consume everything.

4. **LLM edge scoring** — scores borderline chunks (those that didn't make the TF-IDF cut) on a 0-10 relevance scale, then combines TF-IDF and LLM scores with a weighted average. Gated by `thoroughness`.

5. **LLM compression** — compresses high-value chunks that didn't fit at full size, extracting the parts most relevant to the query. Gated by `thoroughness`.

6. **Gap filling** — optionally adds chunks adjacent to selected ones (with decay-weighted scoring) to improve readability. Controlled by `gapFillerBudgetRatio`.

7. **Assembly** — groups consecutive chunks and joins them. Non-consecutive groups are separated by `\n\n---\n\n`.

## Options

- `targetSize` (number): Target document size in characters. Default: 4000
- `tokenBudget` (number): Maximum LLM tokens across all phases. Default: 1000
- `thoroughness` (`'low'`|`'med'`|`'high'`): Controls which pipeline stages run. `'low'` disables all LLM phases (pure TF-IDF, fast and free). `'med'` (default) enables all phases with standard token ratios. `'high'` enables everything with more token budget allocated to compression.
- `compression` (`'low'`|`'high'`|number): Compression ratio for the LLM compression phase. `'low'` (0.45) keeps more of each chunk. `'high'` (0.15) compresses aggressively. Default: 0.3
- `ranking` (`'low'`|`'high'`|number): LLM weight in the combined score for edge chunks. `'low'` (0.3) trusts TF-IDF more. `'high'` (0.9) trusts LLM scoring more. Default: 0.7
- `gapFillerBudgetRatio` (number, 0-1): Portion of target size allocated for gap filling. Default: 0 (disabled)
- `llm` (string|Object): LLM configuration

**Returns:** `{ content: string, metadata: Object }` — the compressed document and detailed statistics about token usage, chunk selection, and reduction ratio.

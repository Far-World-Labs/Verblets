# document-shrink

Shrink documents while preserving content most relevant to a specific query. Uses TF-IDF to prune irrelevant sections and selective LLM compression for edge cases, with token budget awareness. Designed to handle various document sizes through adaptive chunking.

## Usage

```javascript
import documentShrink from './index.js';

const article = // ... 4000+ character article about climate change
const query = "What can individuals do to help?";

const result = await documentShrink(article, query, {
  targetSize: 800,    // Target size in characters
  tokenBudget: 1000   // LLM token budget
});

console.log(result.content);
// => "Individual actions matter too. Reducing meat consumption, choosing public
//     transportation or electric vehicles, improving home energy efficiency..."

console.log(result.metadata.reductionRatio);
// => "0.81" (shrunk by 81%)
```

## Options

- `targetSize`: Target document size in characters (default: 4000)
- `tokenBudget`: Maximum LLM tokens to use (default: 1000)
- `chunkSize`: Base chunk size for processing (default: 500)
- `llm`: LLM configuration

## How it works

1. **Adaptive chunking** - Larger chunks for heavy reduction, smaller for light
2. **Query expansion** - Uses `collectTerms` to find related search terms
3. **TF-IDF pruning** - Fast relevance matching removes irrelevant chunks
4. **LLM scoring** - Scores remaining chunks to find hidden relevance
5. **Smart compression** - Uses leftover tokens to compress large chunks

The algorithm reserves space for LLM-processed content, ensuring TF-IDF doesn't consume the entire budget. Token allocation adapts to reduction needs - more aggressive shrinking uses more LLM tokens for better results.
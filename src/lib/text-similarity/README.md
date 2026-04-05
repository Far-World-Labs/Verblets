# text-similarity

TF-IDF and cosine similarity over a managed collection of text chunks. Supports nearest-neighbor lookup, threshold matching, and k-means clustering. Used internally by chains that need local text comparison without LLM calls.

```javascript
import { init } from '@far-world-labs/verblets';

const { TextSimilarity } = init();

const corpus = new TextSimilarity();

corpus.addChunk('Machine learning is a subset of artificial intelligence');
corpus.addChunk('Deep learning uses neural networks', 'dl-intro');
corpus.addChunk('Natural language processing handles text');

const nearest = corpus.findNearest('artificial intelligence', {
  limit: 5,
  threshold: 0.1,
  includeScores: true,
});
```

## API

### `new TextSimilarity()`

### `addChunk(text, id?)`

Add a text chunk. Returns the chunk ID (auto-generated UUID if not provided). Throws if the ID already exists.

### `deleteChunk(id)`

Remove a chunk. Returns `true` on success, throws if not found.

### `findNearest(query, options?)`

Return the most similar chunks, ranked by cosine similarity.

- **limit** (number, default 10) — max results
- **threshold** (number, default 0.0) — minimum similarity score
- **includeScores** (boolean, default true)

### `findMatches(query, options?)`

Return all chunks above a similarity threshold (default 0.1).

### `clusterChunks(options?)`

Group chunks into clusters using threshold-based agglomeration.

- **numClusters** (number, default 3) — max clusters
- **threshold** (number, default 0.3) — minimum similarity for clustering

### `getChunk(id)` / `getAllChunks()` / `getStats()`

Retrieve individual chunks, the full collection, or corpus statistics (`totalChunks`, `vocabularySize`).

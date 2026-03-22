# embed-neighbor-chunks

Expand retrieved hits with neighboring chunks for richer context. Given search hits and the full chunk array, this module widens each hit to include surrounding chunks, merges overlapping windows, and returns continuous passages.

```javascript
import { embedNeighborChunks } from '@far-world-labs/verblets';

const allChunks = [
  { text: 'Introduction to RAG', start: 0, end: 19 },
  { text: 'Retrieval step explained', start: 20, end: 44 },
  { text: 'Generation step explained', start: 45, end: 70 },
  { text: 'Evaluation and metrics', start: 71, end: 93 },
];

const hits = [{ start: 20, score: 0.92 }];

const passages = embedNeighborChunks(hits, allChunks, { windowSize: 1 });
// → [{
//   text: 'Introduction to RAG\nRetrieval step explained\nGeneration step explained',
//   start: 0, end: 70,
//   chunks: [allChunks[0], allChunks[1], allChunks[2]],
//   score: 0.92
// }]
```

## API

### `embedNeighborChunks(hits, allChunks, options?)` → `Array`

| Param | Type | Default | Description |
|---|---|---|---|
| `hits` | `{ start, score?, text? }[]` | — | Retrieved search hits |
| `allChunks` | `{ start, end?, text }[]` | — | Full ordered chunk array |
| `options.windowSize` | `number` | `1` | Neighbors per side to include |

Hits not found in `allChunks` are included as standalone passages (graceful degradation).

### Helpers

- `buildIndex(allChunks)` — Map chunk start positions to array indices.
- `mergeRanges(ranges)` — Merge sorted overlapping/adjacent ranges, keeping max score.
- `assembleSpan(allChunks, lo, hi, score)` — Build a passage from a contiguous chunk range.
- `standaloneSpan(hit)` — Build a passage from a hit not found in the chunk array.

## Use case

Improving RAG answer quality. Raw vector search returns isolated chunks that may cut off mid-sentence. Expanding with neighbors gives the LLM enough surrounding context to generate coherent, well-grounded answers.

# sort

Sort massive datasets using AI-powered semantic understanding to rank items by nuanced criteria that traditional sorting algorithms can't handle.

## Usage

```javascript
import { sort } from '@far-world-labs/verblets';

// Building a learning path from thousands of YouTube transcripts
const videoTranscripts = [
  "Quantum Computing in 5 Minutes - Let's start with a simple analogy...",
  "MIT 8.04 Quantum Physics Lecture 12 - Today we'll derive the time-independent...",
  "Quantum Computing for Computer Scientists - We'll implement Shor's algorithm...",
  // ... thousands more ...
];

const sorted = await sort(
  videoTranscripts,
  "progression from absolute beginner to research-level understanding"
);

// Returns a curated learning path:
// [
//   "Quantum Computing in 5 Minutes - Let's start with a simple analogy...",
//   "Quantum Computing for Computer Scientists - We'll implement Shor's...",
//   "MIT 8.04 Quantum Physics Lecture 12 - Today we'll derive the time-independent...",
//   // ... perfectly sequenced for gradual learning
// ]
```

## API

### sort(list, criteria, config)

**Parameters:**
- `list` (Array): Items to sort
- `criteria` (string): Natural language description of your sorting priorities
- `config` (Object): Optional configuration
  - `effort` (`'low'`|`'high'`): Controls sorting thoroughness. `'low'` uses fewer extremes (5) and 1 iteration. `'high'` extracts more extremes (15) over 2 iterations. Default: extremeK 10, 1 iteration
  - `extremeK` (number): Override top/bottom items to extract per iteration
  - `iterations` (number): Override sorting passes for refined results
  - `selectBottom` (boolean): Override whether to also find worst items (default: true)
  - `batchSize` (number): Items to process per batch (default: 10)
  - `onProgress` (function): Called with `{top, bottom}` after each iteration
  - `abortSignal` (AbortSignal): Signal to cancel the operation
  - `llm` (string|Object): Model configuration

**Returns:** Promise<Array> - Items sorted by semantic relevance to your criteria


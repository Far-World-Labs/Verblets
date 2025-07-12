# sort

Sort massive datasets using AI-powered semantic understanding to rank items by nuanced criteria that traditional sorting algorithms can't handle.

## Usage

```javascript
import sort from './index.js';

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

## How It Works

The sort chain uses a tournament-style algorithm optimized for LLMs:

1. **Chunked Processing**: Divides data into manageable chunks that fit within context windows
2. **Global Competition**: Each chunk's items compete with the current global best/worst items
3. **Progressive Extraction**: Maintains running champions that represent the true extremes across all data

This ensures correctness - every item has a chance to compete for the top positions, regardless of which chunk it appears in.

## API

### sort(list, criteria, config)

**Parameters:**
- `list` (Array): Items to sort
- `criteria` (string): Natural language description of your sorting priorities
- `config` (Object): Optional configuration
  - `chunkSize` (number): Items to process per batch (default: 10)
  - `extremeK` (number): Top/bottom items to extract per iteration (default: 10)
  - `iterations` (number): Sorting passes for refined results (default: 1)
  - `selectBottom` (boolean): Also find worst items (default: true)
  - `onProgress` (function): Called with `{top, bottom}` after each iteration
  - `llm` (string|Object): Model configuration

**Returns:** Promise<Array> - Items sorted by semantic relevance to your criteria

## Features

- **Scales beyond context windows**: Process datasets of any size through intelligent chunking
- **Semantic understanding**: Sorts by meaning, not just keywords or alphabetical order
- **Efficient LLM usage**: Minimizes API calls while maintaining sorting quality
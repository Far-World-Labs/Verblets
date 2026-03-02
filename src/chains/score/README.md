# score

Evaluate items on a numeric scale using consistent, specification-based scoring.

## Usage

```javascript
import score from './index.js';

const scores = await score(items, 'quality of technical documentation');
// => [8, 6, 9, 4, 7]
```

## Core Functions

### Default Export: `score(list, instructions, config)`

Score multiple items using generated specifications.

```javascript
const scores = await score(
  ['React hooks tutorial', 'CSS basics', 'TypeScript guide'],
  'technical depth and accuracy'
);
```

### Named Exports

#### `scoreItem(item, instructions, config)`
Score a single item.

#### `scoreSpec(instructions, config)`
Generate a scoring specification for reuse.

#### `applyScore(item, specification, config)`
Apply a pre-generated specification to score an item.

## Instruction Builders

Create instructions for use with collection chains:

```javascript
// Transform items into scores
const scores = await map(functions, await mapInstructions('code quality'));

// Filter by score threshold
const ready = await filter(
  components, 
  await filterInstructions({
    scoring: 'production readiness',
    processing: 'keep items with scores >= 7'
  })
);

// Reduce to aggregate scores
const totalImpact = await reduce(
  algorithms,
  await reduceInstructions({
    scoring: 'performance impact on system',
    processing: 'sum all scores to get total impact'
  }),
  { initial: 0 }
);

// Find best match
const best = await find(
  responses,
  await findInstructions({
    scoring: 'user intent alignment',
    processing: 'return the highest scoring item'
  })
);

// Group by score ranges
const grouped = await group(
  tasks,
  await groupInstructions({
    scoring: 'complexity level',
    processing: 'group into: simple (0-3), moderate (4-7), complex (8-10)'
  })
);
```

## Per-Item Mode

Use `score.with()` to create a single-item scoring function. The async factory calls `scoreSpec` once up front, amortizing the spec-generation LLM call across all items:

```javascript
import score from './index.js';
import pMap from 'p-map';

const scorer = await score.with('technical depth');
const results = await pMap(items, scorer, { concurrency: 5 });
```

## Configuration

- `spec`: Pre-built scoring specification (skips the `scoreSpec` LLM call)
- `llm`: LLM configuration object
- `maxParallel`: Concurrent batch operations (default: 3)
- `maxAttempts`: Retry attempts per batch (default: 3)
- `batchSize`: Items per batch (auto-calculated if omitted)

## Architecture

The score chain implements a specification pattern where scoring criteria are generated once and applied many times. For multi-batch lists, the first batch establishes scoring anchors (low/high reference examples) that are embedded in subsequent batch prompts for cross-batch consistency.

- Consistent evaluation across large datasets via anchor-based calibration
- Composition with any collection operation via instruction builders
- Reusable scoring logic through pre-built specifications
- JSON schema response format returns numbers directly (no string conversion)
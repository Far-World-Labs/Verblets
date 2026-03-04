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

Create prompt strings for use with collection chains. Pass a pre-generated specification from `scoreSpec()`:

```javascript
import { scoreSpec, mapInstructions, filterInstructions, reduceInstructions, findInstructions, groupInstructions } from './index.js';

const spec = await scoreSpec('code quality');

// Transform items into scores
const scores = await map(functions, mapInstructions({ specification: spec }));

// Filter by score threshold
const ready = await filter(
  components,
  filterInstructions({
    specification: spec,
    processing: 'keep items with scores >= 7'
  })
);

// Reduce to aggregate scores
const totalImpact = await reduce(
  algorithms,
  reduceInstructions({
    specification: spec,
    processing: 'sum all scores to get total impact'
  }),
  { initial: 0 }
);

// Find best match
const best = await find(
  responses,
  findInstructions({
    specification: spec,
    processing: 'return the highest scoring item'
  })
);

// Group by score ranges
const grouped = await group(
  tasks,
  groupInstructions({
    specification: spec,
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
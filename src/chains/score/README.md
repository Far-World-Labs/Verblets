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

## Calibration Utilities

Build consistent scoring references:

```javascript
// Select representative examples across score ranges
const reference = buildCalibrationReference(scoredItems, count);

// Format for use in prompts
const calibrationText = formatCalibrationBlock(reference);
```

## Configuration

- `returnTuple`: Get `{value, specification}` instead of string with attached property
- `llm`: LLM configuration object
- `maxParallel`: Concurrent scoring operations (default: 3)

## Architecture

The score chain implements a specification pattern where scoring criteria are generated once and applied many times. This enables:

- Consistent evaluation across large datasets
- Composition with any collection operation
- Reusable scoring logic
- Clear separation between specification and application

Instructions are returned as strings with attached specification properties, enabling both simple string usage and programmatic access to the underlying specification.
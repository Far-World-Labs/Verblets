# score

Score items on a numeric scale using AI-generated evaluation criteria.

## Example

```javascript
import score, { scoreSpec } from './index.js';

// Score job applicant cover letters on persuasiveness
const scores = await score(
  [coverLetter1, coverLetter2, coverLetter3],
  'persuasiveness: does this make you want to interview the candidate?'
);
// => [8, 4, 7]

// Pre-generate spec for reuse across batches
const spec = await scoreSpec('technical depth and practical applicability');
const batch1 = await score(articles.slice(0, 20), 'technical depth', { spec });
const batch2 = await score(articles.slice(20), 'technical depth', { spec });
```

## API

### Default: `score(list, instructions, config?)` — score multiple items

### Named exports

- `scoreItem(item, instructions, config)` — score a single item
- `scoreSpec(instructions, config)` — generate reusable scoring specification
- `applyScore(item, specification, config)` — apply pre-generated spec
- `score.with(instructions, config)` — async factory returning a single-item scorer (calls `scoreSpec` once)

### Instruction builders (for collection chains)

- `mapInstructions({ specification, processing })`
- `filterInstructions({ specification, processing })`
- `reduceInstructions({ specification, processing })`
- `findInstructions({ specification, processing })`
- `groupInstructions({ specification, processing })`

### Config

- `spec`: Pre-built specification (skips the `scoreSpec` LLM call)
- `anchoring` (`'low'`|`'high'`): Cross-batch calibration strategy
- `llm`: LLM configuration
- `maxParallel` (default: 3): Concurrent batch operations
- `maxAttempts` (default: 3): Retry attempts per batch
- `batchSize`: Items per batch (auto-calculated if omitted)

Multi-batch scoring uses anchor examples from the first batch to maintain consistency across subsequent batches.

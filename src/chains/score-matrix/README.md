# score-matrix

Evaluate items against a multi-dimensional rubric in a single operation, producing a matrix of scored rationales.

## Example

```javascript
import { scoreMatrix } from '@far-world-labs/verblets';

// Evaluate grant proposals across funding criteria
const proposals = [
  'CRISPR-based gene therapy for sickle cell disease — Phase II trial data shows 94% remission...',
  'Blockchain-based supply chain tracking for organic produce — pilot with 3 farms...',
  'Novel carbon capture membrane using metal-organic frameworks — lab results show 10x efficiency...',
];

const rubric = [
  { dimension: 'scientific_merit', description: 'Strength of evidence, methodological rigor, novelty of approach' },
  { dimension: 'feasibility', description: 'Technical readiness, team capability, timeline realism' },
  { dimension: 'societal_impact', description: 'Scale of benefit if successful, urgency of the problem addressed' },
];

const { matrix, dimensions, scale } = await scoreMatrix(proposals, rubric);

// matrix[0][2].score    → societal_impact score for the gene therapy proposal
// matrix[0][2].rationale → "Addresses a disease affecting millions globally..."
// matrix[1][0].score    → scientific_merit score for the blockchain proposal

// Find the proposal with highest average score
const averages = matrix.map(row =>
  row.reduce((sum, cell) => sum + cell.score, 0) / row.length
);
```

Where `score` gives you a single number per item, `scoreMatrix` gives you a full evaluation grid — every item scored on every dimension with an explanation. Use it when a single score would hide important differences.

## API

### Default: `scoreMatrix(items, rubric, instructions?, config?)`

- `items` — array of strings to evaluate
- `rubric` — dimension array or a string (treated as a single "overall" dimension)
- `instructions` — optional scoring guidance (scale, emphasis, strictness)
- `config` — chain configuration

Returns `{ matrix, dimensions, scale }` where `matrix[i][j]` is `{ score, rationale }` for item `i` on dimension `j`. Rows that fail to score after retries are left as `undefined` so callers can distinguish them from real low-score results. If every row fails, the chain throws.

### Named exports

- `normalizeRubric(rubric)` — validate and normalize a rubric to canonical dimension array form
- `scoreMatrixInstructions({ rubric, text, anchors, ...context })` — build an instruction bundle for composition with other chains
- `mapAnchoring(value)` — option mapper for the anchoring strategy dial

### Rubric formats

Dimension array (most common):
```javascript
const rubric = [
  { dimension: 'clarity', description: 'How clearly the idea is communicated' },
  { dimension: 'originality' },  // description is optional
];
```

String (single dimension):
```javascript
const result = await scoreMatrix(items, 'How persuasive is the argument?');
// result.dimensions → ['overall']
```

### Config

- `anchoring` (`'low'` | `'high'`): Cross-batch calibration. `'high'` uses richer anchor examples from the first batch. Default: medium.
- `maxParallel` (default: 3): Concurrent batch operations for large item sets.
- `maxAttempts` (default: 2): Retry attempts for failed rows.
- `errorPosture` (`'strict'` | `'resilient'`): Whether batch failures throw or degrade gracefully.
- `temperature` (default: 0): LLM temperature. Low values give more consistent scoring.
- `llm`: LLM configuration (model selection, capabilities).

### Batching

Small matrices (up to ~15 items) are scored in a single LLM call. Larger sets are automatically batched by item count, with the first batch establishing calibration anchors that subsequent batches use for scoring consistency.

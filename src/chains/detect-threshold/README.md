# detect-threshold

Recommend threshold values for a numeric property by combining statistical analysis with LLM reasoning about operational goals.

The chain first computes percentiles and distribution statistics, then streams enriched data through `reduce` so the LLM can observe patterns across batches. A final LLM call synthesizes those observations into concrete threshold candidates with rationales. Candidates outside the observed data range are automatically discarded.

```javascript
import { detectThreshold } from '@far-world-labs/verblets';

const result = await detectThreshold({
  data: transactions,
  targetProperty: 'riskScore',
  goal: 'Minimize false positives while catching high-risk transactions'
});

// result.thresholdCandidates — array of { value, rationale }
// result.distributionAnalysis — { mean, median, standardDeviation, min, max, percentiles, dataPoints }
```

## API

### `detectThreshold({ data, targetProperty, goal, ...options })`

- **data** (`Array<Object>`): Records containing the target property
- **targetProperty** (`string`): Numeric property to analyze
- **goal** (`string`): Natural language description of what the threshold should optimize for
- **batchSize** (`number`, default: 50): Records per reduce batch
- **onProgress** (`Function`): Progress callback
- **llm** (`string|Object`): LLM configuration (defaults to `{ good: true }`)

Returns `{ thresholdCandidates, distributionAnalysis }`. The `calculateStatistics` helper is also exported for use outside the chain.
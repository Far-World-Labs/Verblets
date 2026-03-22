# join

Merge text fragments into a single coherent document using windowed processing. Fragments are processed in overlapping windows so each piece gets equal context from its neighbors, then the overlapping outputs are stitched together.

```javascript
import { join } from '@far-world-labs/verblets';

// Reassemble a research paper from separately-summarized sections
const sectionSummaries = [
  'The migration patterns of Arctic terns span 44,000 miles annually...',
  'Satellite tracking data from 2018-2023 reveals shifting stopover sites...',
  'Climate models predict a 12% northward shift in breeding grounds...',
  'Conservation implications center on protecting coastal staging areas...',
  'Cross-species comparisons show terns are the earliest adapters...'
];

const paper = await join(
  sectionSummaries,
  'Weave these section summaries into a single flowing research overview'
);
```

## API

### `join(fragments, prompt, config)`

- **fragments** (Array): Text fragments to merge
- **prompt** (string): Instructions for how to merge (controls style, format, level of synthesis)
- **config.fidelity** (`'low'`|`'med'`|`'high'`|Object): Coordinates window size and overlap. `'low'` uses larger windows with less overlap (windowSize 10, 25% overlap) for fewer LLM calls. `'med'` (default) balances both (windowSize 5, 50% overlap). `'high'` uses smaller windows with more overlap (windowSize 3, 67%) for smoother transitions. Pass an object `{ windowSize, overlapPercent }` for fine-grained control.
- **config.styleHint** (string): Additional style guidance appended to the prompt
- **config.maxAttempts** (number): Maximum retry attempts (default: 3)
- **config.llm** (string|Object): LLM model configuration
- **config.onProgress** (function): Progress callback
- **config.abortSignal** (AbortSignal): Signal to cancel the operation

**Returns:** `Promise<string>` — Single merged result

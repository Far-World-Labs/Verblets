# find

Return the single best match from a list based on natural language criteria. Processes items in parallel batches and short-circuits once a match is found.

```javascript
import { find } from '@far-world-labs/verblets';

const reviews = [
  'Great battery life, easily lasts two days of heavy use',
  'The screen is gorgeous but the bezels are huge',
  'Camera quality is stunning in low light conditions',
  'Feels cheap and plasticky despite the premium price',
  'Face unlock is instant, never had a false reject'
];

const complaint = await find(reviews, 'a review that criticizes build quality or materials');
// => 'Feels cheap and plasticky despite the premium price'
```

The AI evaluates meaning, not keywords — it would match "plasticky" to "build quality" even though the words don't overlap.

## API

### `find(array, criteria, config)`

- **array** (Array): Items to search through
- **criteria** (string): Natural language description of what to find
- **config.batchSize** (number): Items per batch (auto-calculated if omitted)
- **config.maxParallel** (number): Concurrent batch operations (default: 3)
- **config.onProgress** (function): Progress callback
- **config.abortSignal** (AbortSignal): Signal to cancel the operation
- **config.llm** (string|Object): LLM model configuration

**Returns:** `Promise<string>` — Best matching item, or empty string if none found

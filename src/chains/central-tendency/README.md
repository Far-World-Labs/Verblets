# central-tendency

Batch-evaluate graded category membership across large datasets. Processes items in chunks while maintaining scoring consistency.

For single-item evaluation, use the [central-tendency-lines](../../verblets/central-tendency-lines) verblet.

## Example

```javascript
import { centralTendency } from '@far-world-labs/verblets';

// Which of these are "typical" mammals? Bats and whales challenge the boundary.
const results = await centralTendency(
  ['wolf', 'tiger', 'elephant', 'whale', 'dolphin', 'bat'],
  ['dog', 'cat', 'horse', 'cow'],
  {
    context: 'Mammalian characteristics and traits',
    coreFeatures: ['warm-blooded', 'hair/fur', 'mammary glands', 'live birth'],
    batchSize: 3
  }
);
// => [{ score: 0.91, reason: "...", confidence: 0.88 }, ...]
```

## API

### `centralTendency(items, seedItems, config)`

- **items** (string[]): Items to evaluate
- **seedItems** (string[]): Known category members for comparison
- **config**:
  - `context` (string): Evaluation context (default: `''`)
  - `coreFeatures` (string[]): Definitional features (default: `[]`)
  - `batchSize` (number, default: 5): Items per chunk
  - `maxAttempts` (number, default: 3): Retry attempts per batch
  - `onProgress` (function): Progress callback
  - `abortSignal` (AbortSignal): Cancellation signal
  - `llm` (string|object): LLM configuration

Returns `Array<{ score, reason, confidence }>`, one per input item.

# Batching

Chains that process lists split items into batches sized to fit within the model's context window, then run batches in parallel with controlled concurrency.

## How batch sizing works

The `createBatches` function (from `src/lib/text-batch/`) resolves the model, estimates token counts for each item, and calculates how many items fit in one LLM call. The calculation accounts for the model's context window, output token limit, and a safety margin.

When `batchSize` is set on config, it overrides the auto-calculation. Otherwise the system picks a size based on token economics. Items that individually exceed the per-item token budget are placed in their own single-item batches and flagged with `skip: true` if they exceed the entire input budget.

## The standard chain pattern

Most batch-processing chains use `prepareBatches` (which calls `createBatches` and sets up a `batchTracker`) followed by `parallelBatch`:

```javascript
import { prepareBatches } from '../../lib/progress-callback/index.js';
import parallel from '../../lib/parallel-batch/index.js';

export default async function myChain(items, inputConfig = {}) {
  const runConfig = nameStep('my-chain', inputConfig);
  const span = track('my-chain', runConfig);

  const { batches, tracker } = await prepareBatches('my-chain', items, runConfig);

  const results = await parallel(
    batches.filter(b => !b.skip),
    async (batch) => {
      const result = await retry(
        () => callLlm(buildPrompt(batch.items), runConfig),
        { label: 'my-chain:batch', config: runConfig }
      );
      tracker.batchDone(batch.startIndex, batch.items.length);
      return result;
    },
    { maxParallel: runConfig.maxParallel ?? 3 }
  );

  tracker.complete();
  return results.flat();
}
```

## parallelBatch

`parallelBatch` from `src/lib/parallel-batch/` runs batches with controlled concurrency. It processes `maxParallel` batches at a time and preserves input order in the results.

Two error postures:
- `'strict'` (default) — fails on the first error, like `Promise.all`
- `'resilient'` — continues on errors, fills `undefined` for failed items, like `Promise.allSettled`

```javascript
import parallel from '../../lib/parallel-batch/index.js';

const results = await parallel(batches, processBatch, {
  maxParallel: 5,
  errorPosture: 'resilient',
});
```

## Consumer configuration

Consumers control batching through config:

```javascript
await filter(items, 'relevant', {
  batchSize: 10,      // items per LLM call (overrides auto-calculation)
  maxParallel: 3,     // concurrent batch requests
});
```

When `batchSize` is omitted, auto-sizing picks the largest batch that fits the model's context window. This is usually the right choice — set `batchSize` explicitly only when you need deterministic batching or know the optimal size for your data.

## Batch object shape

Each batch from `createBatches` includes:

```javascript
{
  items: ['item1', 'item2', ...],  // the items in this batch
  startIndex: 0,                    // position in the original list
  skip: false,                      // true if items exceed token budget
}
```

## Source

- `src/lib/text-batch/index.js` — `createBatches`, token-aware batch sizing
- `src/lib/parallel-batch/index.js` — `parallelBatch`, concurrency control
- `src/lib/progress-callback/index.js` — `prepareBatches`, combines batching with progress tracking

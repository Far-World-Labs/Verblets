# Progress Tracking

Chains report progress through the `onProgress` callback, a function the consumer passes on the config object. Progress events are plain objects with a `step`, `event`, `timestamp`, and additional fields depending on the event type.

## Consumer usage

```javascript
await filter(items, 'relevant', {
  onProgress: (event) => {
    console.log(`[${event.step}] ${event.event} — ${event.processedItems}/${event.totalItems}`);
  },
});
```

Events follow a lifecycle: `start` → repeated `batch:complete` → `complete` (or `error`). Each event includes a computed `progress` field (0 to 1) when `totalItems` and `processedItems` are present.

## Chain author usage

### prepareBatches + trackBatch

The most common pattern for batch-processing chains. `prepareBatches` creates batches and a tracker in one call. The tracker manages counters and emits events automatically:

```javascript
import { prepareBatches } from '../../lib/progress/index.js';
import parallel from '../../lib/parallel-batch/index.js';

const { batches, tracker } = await prepareBatches('filter', items, config);

const results = await parallel(batches, async (batch) => {
  const result = await processOneBatch(batch.items, config);
  tracker.batchDone(batch.startIndex, batch.items.length);
  return result;
}, { maxParallel: 3 });

tracker.complete();
```

The tracker exposes:
- `start(batchCount, maxParallel?)` — emits start event (called by `prepareBatches`)
- `forBatch(startIndex, batchSize)` — returns a scoped progress callback for retry events within a batch
- `batchDone(startIndex, batchSize)` — increments counters and emits `batch:complete`
- `complete(metadata?)` — emits final complete event
- `scopedProgress(phase)` — returns a `scopeProgress`-wrapped callback for nested chains

### scopeProgress

When a chain passes `onProgress` to a nested chain call, wrap it with `scopeProgress` to tag events with a `phase` field. This lets consumers distinguish events from different stages of a multi-phase pipeline:

```javascript
import { scopeProgress } from '../../lib/progress/index.js';

await reduce(items, prompt, {
  ...config,
  onProgress: scopeProgress(config.onProgress, 'reduce:category-discovery'),
});
```

Phases compose when nested. If the outer scope is `'group:workflow'` and the inner scope is `'reduce:extraction'`, the consumer sees `phase: 'group:workflow/reduce:extraction'`. The naming convention is `chainName:purpose`.

### filterProgress

Controls event granularity. Chains can resolve a `progressMode` option and apply it:

| Mode | Events emitted |
|------|---------------|
| `'detailed'` | All events (default) |
| `'batch'` | `start`, `complete`, `batch:complete` |
| `'coarse'` | `start`, `complete` only |
| `'none'` | No events |

`prepareBatches` applies `filterProgress` automatically based on the `progressMode` passed in.

### Direct emit functions

For non-batch operations, use the individual emit helpers: `emitStep`, `emitPhase`, or call `emit()` directly for start/complete events. All are no-ops when the callback is absent.

## Event shape

Every event includes at minimum:

```javascript
{
  step: 'filter',           // chain name
  event: 'batch:complete',  // lifecycle event
  timestamp: '...',         // ISO string
  // batch events also include:
  totalItems: 100,
  processedItems: 30,
  progress: 0.3,            // computed
  batchNumber: 3,
  batchSize: 10,
  totalBatches: 10,
}
```

Retry events add `attemptNumber`, `maxAttempts`, and `delay`. Error events add `error` (message string) and `final: true`.

## Source

All exports are from `src/lib/progress/index.js`.

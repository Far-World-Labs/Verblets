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

Events follow a lifecycle: `chain:start` → repeated `batch:complete` → `chain:complete` (or `chain:error`). Each event includes a computed `progress` field (0 to 1) when `totalItems` and `processedItems` are present.

## Chain author usage

### createProgressEmitter

The single export from `src/lib/progress/index.js`. Creates a lifecycle emitter bound to a named operation:

```javascript
import createProgressEmitter from '../../lib/progress/index.js';

const emitter = createProgressEmitter('filter', runConfig.onProgress, runConfig);
emitter.start();
```

The emitter does not emit on construction — call `start()` explicitly to emit the `chain:start` event. The returned handle exposes:
- `start()` — emit `chain:start` event
- `emit(data)` — dispatch an operation event (default kind: `'operation'`)
- `complete(meta?)` — emit `chain:complete` telemetry with auto-calculated duration
- `error(err, meta?)` — emit `chain:error` telemetry with error message and duration

The callback is an explicit positional argument — not read from config. The third argument (`options`) provides `operation` (composed path from `nameStep`) and `now` (timestamp for duration calculation).

### Batch progress

Chains that process lists track batch progress inline:

```javascript
let processedItems = 0;
const results = await parallel(activeBatches, async (batch) => {
  const result = await processOneBatch(batch.items, runConfig);
  processedItems += batch.items.length;
  emitter.emit({
    event: 'batch:complete',
    totalItems: items.length,
    processedItems,
  });
  return result;
}, { maxParallel: 3 });

emitter.complete({ totalItems: items.length });
```

### Phase scoping

When a chain passes `onProgress` to a nested chain call, wrap the callback inline to tag events with a `phase` field. This lets consumers distinguish events from different stages of a multi-phase pipeline:

```javascript
await reduce(items, prompt, {
  ...runConfig,
  onProgress: runConfig.onProgress && ((e) =>
    runConfig.onProgress({ ...e, phase: e.phase ? `group:extraction/${e.phase}` : 'group:extraction' })),
});
```

Phases compose when nested. If the outer scope is `'group:workflow'` and the inner scope is `'reduce:extraction'`, the consumer sees `phase: 'group:workflow/reduce:extraction'`. The naming convention is `chainName:purpose`.

## Event shape

Every event includes at minimum:

```javascript
{
  kind: 'operation',        // 'operation' or 'telemetry'
  step: 'filter',           // chain name
  event: 'batch:complete',  // lifecycle event
  timestamp: '...',         // ISO string
  // batch events also include:
  totalItems: 100,
  processedItems: 30,
  progress: 0.3,            // auto-computed when totalItems and processedItems present
}
```

Telemetry events (`kind: 'telemetry'`) include `chain:start`, `chain:complete`, `chain:error`, `llm:model`, `llm:call`, `retry:attempt`, `retry:error`, `retry:exhaust`, and `option:resolve`.

## Source

`src/lib/progress/index.js` — `createProgressEmitter` (default), `scopePhase` (named).

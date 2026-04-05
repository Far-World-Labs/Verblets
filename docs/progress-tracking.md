# Progress Tracking

Chains and verblets report progress through the `onProgress` callback, a function the consumer passes on the config object. Progress events are plain objects with a `step`, `event`, `timestamp`, and additional fields depending on the event type.

## Consumer usage

```javascript
await filter(items, 'relevant', {
  onProgress: (event) => {
    console.log(`[${event.step}] ${event.event} — ${event.processedItems}/${event.totalItems}`);
  },
});
```

Events follow a lifecycle: `chain:start` → repeated `batch:complete` → `chain:complete` (or `chain:error`). Each event includes a computed `progress` field (0 to 1) when `totalItems` and `processedItems` are present.

## Event taxonomy

Every event carries a `kind` field that describes its **structural shape** — what fields to expect and how it's produced. `kind` does not gatekeep access: any consumer can subscribe to any event regardless of kind.

### Four kinds

| Kind | Shape | Answers | Example consumer |
|------|-------|---------|-----------------|
| `event` | Decisions, phases, meaningful outcomes | What was decided? What was produced? Why? | Audit logs, decision traces |
| `operation` | Execution progress, batch bookkeeping, retry mechanics | Where are we? What happened structurally? | Progress bars, execution traces |
| `telemetry` | Measurements — counts, durations, rates | How much? How long? How often? | Dashboards, monitoring |
| logging | Message + level (via `Level` enum) | What happened in human terms? | Console output, log aggregators |

Logging is emitted through the same pathway as other events using `Level` (debug, info, warn, error). It is not a separate subsystem.

### Kind describes shape, not audience

A single event may be relevant to multiple consumers. For example:
- `llm:model` (telemetry) reports which model was selected — a monitoring consumer charts model distribution, while a debugging consumer uses it to understand why a particular model was chosen. The event is structurally telemetry (infrastructure measurement) even though domain consumers subscribe to it.
- `retry:attempt` (operation) tracks retry mechanics — a progress consumer shows retry state, while a metrics consumer derives error rates from it. The event is structurally operational even though telemetry consumers derive measurements.

### Constants

All event names are frozen constants in `src/lib/progress/constants.js`:

- **ChainEvent** — lifecycle: `start`, `complete`, `error`
- **OpEvent** — execution mechanics: `start`, `complete`, `batchComplete`, `retry`, `error`
- **DomainEvent** — meaningful moments: `phase`, `step`
- **TelemetryEvent** — infrastructure: `llmModel`, `llmCall`, `retryAttempt`, `retryError`, `retryExhaust`, `optionResolve`
- **Metric** — OTel-aligned dimensional metrics: `tokenUsage`, `llmDuration`, `retryDelay`, `tickDuration`
- **Level** — log severity: `debug`, `info`, `warn`, `error`

## Chain author usage

### createProgressEmitter

The default export from `src/lib/progress/index.js`. Creates a lifecycle emitter bound to a named operation:

```javascript
import createProgressEmitter from '../../lib/progress/index.js';

const emitter = createProgressEmitter('filter', runConfig.onProgress, runConfig);
emitter.start();
```

The emitter does not emit on construction — call `start()` explicitly to emit the `chain:start` event. The returned handle exposes:

- `start(context?)` — emit `chain:start` with optional context
- `emit(data)` — dispatch a domain event (`kind: 'event'`)
- `progress(data)` — dispatch an operation event (`kind: 'operation'`)
- `metrics(data)` — dispatch a telemetry event (`kind: 'telemetry'`)
- `measure(data)` — dispatch a dimensional metric (`kind: 'telemetry'`)
- `complete(meta?)` — emit `chain:complete` with outcome field (`success`, `degraded`, `partial`)
- `error(err, meta?)` — emit `chain:error` with auto-extracted error shape
- `batch(totalItems?)` — returns `done(count)` closure for batch progress tracking

### Lifecycle pattern

```javascript
const runConfig = nameStep(name, config);
const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
emitter.start();
try {
  const opts = await getOptions(runConfig, spec);
  // ... work ...
  emitter.complete({ outcome: 'success' });
} catch (err) {
  emitter.error(err);
  throw err;
}
```

### Batch progress

Chains that process lists use `emitter.batch()`:

```javascript
const batchDone = emitter.batch(items.length);
await parallelBatch(items, async (item) => {
  const result = await processItem(item, runConfig);
  batchDone(1);
  return result;
}, { maxParallel: 3 });
emitter.complete({ outcome: 'success' });
```

### Phase scoping

When delegating to sub-chains, use `scopePhase` to tag events with hierarchical phase paths:

```javascript
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';

await reduce(items, prompt, {
  ...runConfig,
  onProgress: scopePhase(runConfig.onProgress, 'extraction'),
});
```

Phases compose when nested: outer `group:workflow` + inner `reduce:extraction` → `group:workflow/reduce:extraction`.

### Domain events

Use `emitter.emit()` with `DomainEvent` constants for meaningful moments:

```javascript
emitter.emit({ event: DomainEvent.phase, phase: 'analysis' });
emitter.emit({ event: DomainEvent.step, stepName: 'filtered', kept: 12, total: 50 });
```

### Logging

Use the emit pathway with `Level` for log-like events:

```javascript
emitter.emit({ event: DomainEvent.step, stepName: 'retry-pass', level: Level.warn, message: 'Retrying failed items' });
```

## Event shape

Every event includes at minimum:

```javascript
{
  kind: 'operation',        // 'event', 'operation', or 'telemetry'
  step: 'filter',           // chain/verblet name
  event: 'batch:complete',  // event name constant
  timestamp: '...',         // ISO string
  operation: 'filter',      // hierarchical operation path from nameStep
  traceId: '...',           // 32-char hex trace ID
  spanId: '...',            // 16-char hex span ID
  parentSpanId: '...',      // parent span (when nested)
  libraryName: 'verblets',
  libraryVersion: '0.6.3',
}
```

## Source

- Emitter: `src/lib/progress/index.js` (default: `createProgressEmitter`, named: `scopePhase`)
- Constants: `src/lib/progress/constants.js`
- Context: `src/lib/context/option.js` (`nameStep`, `getOptions`, `withPolicy`)

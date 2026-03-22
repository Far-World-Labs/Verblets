# §1b Events/Lifecycle

Reference: `lib/progress-callback` provides standardized event emission.
See platform.md "Lifecycle Events" section for full analysis of standard
vs bespoke events and competing patterns.

## Levels

| Level | Description | Example |
|-------|-------------|---------|
| 0 | No callbacks | themes, truncate, summary-map |
| 1 | Accepts `onProgress` but only passes through to inner calls | anonymize |
| 2 | Emits standard events (start, complete, step) via progress-callback | sort, disambiguate |
| 3 | Batch-level events (batchStart, batchProcessed, batchComplete) | map, filter, reduce, find |
| 4 | Phase-level events for multi-phase operations | group (discovery + assignment phases) |

## Observations

- 12+ chains accept `onProgress` in config but never emit their own events.
- Score emits phase events manually rather than using `emitPhaseProgress`.
- Sort mixes standard emitters with a raw custom-shape `onProgress` call.
- Socratic runs parallel event streams (progress-callback + lifecycle-logger).
- No event catalog exists — consumers must read source to know event shapes.

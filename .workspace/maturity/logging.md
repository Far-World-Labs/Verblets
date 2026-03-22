# §1a Logging

Reference: `lib/lifecycle-logger` provides `createLifecycleLogger` with
`logStart`, `logResult`, `logEvent`, `child`.

## Levels

| Level | Description | Example |
|-------|-------------|---------|
| 0 | No logging | themes, collect-terms |
| 1 | `console.log`/`console.warn` for errors | sort (`process.env.VERBLETS_DEBUG`) |
| 2 | Accepts `logger` config, uses `logger?.info()` inline | filter, reduce, group, find |
| 3 | Uses `createLifecycleLogger` with `logStart`/`logResult` framing | map, extract-blocks |
| 4 | Full lifecycle with `logConstruction`, `logProcessing`, `logEvent`, child loggers | socratic, date, central-tendency |

## Observations

- Competing pattern: inline `logger?.info()` vs `createLifecycleLogger` wrapper.
  See platform.md "lifecycle-logger" section.
- 4 chains missing `logger` in config entirely: themes, collect-terms,
  truncate, veiled-variants.

## Test Logging Pipeline

Verblets has a custom logging infrastructure wired into the test harness.
This is separate from runtime logging — it captures structured events during
test execution for post-hoc analysis. Steven: "the log output should be
reviewed almost as often as the test results."

### How to run

```
VERBLETS_AI_PER_SUITE=true npm run examples
```

### Environment variables

| Variable | Purpose |
|----------|---------|
| `VERBLETS_AI_LOGS_ONLY` | Only show AI-related log events |
| `VERBLETS_AI_PER_SUITE` | Enable per-suite log processing |
| `VERBLETS_AI_DETAIL` | Increase log detail level |
| `VERBLETS_DEBUG` | General debug logging (sort, timeline use this directly) |

### Architecture

**`test-analysis/setup.js`** — Runs in each vitest worker. Creates
`globalThis.logger` backed by a Redis ring buffer. Every `logger.info()`
call during test execution writes structured events to Redis.

**`test-analysis/test-wrappers.js`** — Instruments vitest primitives:
`wrapIt`, `wrapExpect`, `wrapAiExpect`. These wrappers capture test
lifecycle events (test-start, test-complete, expect, ai-expect) and
feed them into the logger.

**`test-analysis/events.js`** — Defines structured event helpers
(`createLogHelpers`) that produce consistent event shapes for the
test domain.

**`test-analysis/reporter.js`** — `TestAnalysisReporter` (vitest reporter
plugin). Creates its own ring buffer, initializes a processor pipeline,
processes events as tests run.

### Processors (pipeline in reporter)

| Processor | Purpose |
|-----------|---------|
| RunSeparator | Separates events by test run boundaries |
| FirstFailure | Captures the first failure event for quick diagnosis |
| CompletionTracking | Tracks which tests completed vs timed out |
| Diagnostic | Produces diagnostic summaries of test execution |
| SuiteDetection | Identifies which test suite an event belongs to |
| SuiteOutput | Formats per-suite output (enabled by `VERBLETS_AI_PER_SUITE`) |
| Details | Extended detail processing (enabled by `VERBLETS_AI_DETAIL`) |

### Relationship to runtime logging

The test logging pipeline and runtime `logger` parameter are distinct systems
that happen to share the logger interface. During tests, `globalThis.logger`
is the test logger (→ Redis). At runtime, `logger` comes from the caller's
config. The test pipeline lets you see what a chain *did* during a test;
the runtime logger lets you observe what a chain *does* in production.

Both feed into `lib/log-adapter/createWrappedLogger`, which normalizes any
logger into the standard LOG_LEVELS interface with fallbacks.

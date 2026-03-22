# test-analysis

**Internal tooling.** A custom Vitest reporter that collects test events via Redis ring buffers, processes them through a pipeline of suite-detection and diagnostic processors, and optionally runs AI-powered analysis on failures.

The module is configured through environment variables:

| Variable | Effect |
|---|---|
| `VERBLETS_AI_LOGS_ONLY` | Emit AI debug logs without analysis |
| `VERBLETS_AI_PER_SUITE` | Run AI analysis per suite |
| `VERBLETS_AI_DETAIL` | Detailed AI analysis mode |
| `VERBLETS_DEBUG` | General debug output |
| `VERBLETS_DEBUG_SUITES` | Suite-level debug output |

## Architecture

The reporter is the default export — drop it into a Vitest config:

```javascript
// vitest.config.js
import TestAnalysisReporter from './src/chains/test-analysis/index.js';

export default {
  test: {
    reporters: [new TestAnalysisReporter()],
  },
};
```

### Subsystems

- **processors/** — Event pipeline: suite detection, diagnostic extraction, first-failure tracking, completion tracking. Each processor extends `BaseProcessor` and receives events sequentially.
- **intent-handlers/** — AI-powered analysis commands: `showLLMPerformanceMetrics`, `showTestErrors`, `listAllPrompts`, `analyzePrompt`, `analyzeFunction`, `showAiInputOutput`, `listModuleFunctions`.
- **views/** — Output formatting for terminal display.

### Event flow

1. Vitest workers emit test events
2. Events are written to a Redis-backed ring buffer (atomic sequence via `INCR`)
3. The reporter's coordinator reads events in batches
4. Processors run in pipeline order per event
5. On suite/run completion, aggregated results feed into intent handlers or views

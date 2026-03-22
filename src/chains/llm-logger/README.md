# llm-logger

Non-destructive logging with parallel AI processors. Logs flow through a ring buffer; processors enhance them with attachments without modifying originals. Output lanes filter and route the enhanced logs.

## Example

An AI processor that auto-categorizes and triages every log line, suppressing low-severity noise from output:

```javascript
import { createLLMLogger, createConsoleWriter } from './index.js';

const logger = createLLMLogger({
  processors: [
    {
      processorId: 'ai-triage',
      description: 'Categorize and assess severity of each log',
      batchSize: 20,
      async process(ndjsonInput) {
        const analysis = await callLLM(ndjsonInput);
        return analysis.map(item => ({
          logId: item.logId,
          adjustments: {
            'ai.category': item.category,
            'ai.severity': item.severity
          },
          aiMeta: { skip: item.severity === 'low', confidence: item.confidence }
        }));
      }
    }
  ],
  lanes: [
    { laneId: 'console', writer: createConsoleWriter('[LOG] ') },
    {
      laneId: 'alerts',
      writer: alertWriter,
      filters: (log) => log.meta.get('level') === 'error'
    }
  ]
});

logger.info('User logged in');
logger.error('Database connection failed');
```

## API Reference

### `createLLMLogger(config)`

**Config:**
- `ringBufferSize` (number): Ring buffer capacity (default: 5000)
- `processors` (LogProcessor[]): Array of log processors
- `lanes` (LogLaneConfig[]): Output lane configurations
- `flushInterval` (number): Flush interval in ms (default: 1000)
- `immediateFlush` (boolean): Flush immediately vs batched (default: false)

### Log Processor Shape

```javascript
{
  processorId: 'unique-id',
  description: 'Human readable description',
  batchSize: 10,
  async process(ndjsonInput) {
    return [{ logId, adjustments: { 'path.to.field': value }, aiMeta: { skip, confidence } }];
  }
}
```

### Lane Shape

```javascript
{ laneId: 'unique-id', writer: (logs) => {}, filters: (log) => boolean }
```

### Logger Methods

**Logging:** `log`, `info`, `warn`, `error`, `debug`, `trace`, `fatal`

**Enhancement:**
- `attachToLog(logId, path, value)` — attach data to a log
- `getLogAttachment(logId, path)` — read attachment
- `markLogSkippable(logId, boolean)` — control output visibility

**Ring Buffer:** `ringBuffer.all()`, `.tail(n)`, `.head(n)`, `.filter(fn)`, `.clear()`

**Utility:** `flush()`, `clear()`, `getStats()`, `getProcessorOffsets()`

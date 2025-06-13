# LLM Logger

The LLM Logger is an **advanced logger implementation** that you can use with the global logger service. It provides sophisticated features like ring buffers, multi-lane processing, and file context tracking.

## ⚠️ Important: Not Used Automatically

The LLM Logger is **NOT automatically used** by the application. You must:

1. **Create an LLM Logger instance** using `createLLMLogger()`
2. **Set it as the global logger** using `setLogger()`

The application uses a noop logger by default and will be silent unless you explicitly configure logging.

## Basic Usage

```javascript
import { setLogger } from 'verblets/lib/logger-service';
import { createLLMLogger, createConsoleWriter } from 'verblets/chains/llm-logger';

// Create an LLM logger instance
const llmLogger = createLLMLogger({
  ringBufferSize: 1000,
  lanes: [
    {
      laneId: 'console',
      writer: createConsoleWriter('[LOG] ')
    }
  ]
});

// Set it as the global logger
setLogger(llmLogger);

// Now all verblets and chains will use this logger
import { bulkMap } from 'verblets';
const result = await bulkMap(items, processor); // Will log using LLM logger
```

## Features

- **Ring Buffer**: Memory-efficient circular buffer for log storage
- **Multi-lane Processing**: Route logs to different outputs based on filters
- **File Context Tracking**: Automatically captures file and line information
- **Batch Processing**: Efficient batching of log outputs
- **Advanced Filtering**: Custom filter functions for sophisticated log routing

## Configuration

### Basic Configuration

```javascript
import { createLLMLogger, createConsoleWriter } from 'verblets/chains/llm-logger';

const logger = createLLMLogger({
  ringBufferSize: 1000,        // Size of the ring buffer
  flushInterval: 100,          // Flush interval in milliseconds
  lanes: [                     // Lane configurations
    {
      laneId: 'all',
      writer: createConsoleWriter()
    }
  ]
});
```

### Multi-lane Configuration

```javascript
const logger = createLLMLogger({
  ringBufferSize: 5000,
  lanes: [
    {
      laneId: 'errors',
      filters: (log) => log.meta.get('level') === 'error',
      writer: createConsoleWriter('[ERROR] ')
    },
    {
      laneId: 'structured',
      filters: (log) => typeof log.raw === 'object',
      writer: createConsoleWriter('[STRUCT] ')
    },
    {
      laneId: 'all',
      writer: createFileWriter('/tmp/all.log')
    }
  ]
});
```

## Lane Configuration

Each lane can have:

- **`laneId`**: Unique identifier for the lane
- **`writer`**: Function that receives an array of log strings
- **`filters`** (optional): Function that determines if a log should be processed by this lane

### Filter Function

The filter function receives a log entry object:

```javascript
{
  id: 'log_1234567890_abc123',
  ts: 1234567890123,
  raw: 'original log data',
  fileContext: { filePath: '/path/to/file.js', line: 42 },
  meta: Map { 'level' => 'info', 'fileContext' => {...} }
}
```

## Writers

### Console Writer

```javascript
import { createConsoleWriter } from 'verblets/chains/llm-logger';

const writer = createConsoleWriter('[PREFIX] ');
// Outputs: [PREFIX] log message
```

### File Writer

```javascript
import { createFileWriter } from 'verblets/chains/llm-logger';

const writer = createFileWriter('/path/to/logfile.log');
// Currently a placeholder - shows: [FILE:/path/to/logfile.log] N lines
```

### Custom Writer

```javascript
const customWriter = (logs) => {
  logs.forEach(log => {
    // Send to external service, database, etc.
    sendToLogService(log);
  });
};
```

## Advanced Usage

### Accessing Ring Buffer

```javascript
const logger = createLLMLogger({...});

// Get all logs
const allLogs = logger.ringBuffer.all();

// Get recent logs
const recentLogs = logger.ringBuffer.tail(10);

// Get oldest logs
const oldestLogs = logger.ringBuffer.head(5);
```

### Manual Flush

```javascript
// Force flush all lanes immediately
logger.flush();
```

### Clear Logs

```javascript
// Clear ring buffer and lane buffers
logger.clear();
```

## Integration with Global Logger Service

```javascript
import { setLogger, log, info, warn, error } from 'verblets';
import { createLLMLogger, createConsoleWriter } from 'verblets/chains/llm-logger';

// Create and set LLM logger
const llmLogger = createLLMLogger({
  lanes: [
    {
      laneId: 'console',
      writer: createConsoleWriter()
    }
  ]
});

setLogger(llmLogger);

// Now you can use global logging functions
log('This goes through the LLM logger');
error('This is an error log');
```

## Examples

See `index.examples.js` for comprehensive examples including:

- Security monitoring systems
- Performance monitoring
- E-commerce transaction processing
- Bulk log analysis

## Legacy API (Deprecated)

The old `initLogger()` and `log(data, logger)` functions are still available for backward compatibility but are deprecated. Use `createLLMLogger()` and the global logger service instead. 
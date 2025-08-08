# logger

Flexible logging system with multiple output streams and file context tracking.

## Purpose

The `logger` module provides a Bunyan-inspired logging system with support for multiple output streams, automatic file/line context extraction, and both async and sync logging methods. It enables structured logging with consistent formatting across different outputs.

## Usage

```javascript
import { createLogger, consoleStream, noopStream, createRingBufferStream } from '../lib/logger/index.js';
import RingBuffer from '../lib/ring-buffer/index.js';

// Create logger with console output
const logger = createLogger({
  streams: [consoleStream],
  includeFileContext: true
});

// Log messages at different levels
await logger.info({ message: 'Server started', port: 3000 });
logger.errorSync({ message: 'Connection failed', error: err.message });
```

## API

### `createLogger(options)`

Creates a new logger instance.

**Parameters:**
- `options` (Object, optional)
  - `streams` (Array): Output streams for log entries (default: [])
  - `includeFileContext` (boolean): Include file/line info (default: true)

**Returns:**
- Logger instance with logging methods and stream management

### Logger Methods

**Async methods** (capture context before async boundary):
- `log(data)` - General logging
- `info(data)` - Informational messages
- `warn(data)` - Warning messages
- `error(data)` - Error messages
- `debug(data)` - Debug information
- `trace(data)` - Detailed trace information
- `fatal(data)` - Fatal errors

**Sync methods**:
- `logSync(data)`, `infoSync(data)`, `warnSync(data)`, `errorSync(data)`, `debugSync(data)`, `traceSync(data)`, `fatalSync(data)`

### Stream Management

- `addStream(stream)` - Add a new output stream
- `removeStream(name)` - Remove a stream by name
- `streams` - Array of active streams

### Built-in Streams

#### `consoleStream`
Writes logs to console with appropriate log levels.

#### `noopStream`
Discards all logs (useful for testing).

#### `createRingBufferStream(ringBuffer)`
Creates a stream that writes to a RingBuffer instance.

**Parameters:**
- `ringBuffer` - RingBuffer instance to write to

**Returns:**
- Stream object compatible with logger

## Log Entry Format

Each log entry contains:
- `ts` - ISO timestamp
- `level` - Log level
- `message` - Log message (if provided)
- `file` - Source file (when includeFileContext is true)
- `line` - Line number (when includeFileContext is true)
- Additional data fields passed to logging methods

## Features

- **Multiple Streams**: Route logs to different destinations simultaneously
- **File Context**: Automatically captures source file and line number
- **Async/Sync Methods**: Choose based on performance needs
- **Structured Data**: Pass objects with multiple fields
- **Stream Management**: Add/remove streams dynamically
- **Error Handling**: Graceful handling of stream write failures

## Notes

- Async methods capture file context before the async boundary for accuracy
- Console stream routes to appropriate console methods (error, warn, log, debug)
- File context extraction uses stack trace parsing
- All streams receive the same log entry object
- Sync methods are useful when async operations aren't suitable

## Related Modules

- [logger-service](../logger-service) - Service-level logging implementation
- [ring-buffer](../ring-buffer) - Circular buffer for log storage
- [debug](../debug) - Simpler debug-only logging
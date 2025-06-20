# Enhanced LLM Logger

Advanced logging system with non-destructive parallel processing, designed for AI/LLM applications that need to enhance logs without modifying original data.

## 🚀 Key Features

### Core Innovations
- **Fully Parallel Processing**: No coordination overhead - processors run independently
- **Non-Destructive Enhancement**: Original logs remain unchanged, enhancements stored as attachments
- **NDJSON Bulk Processing**: Efficient batch processing for LLM interaction
- **Smart Filtering**: AI metadata controls output without affecting stored data
- **Ordered Adjustments**: Processor order determines adjustment priority

### Architecture
- **Ring Buffer**: High-performance circular buffer for log storage
- **Parallel Processors**: Independent processors with individual read offsets
- **Attachment System**: JSON-path syntax for non-destructive data enhancement
- **Lane System**: Multiple output channels with independent filtering
- **AI Metadata**: Separate metadata layer for AI-specific flags

## 📋 Quick Start

```javascript
import { createLLMLogger, createConsoleWriter } from './index.js';

// Create logger with processors
const logger = createLLMLogger({
  ringBufferSize: 1000,
  processors: [
    {
      processorId: 'sentiment-analyzer',
      description: 'Analyzes log sentiment',
      batchSize: 10,
      async process(ndjsonInput) {
        // Process NDJSON batch and return bulk adjustments
        const logs = parseNDJSON(ndjsonInput);
        return logs.map(log => ({
          logId: log.id,
          adjustments: {
            'analysis.sentiment': analyzeSentiment(log.data),
            'analysis.confidence': 0.95
          },
          aiMeta: {
            skip: shouldSkip(log),
            confidence: 0.95
          }
        }));
      }
    }
  ],
  lanes: [
    {
      laneId: 'console',
      writer: createConsoleWriter('[LOG] '),
      filters: (log) => log.meta.get('level') !== 'debug'
    }
  ]
});

// Use the logger
logger.info('User logged in');
logger.error('Database error');
```

## 🔧 API Reference

### Logger Creation

```javascript
createLLMLogger(config)
```

**Config Options:**
- `ringBufferSize` (number): Ring buffer capacity (default: 5000)
- `processors` (LogProcessor[]): Array of log processors
- `lanes` (LogLaneConfig[]): Output lane configurations
- `flushInterval` (number): Flush interval in ms (default: 1000)
- `immediateFlush` (boolean): Immediate vs batched flushing (default: false)

### Log Processors

```javascript
{
  processorId: 'unique-id',
  description: 'Human readable description',
  batchSize: 10,
  async process(ndjsonInput) {
    // Return array of BulkAdjustment objects
    return [{
      logId: 'log-id',
      adjustments: {
        'path.to.field': 'value'
      },
      aiMeta: {
        skip: false,
        confidence: 0.95
      }
    }];
  }
}
```

### Lane Configuration

```javascript
{
  laneId: 'unique-lane-id',
  writer: (logs) => { /* write logs array */ },
  filters: (log) => { /* return boolean */ }
}
```

### Logger Methods

#### Standard Logging
```javascript
logger.log(data)
logger.info(data)
logger.warn(data)
logger.error(data)
logger.debug(data)
logger.trace(data)
logger.fatal(data)
```

#### Enhancement API
```javascript
// Attach data to specific log
logger.attachToLog(logId, 'path.to.field', value)

// Get attachment data
logger.getLogAttachment(logId, 'path.to.field')

// Mark log as skippable
logger.markLogSkippable(logId, true)
```

#### Ring Buffer Access
```javascript
logger.ringBuffer.all()        // Get all logs
logger.ringBuffer.tail(n)      // Get last n logs
logger.ringBuffer.head(n)      // Get first n logs
logger.ringBuffer.filter(fn)   // Filter logs
logger.ringBuffer.clear()      // Clear buffer
```

#### Utility Methods
```javascript
logger.flush()                 // Force flush all lanes
logger.clear()                 // Clear all data
logger.getStats()              // Get processing statistics
logger.getProcessorOffsets()   // Get processor progress
```

## 🔄 Processing Flow

1. **Log Entry**: Log data enters the system
2. **Ring Buffer**: Stored in circular buffer with metadata
3. **Parallel Processing**: Multiple processors work independently
4. **NDJSON Conversion**: Logs converted to NDJSON for LLM processing
5. **Bulk Adjustments**: Processors return structured adjustments
6. **Attachment Application**: Adjustments applied as attachments
7. **Lane Filtering**: Logs filtered through output lanes
8. **AI Metadata Filtering**: Skip flags respected during output
9. **Writer Output**: Final logs sent to configured writers

## 📊 Data Structures

### LogEntry
```javascript
{
  id: 'unique-id',
  ts: Date,
  raw: 'original-data',
  meta: Map,
  attachments: {}, // Non-destructive enhancements
  aiMeta: {}      // AI-specific metadata (not output)
}
```

### BulkAdjustment
```javascript
{
  logId: 'target-log-id',
  adjustments: {
    'path.to.field': 'value',
    'nested.object': { key: 'value' }
  },
  aiMeta: {
    skip: false,
    confidence: 0.95,
    // ... other AI metadata
  }
}
```

### NDJSON Format
```
{"id":"log-1","ts":"2024-01-01T00:00:00Z","level":"info","data":"message","attachments":{}}
{"id":"log-2","ts":"2024-01-01T00:00:01Z","level":"error","data":"error","attachments":{}}
```

## 🎯 Use Cases

### AI Log Analysis
```javascript
const aiProcessor = {
  processorId: 'ai-analyzer',
  description: 'AI-powered log analysis',
  batchSize: 20,
  async process(ndjsonInput) {
    const analysis = await callLLM(ndjsonInput);
    return analysis.map(item => ({
      logId: item.logId,
      adjustments: {
        'ai.category': item.category,
        'ai.severity': item.severity,
        'ai.suggestions': item.suggestions
      },
      aiMeta: {
        skip: item.severity === 'low',
        confidence: item.confidence
      }
    }));
  }
};
```

### Multi-Stage Processing
```javascript
const processors = [
  sentimentProcessor,    // Order 0: First to process
  categoryProcessor,     // Order 1: Sees sentiment results
  priorityProcessor      // Order 2: Sees all previous results
];
```

### Conditional Output
```javascript
const lanes = [
  {
    laneId: 'all-logs',
    writer: fileWriter('all.log'),
    filters: () => true
  },
  {
    laneId: 'errors-only',
    writer: alertWriter,
    filters: (log) => log.meta.get('level') === 'error'
  },
  {
    laneId: 'high-confidence',
    writer: analyticsWriter,
    filters: (log) => log.attachments?.ai?.confidence > 0.8
  }
];
```

## 🔍 Monitoring & Debugging

### Statistics
```javascript
const stats = logger.getStats();
console.log('Ring buffer usage:', stats.writeIndex, '/', stats.maxSize);
console.log('Processors:', stats.processors);
```

### Processor Progress
```javascript
const offsets = logger.getProcessorOffsets();
for (const [processorId, offset] of offsets) {
  console.log(`${processorId}: processed up to offset ${offset}`);
}
```

### Log Inspection
```javascript
const recentLogs = logger.ringBuffer.tail(10);
recentLogs.forEach(log => {
  console.log('Original:', log.raw);
  console.log('Enhanced:', log.attachments);
  console.log('AI Meta:', log.aiMeta);
});
```

## ⚡ Performance Characteristics

- **Parallel Processing**: No blocking between processors
- **Ring Buffer**: O(1) write operations
- **Batch Processing**: Configurable batch sizes for efficiency
- **Memory Bounded**: Fixed memory usage via ring buffer
- **Non-Blocking**: Async processing doesn't block logging

## 🔧 Configuration Examples

### High-Throughput Setup
```javascript
const logger = createLLMLogger({
  ringBufferSize: 10000,
  flushInterval: 100,
  processors: processors.map(p => ({
    ...p,
    batchSize: 50
  }))
});
```

### Real-Time Setup
```javascript
const logger = createLLMLogger({
  immediateFlush: true,
  processors: processors.map(p => ({
    ...p,
    batchSize: 1
  }))
});
```

### Development Setup
```javascript
const logger = createLLMLogger({
  ringBufferSize: 100,
  immediateFlush: true,
  lanes: [{
    laneId: 'console',
    writer: createConsoleWriter('[DEV] ')
  }]
});
```

## 🚨 Error Handling

Processors handle errors gracefully:
- Failed processors retry after delay
- Other processors continue unaffected
- Original logs always preserved
- Error logs available in statistics

## 📈 Migration Guide

### From Basic Logger
```javascript
// Before
const logger = createBasicLogger();
logger.info('message');

// After
const logger = createLLMLogger({
  lanes: [{ laneId: 'console', writer: createConsoleWriter() }]
});
logger.info('message');
```

### Adding Processors
```javascript
// Add processors incrementally
const logger = createLLMLogger({
  // ... existing config
  processors: [
    ...existingProcessors,
    newProcessor
  ]
});
```

This enhanced logger provides a powerful foundation for AI-driven log processing while maintaining compatibility with existing logging patterns. 
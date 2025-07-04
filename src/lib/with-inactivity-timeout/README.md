# with-inactivity-timeout

Wrap async functions with inactivity timeout protection that requires periodic updates to prevent timeout. The timer resets each time the work function calls the provided update callback, ensuring long-running operations stay active by signaling progress.

## Usage

```javascript
import withInactivityTimeout from './index.js';

// Wrap a function that needs to signal progress
const result = await withInactivityTimeout(
  async (onUpdate) => {
    // Long-running operation
    for (let i = 0; i < 1000; i++) {
      await processItem(i);
      
      // Signal we're still active (resets timeout)
      onUpdate(`Processing item ${i}`);
    }
    
    return 'completed';
  },
  5000 // Timeout after 5 seconds of inactivity
);
```

## API

### `withInactivityTimeout(workFunction, timeoutMs, hook)`

**Parameters:**
- `workFunction` (Function): Async function that receives `onUpdate` callback
- `timeoutMs` (number): Milliseconds of inactivity before timeout
- `hook` (Function, optional): Called on each update for monitoring/logging

**Returns:** Promise that resolves with work function result or rejects on timeout

## Use Cases

### File Processing with Progress
```javascript
import withInactivityTimeout from './index.js';

const processLargeFile = async (filePath) => {
  return withInactivityTimeout(
    async (onUpdate) => {
      const lines = await readFileLines(filePath);
      const results = [];
      
      for (let i = 0; i < lines.length; i++) {
        const processed = await processLine(lines[i]);
        results.push(processed);
        
        // Update progress every 100 lines
        if (i % 100 === 0) {
          onUpdate(`Processed ${i}/${lines.length} lines`);
        }
      }
      
      return results;
    },
    10000 // 10 second inactivity timeout
  );
};
```

### Network Operations with Monitoring
```javascript
import withInactivityTimeout from './index.js';

const downloadWithProgress = async (url) => {
  return withInactivityTimeout(
    async (onUpdate) => {
      const response = await fetch(url);
      const chunks = [];
      
      for await (const chunk of response.body) {
        chunks.push(chunk);
        onUpdate(`Downloaded ${chunks.length} chunks`);
      }
      
      return Buffer.concat(chunks);
    },
    5000, // 5 second timeout
    (message) => console.log(`Download progress: ${message}`) // Monitor updates
  );
};
```

## Best Practices

- Call `onUpdate()` regularly during long operations
- Include meaningful progress messages in update calls
- Handle timeout errors gracefully in calling code
- Set appropriate timeout values based on expected operation duration
- Use the hook parameter for centralized logging or monitoring 
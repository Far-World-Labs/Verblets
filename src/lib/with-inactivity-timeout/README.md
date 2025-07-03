# with-inactivity-timeout

Wraps async functions with an inactivity timeout that resets when the function signals it's still working.

## Basic Usage

```javascript
import withInactivityTimeout from './index.js';

// Wrap a long-running function with timeout protection
const result = await withInactivityTimeout(
  async (onUpdate) => {
    // Signal activity to reset the timeout
    onUpdate('Starting process...');
    
    await someWork();
    onUpdate('Halfway done...');
    
    await moreWork();
    onUpdate('Almost finished...');
    
    return 'Complete!';
  },
  5000 // 5 second timeout
);
```

## Parameters

- **work** (Function): Async function that receives an `onUpdate` callback
  - Must call `onUpdate(message, error?)` to signal activity and reset timeout
  - Should return a Promise with the final result
- **timeoutMs** (number): Milliseconds to wait for activity before timing out
- **hook** (Function, optional): Callback to intercept update calls
  - Receives `(input, error)` parameters
  - Called before the timeout is reset

## Return Value

Returns a Promise that:
- Resolves with the work function's result if completed successfully
- Rejects with timeout error if no activity within the specified time
- Rejects with the work function's error if it fails

## Use Cases

- Long-running AI/LLM operations that provide progress updates
- File processing with periodic status reports
- Network operations with keep-alive signals
- Batch processing with progress tracking
- Any async operation that can signal it's still active

## Examples

```javascript
// Basic timeout protection
const processData = async (onUpdate) => {
  for (let i = 0; i < 100; i++) {
    await processItem(i);
    if (i % 10 === 0) {
      onUpdate(`Processed ${i}/100 items`);
    }
  }
  return 'All items processed';
};

const result = await withInactivityTimeout(processData, 10000);

// With error handling and hook
const result = await withInactivityTimeout(
  async (onUpdate) => {
    try {
      const data = await fetchLargeDataset();
      onUpdate('Data fetched, processing...');
      
      const processed = await processDataset(data);
      onUpdate('Processing complete');
      
      return processed;
    } catch (error) {
      onUpdate('Error occurred', error);
      throw error;
    }
  },
  30000, // 30 second timeout
  (message, error) => {
    console.log(`Progress: ${message}`);
    if (error) console.error('Work error:', error);
  }
);

// Timeout scenario
try {
  await withInactivityTimeout(
    async (onUpdate) => {
      onUpdate('Starting...');
      // Long operation without calling onUpdate again
      await new Promise(resolve => setTimeout(resolve, 10000));
      return 'Done';
    },
    5000 // Will timeout after 5 seconds
  );
} catch (error) {
  console.log(error.message); // "Inactivity timeout: no update within 5000ms"
}
```

## How It Works

1. Starts an inactivity timer when the work function begins
2. The work function must call `onUpdate()` to signal it's still active
3. Each `onUpdate()` call resets the inactivity timer
4. If no update occurs within the timeout period, the Promise rejects
5. Optional hook function can intercept all update calls for logging/monitoring

## Best Practices

- Call `onUpdate()` regularly during long operations
- Include meaningful progress messages in update calls
- Handle timeout errors gracefully in calling code
- Set appropriate timeout values based on expected operation duration
- Use the hook parameter for centralized logging or monitoring 
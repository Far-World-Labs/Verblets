# retry

Executes functions with automatic retry logic and exponential backoff. Returns the result of the operation if successful, or throws the final error if all attempts fail.

## Usage

```javascript
import retry from './index.js';

// Basic retry with default settings
const result = await retry(async () => {
  const response = await fetch('https://api.example.com/data');
  if (!response.ok) throw new Error('Network error');
  return response.json();
});

// Custom retry configuration
const data = await retry(
  async () => {
    return await unstableOperation();
  },
  {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    retryCondition: (error) => error.message.includes('timeout')
  }
);
```

## API

### `retry(fn, options)`

**Parameters:**
- `fn` (function): Async function to execute with retry logic
- `options` (object, optional): Configuration options
  - `maxAttempts` (number): Maximum number of attempts (default: 3)
  - `initialDelay` (number): Initial delay in milliseconds (default: 1000)
  - `maxDelay` (number): Maximum delay between attempts (default: 30000)
  - `backoffFactor` (number): Multiplier for exponential backoff (default: 2)
  - `retryCondition` (function): Function to determine if error should trigger retry (default: always retry)

**Returns:** Promise that resolves with the function result or rejects with the final error

## Use Cases

### Network Operations
```javascript
import retry from './index.js';

// Retry API calls with exponential backoff
const fetchUserData = async (userId) => {
  return retry(
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    {
      maxAttempts: 3,
      initialDelay: 500,
      retryCondition: (error) => error.message.includes('HTTP 5')
    }
  );
};
```

### Custom Retry Logic
```javascript
// Only retry on specific error types
const processData = async (data) => {
  return retry(
    async () => {
      return await complexDataProcessing(data);
    },
    {
      maxAttempts: 5,
      retryCondition: (error) => {
        // Only retry on transient errors
        return error.code === 'ECONNRESET' || 
               error.code === 'ETIMEDOUT' ||
               error.message.includes('temporary');
      }
    }
  );
};
```

## Related Modules

- [`with-inactivity-timeout`](../with-inactivity-timeout) - Timeout handling for long operations
- [`chatgpt`](../chatgpt) - LLM integration with built-in retry logic
- [`logger`](../logger) - Logging utilities for debugging retry behavior 
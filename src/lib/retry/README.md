# retry

Robust retry mechanism for handling transient failures in operations with exponential backoff and intelligent error filtering.

## Usage

```javascript
import retry from './retry/index.js';

// Retry a network request
const result = await retry(async () => {
  const response = await fetch('/api/data');
  if (!response.ok) throw new Error('Request failed');
  return response.json();
}, {
  maxAttempts: 3,
  baseDelay: 1000
});
```

## Parameters

- **`operation`** (function, required): Async function to retry
- **`config`** (object, optional): Configuration options
  - **`maxAttempts`** (number, default: 3): Maximum number of retry attempts
  - **`baseDelay`** (number, default: 1000): Initial delay in milliseconds
  - **`maxDelay`** (number, default: 30000): Maximum delay between attempts
  - **`backoffMultiplier`** (number, default: 2): Exponential backoff multiplier
  - **`shouldRetry`** (function, optional): Custom function to determine if error should trigger retry
  - **`onRetry`** (function, optional): Callback executed before each retry attempt

## Return Value

Returns the result of the operation if successful, or throws the final error if all attempts fail.

## Use Cases

### Network Operations with Intelligent Retry
```javascript
import retry from './retry/index.js';

// Retry API requests with exponential backoff
const apiData = await retry(async () => {
  const response = await fetch('/api/users');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}, {
  maxAttempts: 5,
  baseDelay: 500,
  shouldRetry: (error) => {
    // Only retry network errors, not client errors (4xx)
    return error.message.includes('HTTP 5') || error.code === 'NETWORK_ERROR';
  },
  onRetry: (error, attempt) => {
    console.log(`Retry attempt ${attempt} after error:`, error.message);
  }
});
```

## Advanced Usage

### Custom Retry Logic
```javascript
const result = await retry(operation, {
  maxAttempts: 5,
  shouldRetry: (error, attempt) => {
    // Only retry network errors, not validation errors
    return error.code === 'NETWORK_ERROR' && attempt < 3;
  },
  onRetry: (error, attempt) => {
    console.log(`Retry attempt ${attempt} after error:`, error.message);
  }
});
```

### With Timeout Control
```javascript
const controller = new AbortController();
setTimeout(() => controller.abort(), 10000); // 10 second timeout

const result = await retry(
  () => longRunningOperation({ signal: controller.signal }),
  { maxAttempts: 3 }
);
``` 
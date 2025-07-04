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

<<<<<<< HEAD
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

=======
## Features

- **Exponential Backoff**: Intelligent delay scaling to avoid overwhelming failing services
- **Error Filtering**: Customizable logic to determine which errors warrant retries
- **Timeout Handling**: Respects operation timeouts and cancellation signals
- **Retry Callbacks**: Hook into retry attempts for logging or monitoring

## Use Cases

### API Request Handling
```javascript
const apiData = await retry(
  () => fetch('/api/users').then(r => r.json()),
  { maxAttempts: 5, baseDelay: 500 }
);
```

### Database Operations
```javascript
const dbResult = await retry(async () => {
  return await database.query('SELECT * FROM users');
}, {
  maxAttempts: 3,
  shouldRetry: (error) => error.code === 'CONNECTION_LOST'
});
```

### File Operations
```javascript
const fileContent = await retry(
  () => fs.readFile('config.json', 'utf8'),
  { maxAttempts: 2, baseDelay: 100 }
);
```

>>>>>>> origin/main
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
<<<<<<< HEAD
=======
```

## Related Modules

- [`with-inactivity-timeout`](../with-inactivity-timeout/README.md) - Add timeout handling to operations
- [`chatgpt`](../chatgpt/README.md) - Uses retry for API resilience
- [`llm-logger`](../llm-logger/README.md) - Logging integration for retry operations

## Error Handling

```javascript
try {
  const result = await retry(operation, config);
} catch (error) {
  if (error.message.includes('Max attempts exceeded')) {
    console.log('Operation failed after all retry attempts');
  } else {
    console.log('Operation failed with non-retryable error');
  }
}
>>>>>>> origin/main
``` 
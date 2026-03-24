# retry

Executes functions with automatic retry logic for transient failures (429 rate limits, 5xx server errors). Returns the result of the operation if successful, or throws the final error if all attempts fail.

## Usage

```javascript
import { retry } from '@far-world-labs/verblets';

// Basic retry with default settings
const result = await retry(async () => {
  return await callLlm(prompt, config);
});

// With explicit opts
const data = await retry(
  async () => unstableOperation(),
  {
    label: 'my-operation',
    maxAttempts: 5,
    retryDelay: 200,
  }
);

// Config-aware: resolves retry params from config via getOption (policy-aware)
const result = await retry(() => callLlm(prompt, config), {
  label: 'score:batch',
  config,
});
```

## API

### `retry(fn, opts)`

**Parameters:**
- `fn` (function): Async function to execute with retry logic (called with no arguments)
- `opts` (object, optional): Configuration options
  - `label` (string): Label for progress events (default: `''`)
  - `maxAttempts` (number): Maximum number of attempts (default: 3, from `constants/common.js`)
  - `retryDelay` (number): Delay in milliseconds between retries, multiplied by attempt number (default: from `constants/common.js`)
  - `retryOnAll` (boolean): Retry on all errors, not just 429/5xx (default: `false`)
  - `onProgress` (function): Progress callback for start/retry/complete/error events
  - `abortSignal` (AbortSignal): Signal to cancel the operation mid-retry
  - `config` (object): Config object — when provided, `maxAttempts`, `retryDelay`, `retryOnAll`, `onProgress`, and `abortSignal` are resolved from config via `getOption` (policy-aware). Explicit opts always take precedence over config values.

**Returns:** Promise that resolves with the function result or rejects with the final error.

**Retry logic:** Only retries on HTTP 429 (rate limit) and 5xx (server error) status codes by default. Set `retryOnAll: true` to retry on all errors. Non-retryable errors throw immediately.

## Config-aware resolution

When `config` is provided, retry resolves its parameters through `getOption`, which checks the policy channel first. This means a consumer can control retry behavior per-operation:

```javascript
const config = {
  policy: {
    maxAttempts: (ctx) => ctx.operation === 'score' ? 5 : 3,
    retryDelay: () => 500,
  },
};

// retry reads maxAttempts=5 from policy because operation is 'score'
await retry(fn, { label: 'score', config: nameStep('score', config) });
```

Explicit opts always win over config:
```javascript
// maxAttempts=2 from opts, even though config.maxAttempts=5
await retry(fn, { maxAttempts: 2, config });
```

## Abort signal

```javascript
const controller = new AbortController();

// Abort cancels during sleep between retries
setTimeout(() => controller.abort(), 1000);

await retry(fn, {
  maxAttempts: 10,
  retryDelay: 500,
  abortSignal: controller.signal,
});
```

## Progress events

```javascript
await retry(fn, {
  label: 'my-op',
  onProgress: (event) => console.log(event),
});

// Events: { step: 'my-op', event: 'start' | 'retry' | 'complete' | 'error', ... }
```

## Related Modules

- [`context/option`](../context/option.js) - `getOption` used for config-aware resolution
- [`llm`](../llm/README.md) - Primary consumer of retry
- [`progress-callback`](../progress-callback/index.js) - Progress event emission

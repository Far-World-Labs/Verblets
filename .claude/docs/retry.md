# Retry

The `retry` module wraps an async function with automatic retries, abort support, and progress reporting. It is config-aware — all parameters resolve from the config object when present, so chains don't need to extract and re-pass them.

## Usage in chains

```javascript
import retry from '../../lib/retry/index.js';

const result = await retry(
  () => callLlm(prompt, config),
  { label: 'detect-threshold', config }
);
```

That's it. `retry` resolves `maxAttempts`, `retryDelay`, `retryOnAll`, `onProgress`, and `abortSignal` from `config` via `getOption`. The `label` is used in progress events and error messages.

## Parameters

When you need to override the config-resolved values, pass them directly:

```javascript
await retry(fn, {
  label: 'my-operation',
  config,                  // option resolution source
  maxAttempts: 5,          // override config.maxAttempts
  retryDelay: 2000,        // override config.retryDelay (ms)
  retryOnAll: true,        // override config.retryOnAll
  onProgress: callback,    // override config.onProgress
  abortSignal: signal,     // override config.abortSignal
});
```

Direct values take precedence over config-resolved values.

## Retryable errors

By default, retry only retries on HTTP 429 (rate limit) and 5xx (server error) responses. The error must have `error.response.status` set for this detection to work — which is how the LLM provider SDKs surface HTTP errors.

Set `retryOnAll: true` to retry on any error, including client errors and network failures. This is useful for operations where transient failures are common.

## Retry delay

The delay between attempts scales linearly: `retryDelay * attemptNumber`. The first retry has no delay (attempt 0), the second waits `retryDelay`, the third waits `retryDelay * 2`, and so on. The default delay and max attempts are defined in `src/constants/common.js`.

## Abort signal

Pass an `AbortSignal` to cancel the operation mid-retry. The signal is checked before each attempt and during the delay sleep. When aborted, retry throws the signal's reason (or a generic abort error).

```javascript
const controller = new AbortController();
setTimeout(() => controller.abort(), 10000);

await retry(fn, { config, abortSignal: controller.signal });
```

## Progress events

When `onProgress` is available (from config or direct), retry emits:
- `start` — before the first attempt, with `maxAttempts` and `retryOnAll`
- `retry` — after a retryable failure, with `attemptNumber`, `delay`, and `error`
- `complete` — on success, with `totalAttempts`
- `error` — on final failure, with `final: true`

All events include the `label` as the `step` field.

## Source

`src/lib/retry/index.js` — single default export.

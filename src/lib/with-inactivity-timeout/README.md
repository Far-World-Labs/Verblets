# with-inactivity-timeout

Wrap an async function with a timer that resets each time the function signals progress. If the function goes silent for longer than the timeout, the returned promise rejects.

```javascript
import { init } from '@far-world-labs/verblets';

const { withInactivityTimeout } = init();

const result = await withInactivityTimeout(
  async (onUpdate) => {
    for (const item of items) {
      await processItem(item);
      onUpdate(`processed ${item.id}`);  // resets the timer
    }
    return 'done';
  },
  5000  // 5 seconds of silence → timeout
);
```

## API

### `withInactivityTimeout(work, timeoutMs, config?)`

- **work** (Function): Async function receiving an `onUpdate(message, error?)` callback. Each call resets the inactivity timer.
- **timeoutMs** (number): Milliseconds of silence before the promise rejects with an `Error`.
- **config** (Object, optional): Configuration options. For backwards compatibility, a bare function is accepted and treated as `{ hook }`.
  - **hook** (Function): Called on every `onUpdate` with the same arguments — useful for logging or metrics.
  - **abortSignal** (AbortSignal): Signal to abort the timeout externally. When signalled, the promise rejects with the abort reason and cleanup runs immediately.

**Returns:** Promise resolving with the work function's return value, or rejecting on timeout or abort.

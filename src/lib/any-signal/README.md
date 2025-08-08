# any-signal

Combines multiple AbortSignals into a single signal that triggers when any input signal is aborted.

## Purpose

The `any-signal` utility allows you to merge multiple abort signals into one, enabling coordinated cancellation from multiple sources. This is particularly useful when you need to handle both user-initiated cancellations and timeout-based aborts simultaneously.

## Usage

```javascript
import anySignal from '../lib/any-signal/index.js';

// Create multiple abort controllers
const userAbort = new AbortController();
const timeoutAbort = new AbortController();

// Combine their signals
const combinedSignal = anySignal([
  userAbort.signal,
  timeoutAbort.signal
]);

// Use the combined signal in async operations
fetch('https://api.example.com/data', {
  signal: combinedSignal
});

// Aborting from either source will cancel the operation
setTimeout(() => timeoutAbort.abort(), 5000); // Timeout after 5 seconds
// OR
// userAbort.abort(); // User-initiated cancellation
```

## API

### `anySignal(signals)`

Creates a new AbortSignal that triggers when any of the provided signals are aborted.

**Parameters:**
- `signals` (Array<AbortSignal>): An array of AbortSignal instances to monitor

**Returns:**
- `AbortSignal`: A new signal that aborts when any input signal aborts

## Examples

### Combining User Action with Timeout

```javascript
const userController = new AbortController();
const timeoutController = new AbortController();

// Set a 30-second timeout
setTimeout(() => timeoutController.abort(), 30000);

// Combine both signals
const signal = anySignal([
  userController.signal,
  timeoutController.signal
]);

// Pass to async operation
try {
  const response = await fetch('/api/long-running-task', { signal });
  const data = await response.json();
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Operation cancelled');
  }
}
```

### Multiple Operation Coordination

```javascript
const mainController = new AbortController();
const subTask1Controller = new AbortController();
const subTask2Controller = new AbortController();

// Any controller can cancel all operations
const signal = anySignal([
  mainController.signal,
  subTask1Controller.signal,
  subTask2Controller.signal
]);

// Use in multiple async operations
Promise.all([
  fetch('/api/resource1', { signal }),
  fetch('/api/resource2', { signal }),
  fetch('/api/resource3', { signal })
]);
```

## Notes

- Filters out null/undefined signals automatically
- Immediately aborts if any input signal is already aborted
- Compatible with both Node.js and browser environments via `globalThis.AbortController`
- Useful for implementing complex cancellation patterns in async workflows

## Related Modules

- [timed-abort-controller](../timed-abort-controller) - Create time-limited abort controllers
- [with-inactivity-timeout](../with-inactivity-timeout) - Add inactivity timeouts to operations
- [retry](../retry) - Retry operations with abort signal support
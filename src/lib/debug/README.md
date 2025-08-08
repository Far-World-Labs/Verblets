# debug

Minimal debug logging utility controlled by environment variables.

## Purpose

The `debug` module provides conditional logging functionality that outputs to stderr only when debugging is enabled via the `VERBLETS_DEBUG` environment variable. This allows developers to add debug statements that won't clutter production output.

## Usage

```javascript
import { debug } from '../lib/debug/index.js';

debug('Processing user input:', input);
debug('Calculation result:', { value: 42, status: 'complete' });
```

## API

### `debug(...args)`

Logs messages to stderr when debugging is enabled.

**Parameters:**
- `...args` (any): Any number of arguments to log (same as console.error)

**Returns:**
- `void`

## Environment Configuration

Debug output is controlled by the `VERBLETS_DEBUG` environment variable:

```bash
# Enable debug logging
VERBLETS_DEBUG=1 node app.js
VERBLETS_DEBUG=true node app.js
VERBLETS_DEBUG=yes node app.js

# Disable debug logging (default)
node app.js
VERBLETS_DEBUG=false node app.js
```

## Features

- **Zero Overhead**: No output when debugging is disabled
- **Stderr Output**: Logs to stderr to keep stdout clean for application output
- **Flexible Values**: Accepts various truthy values (1, true, yes, etc.)
- **Console Compatible**: Accepts same arguments as console.error

## Example

```javascript
import { debug } from '../lib/debug/index.js';

function processData(items) {
  debug('Starting processData with', items.length, 'items');
  
  const results = items.map(item => {
    debug('Processing item:', item.id);
    const result = transform(item);
    debug('Transform result:', result);
    return result;
  });
  
  debug('Completed processing, returning', results.length, 'results');
  return results;
}
```

## Notes

- Output goes to stderr, not stdout
- Checks environment variable on each call (allows runtime changes)
- Supports all console.error formatting options
- Useful for development and troubleshooting without modifying production code

## Related Modules

- [logger](../logger) - Full-featured logging system
- [logger-service](../logger-service) - Service-level logging
- [env](../env) - Environment variable management
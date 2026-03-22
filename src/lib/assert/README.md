# assert

Lightweight fluent assertion with clear error messages. Used internally for contract checks on inputs.

```javascript
import { assert } from '@far-world-labs/verblets';

assert(2 + 2).toBe(4);                          // passes
assert('hello').toBe('world');                   // throws: Expected "hello" to be "world"
assert(user.id, 'User must have an ID').toBe(expectedId);  // custom message on failure
```

## API

### `assert(actual, message?)`

Returns an `Assertion` instance. `message` overrides the default error text.

### `.toBe(expected)`

Strict equality (`===`). Throws on mismatch, returns the assertion for chaining.

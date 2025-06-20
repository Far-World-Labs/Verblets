# Assert Library

A lightweight assertion library with a fluent interface similar to chai. Provides simple assertions for testing and validation.

## Features

- Fluent interface for readable assertions
- Custom error messages
- Direct equality assertion via `toBe()`
- Lightweight with no dependencies

## Usage

### Basic Assertion

```javascript
import assert from './assert/index.js';

// Basic equality assertion
assert(5).toBe(5); // passes
assert('hello').toBe('world'); // throws Error: Expected "hello" to be "world"
```

### Custom Error Messages

```javascript
import assert from './assert/index.js';

// With custom error message
assert(user.id, 'User must have an ID').toBe(expectedId);
assert(config.apiKey, 'API key is required').toBe(process.env.API_KEY);
```

### Validation in Functions

```javascript
import assert from './assert/index.js';

function processUser(user) {
  assert(user.id, 'User ID is required').toBe(user.id);
  assert(typeof user.name, 'User name must be a string').toBe('string');
  
  // Process user...
}
```

## API

### `assert(actual, message?)`

Creates a new assertion instance.

- `actual` - The value to test
- `message` (optional) - Custom error message to display on failure

Returns an `Assertion` instance with fluent methods.

### `.toBe(expected)`

Asserts that the actual value is strictly equal (`===`) to the expected value.

- `expected` - The value that `actual` should equal
- Throws `Error` if assertion fails
- Returns the assertion instance for potential chaining

## Examples

```javascript
import assert from './assert/index.js';

// Numbers
assert(2 + 2).toBe(4);

// Strings
assert('hello'.toUpperCase()).toBe('HELLO');

// Objects (reference equality)
const obj = { a: 1 };
assert(obj).toBe(obj); // passes
assert({ a: 1 }).toBe({ a: 1 }); // fails - different references

// Custom messages
assert(result, 'Calculation failed').toBe(expectedResult);
``` 
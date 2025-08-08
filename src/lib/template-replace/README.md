# template-replace

Simple string template replacement with curly brace placeholders.

## Purpose

The `template-replace` module provides lightweight string templating by replacing `{key}` placeholders with values from a data object. It's useful for generating dynamic text, formatting messages, and creating configurable prompts without heavy template engines.

## Usage

```javascript
import templateReplace from '../lib/template-replace/index.js';

const template = 'Hello {name}, your order #{orderId} is {status}.';
const data = {
  name: 'Alice',
  orderId: 12345,
  status: 'shipped'
};

const result = templateReplace(template, data);
// "Hello Alice, your order #12345 is shipped."
```

## API

### `templateReplace(template, data, missingValue)`

Replaces placeholders in a template string with values from data object.

**Parameters:**
- `template` (string): Template string containing `{key}` placeholders
- `data` (Object): Object with key-value pairs for replacement
- `missingValue` (string, optional): Value for missing keys (default: '')

**Returns:**
- `string`: Template with placeholders replaced

## Features

- **Simple Syntax**: Uses familiar `{key}` placeholder format
- **Safe Handling**: Gracefully handles null/undefined values
- **Configurable Fallback**: Custom value for missing placeholders
- **Type Coercion**: Automatically converts values to strings
- **No Dependencies**: Pure JavaScript implementation

## Placeholder Format

- Placeholders use curly braces: `{keyName}`
- Key names can contain letters, numbers, underscores
- No nested placeholders or expressions
- Missing keys replaced with `missingValue` parameter

## Edge Cases

- Returns empty string if template is null/undefined
- Returns original template if data is null/undefined
- Converts all values to strings (including numbers, booleans)
- Preserves unmatched placeholders if no data provided

## Notes

- Not intended for complex templating needs
- No support for conditionals, loops, or expressions
- Performs single-pass replacement
- Case-sensitive key matching

## Related Modules

- [shorten-text](../shorten-text) - Could use templates for prompts
- [strip-response](../strip-response) - Clean templated output
# path-aliases

Generate unique minimal path aliases for file paths.

## Purpose

The `path-aliases` module creates the shortest unique path suffixes for a set of file paths. This is useful for displaying abbreviated file paths in UIs, generating unique identifiers, or creating compact file references while maintaining uniqueness.

## Usage

```javascript
import pathAliases from '../lib/path-aliases/index.js';

const paths = [
  'src/components/Button.js',
  'src/components/Input.js',
  'test/components/Button.js'
];

const aliases = pathAliases(paths);
// Returns:
// {
//   'src/components/Button.js': 'src/components/Button.js',
//   'src/components/Input.js': 'Input.js',
//   'test/components/Button.js': 'test/components/Button.js'
// }
```

## API

### `pathAliases(sequences, delimiter)`

Creates unique minimal tails for the given sequences.

**Parameters:**
- `sequences` (Array<string>): Array of paths to create aliases for
- `delimiter` (string, optional): Path delimiter (default: '/')

**Returns:**
- `Object`: Map of original paths to their shortest unique suffixes

## Algorithm

The module works by:
1. Starting with the filename (last segment)
2. Adding parent directories until the path becomes unique
3. Returns the minimal suffix that uniquely identifies each path

## Features

- **Minimal Suffixes**: Always returns the shortest unique path
- **Collision Resolution**: Automatically extends paths when conflicts occur
- **Custom Delimiters**: Support for different path separators
- **Deterministic**: Same input always produces same output

## Notes

- Paths that are already unique may use just the filename
- Paths with identical filenames will include parent directories
- The algorithm prioritizes shorter aliases while maintaining uniqueness
- Works with any delimiter-separated sequences, not just file paths

## Related Modules

- [each-file](../each-file) - Iterate through files that could use aliasing
- [search-js-files](../search-js-files) - Find files that might need aliases
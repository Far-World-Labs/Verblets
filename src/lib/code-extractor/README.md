# code-extractor

Extract contextual code windows from source files with line highlighting.

## Purpose

The `code-extractor` utility provides functionality to extract snippets of code from files, showing a configurable window of lines around a target line. This is useful for error reporting, code analysis, and creating contextual code displays.

## Usage

```javascript
import { extractCodeWindow } from '../lib/code-extractor/index.js';

// Extract 5 lines before and after line 42
const codeSnippet = extractCodeWindow('/path/to/file.js', 42, 5);
console.log(codeSnippet);
```

## API

### `extractCodeWindow(filePath, line, windowSize)`

Extracts a window of code around a specific line with formatted line numbers.

**Parameters:**
- `filePath` (string): Path to the source file
- `line` (number): Target line number to highlight (1-based)
- `windowSize` (number, optional): Number of lines to show before and after the target line (default: 5)

**Returns:**
- `string`: Formatted code snippet with line numbers and target line marker, or empty string if file cannot be read

## Features

- **Line Highlighting**: The target line is marked with `>` for easy identification
- **Line Numbers**: Each line includes padded line numbers for reference
- **Configurable Window**: Adjust the context size to show more or fewer surrounding lines
- **Error Handling**: Gracefully handles missing files or invalid inputs
- **Boundary Safety**: Automatically constrains window to file boundaries

## Output Format

```
  10: function processData(input) {
  11:   const result = transform(input);
> 12:   if (!result) {
  13:     throw new Error('Invalid input');
  14:   }
  15:   return result;
```

## Example

```javascript
function displayError(error, filePath, lineNumber) {
  console.error(`Error at ${filePath}:${lineNumber}`);
  console.error(error.message);
  console.error('\nCode context:');
  
  const context = extractCodeWindow(filePath, lineNumber, 3);
  console.error(context);
}
```

## Notes

- Line numbers are 1-based (matching standard editor conventions)
- The window size represents lines before AND after (total context = windowSize * 2 + 1)
- Empty string is returned for invalid files or parameters
- Line content is preserved exactly as in the source file

## Related Modules

- [parse-js-parts](../parse-js-parts) - Parse JavaScript code components
- [search-js-files](../search-js-files) - Search and analyze JavaScript files
- [logger](../logger) - Could be enhanced with code context for errors
# list-find-lines

Find the single best matching line from a list using natural language instructions.

For finding items in general lists, use the [list-find](../list-find) verblet.

## Basic Usage

```javascript
import listFindLines from './index.js';

const logEntries = [
  'User logged in successfully at 09:15',
  'Database connection timeout at 09:22', 
  'Payment processed for order #12345',
  'System backup completed at 10:30'
];

const criticalEntry = await listFindLines(
  logEntries, 
  'which entry indicates a potential system problem?'
);
// => 'Database connection timeout at 09:22'
```

## Parameters

- **list** (string[]): Array of text lines to search through
- **instructions** (string): Natural language description of what to find
- **config** (Object): Configuration options
  - **llm** (Object): LLM model options (default: uses system default)

## Return Value

Returns the single best matching line as a string, or empty string if no match found.

## Use Cases

- Log file analysis and troubleshooting
- Finding relevant entries in documentation
- Selecting appropriate responses from templates
- Identifying key information in text datasets

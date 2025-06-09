# Parse LLM List

A utility function for parsing lists from LLM responses that may be in JSON array or CSV format.

## Usage

```javascript
import parseLLMList from './src/lib/parse-llm-list/index.js';

// Parse JSON array response
const jsonResponse = '["term1", "term2", "term3"]';
const terms1 = parseLLMList(jsonResponse);
// Returns: ["term1", "term2", "term3"]

// Parse CSV response
const csvResponse = 'term1, term2, term3';
const terms2 = parseLLMList(csvResponse);
// Returns: ["term1", "term2", "term3"]

// With custom options
const terms3 = parseLLMList(response, {
  excludeValues: ['none', 'null', 'n/a'],
  trimItems: true,
  filterEmpty: true
});
```

## Options

- `excludeValues` (string[]): Values to exclude from results (case-insensitive). Default: `['none', 'null', 'undefined']`
- `trimItems` (boolean): Whether to trim whitespace from items. Default: `true`
- `filterEmpty` (boolean): Whether to filter out empty strings. Default: `true`

## Features

- Automatically detects JSON array vs CSV format
- Handles common LLM response patterns like `<note>` tags
- Filters out excluded values and empty responses
- Robust error handling with fallback parsing 
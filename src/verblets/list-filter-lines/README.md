# list-filter-lines

Filter a list of text lines using natural language instructions in a single LLM call.

For bulk filtering of large lists, use the [filter](../../chains/filter) chain.

## Basic Usage

```javascript
import listFilterLines from './index.js';

const reflections = [
  'Losing that match taught me the value of persistence.',
  "I hate losing and it proves I'm worthless.",
  'After failing my exam, I studied harder and passed the retake.',
  "No matter what I do, I'll never succeed.",
];

const growth = await listFilterLines(
  reflections,
  'keep only reflections that show personal growth or learning from mistakes'
);
// => [
//   'Losing that match taught me the value of persistence.',
//   'After failing my exam, I studied harder and passed the retake.',
// ]
```

## Parameters

- **list** (string[]): Array of text lines to filter
- **instructions** (string): Natural language filtering criteria
- **config** (Object): Configuration options
  - **llm** (Object): LLM model options (default: uses system default)

## Return Value

Returns an array of strings containing only the lines that match the filtering criteria.

## Use Cases

- Content moderation and quality filtering
- Extracting relevant information from text datasets
- Removing negative or inappropriate content
- Selecting examples that meet specific criteria

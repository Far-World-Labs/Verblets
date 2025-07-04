# split

LLM-powered text splitter that intelligently inserts delimiters where your instructions apply. Use it when you need to divide long text by meaning, context, or semantic boundaries rather than exact characters or line breaks.

## Usage

```javascript
import split from './index.js';

const text = "First paragraph about cats. Second paragraph about dogs. Third paragraph about birds.";
const result = await split(text, 'between different animal topics', { delimiter: '---SPLIT---' });
// => "First paragraph about cats.---SPLIT---Second paragraph about dogs.---SPLIT---Third paragraph about birds."
```

## Parameters

- **`text`** (string, required): The text content to split
- **`instructions`** (string, required): Natural language description of where to insert delimiters
- **`config`** (object, optional): Configuration options
  - **`delimiter`** (string, default: '\n---\n'): The delimiter string to insert at split points
  - **`maxSplits`** (number, optional): Maximum number of splits to perform
  - **`preserveWhitespace`** (boolean, default: true): Whether to preserve original whitespace
  - **`llm`** (object, optional): LLM configuration for analysis

## Return Value

Returns a string with delimiters inserted at the appropriate split points according to the provided instructions.

## Features

- **Semantic Splitting**: Divides text based on meaning and context rather than arbitrary character counts
- **Natural Language Instructions**: Uses plain English descriptions to define split criteria
- **Flexible Delimiters**: Supports custom delimiter strings for different use cases
- **Context Awareness**: Maintains understanding of document structure and content flow
- **Preserves Formatting**: Optionally maintains original text formatting and whitespace

## Use Cases

### Document Section Separation
```javascript
const document = "Introduction section... Method section... Results section...";
const sections = await split(document, 'between major document sections', { delimiter: '\n\n===\n\n' });
// Split into distinct sections for processing
```

## Advanced Usage

### Custom Delimiters with Metadata
```javascript
const result = await split(longText, 'at chapter boundaries', { 
  delimiter: '\n\n<!-- CHAPTER_BREAK -->\n\n',
  maxSplits: 10
});
```

### Preserving Structure
```javascript
const result = await split(codeFile, 'between function definitions', {
  delimiter: '\n\n// === FUNCTION SEPARATOR ===\n\n',
  preserveWhitespace: true
});
```

### Batch Processing
```javascript
const documents = [doc1, doc2, doc3];
const splitResults = await Promise.all(
  documents.map(doc => split(doc, 'between major sections', { delimiter: '---' }))
);
```

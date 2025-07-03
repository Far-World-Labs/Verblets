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

### Comedy Routine Analysis
```javascript
import split from './index.js';
import fs from 'fs';

const comedySet = fs.readFileSync('standup-routine.txt', 'utf8');

const TOPIC = '---TOPIC---';
const PUNCHLINE = '---PUNCHLINE---';

// Split by comedy topics
const topicsMarked = await split(comedySet, 
  'between different comedy topics or subject changes', 
  { delimiter: TOPIC }
);

const topics = topicsMarked.split(TOPIC);

// Split each topic by punchlines
const jokes = await Promise.all(
  topics.map(topic => split(topic, 'after sentences that end with punchlines', { delimiter: PUNCHLINE }))
);
```

### Document Section Separation
```javascript
const document = "Introduction section... Method section... Results section...";
const sections = await split(document, 'between major document sections', { delimiter: '\n\n===\n\n' });
// Split into distinct sections for processing
```

### Dialogue Parsing
```javascript
const script = "Character A: Hello there. Character B: Hi! Character A: How are you?";
const dialogue = await split(script, 'between different speakers', { delimiter: '\n---SPEAKER---\n' });
// Separate dialogue by speaker changes
```

### Email Thread Separation
```javascript
const emailThread = "Original message... Reply 1... Reply 2...";
const messages = await split(emailThread, 'between individual email messages', { delimiter: '\n\n[MESSAGE]\n\n' });
// Extract individual messages from thread
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

## Integration Patterns

### With Text Processing Pipeline
```javascript
import split from './split/index.js';
import { summarize } from '../summarize/index.js';

const sections = (await split(longDocument, 'between major sections')).split('\n---\n');
const summaries = await Promise.all(
  sections.map(section => summarize(section))
);
```

### With Content Analysis
```javascript
import split from './split/index.js';
import { analyze } from '../analyze/index.js';

const paragraphs = (await split(text, 'between paragraphs')).split('\n---\n');
const analyses = await Promise.all(
  paragraphs.map(p => analyze(p))
);
```

## Related Modules

- [`chunk`](../chunk/README.md) - Split text into fixed-size chunks
- [`extract`](../extract/README.md) - Extract specific content from text
- [`parse`](../parse/README.md) - Parse structured content from text

## Error Handling

```javascript
try {
  const result = await split(text, instructions, config);
  const parts = result.split(config.delimiter || '\n---\n');
  console.log(`Text split into ${parts.length} sections`);
} catch (error) {
  if (error.message.includes('Empty text')) {
    console.log('No text provided for splitting');
  } else if (error.message.includes('Invalid instructions')) {
    console.log('Split instructions are unclear or invalid');
  } else {
    console.error('Text splitting failed:', error.message);
  }
}
```

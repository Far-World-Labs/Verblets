# Chunk Sentences Utility

Intelligently split text into manageable chunks while preserving sentence boundaries. This utility ensures text remains readable and coherent when divided for processing or display purposes.

## Features

- **Sentence-Aware Splitting**: Prioritizes breaking at natural sentence boundaries
- **Fallback Protection**: Uses word-based chunking when sentence detection fails
- **Exact Preservation**: Maintains original text integrity through precise slicing
- **Compromise Integration**: Leverages robust NLP library for sentence detection
- **Configurable Length**: Flexible maximum chunk size control

## Usage

### Document Processing

```javascript
import chunkSentences from './src/lib/chunk-sentences/index.js';

// Process a long article for email newsletter
const article = `
  Breaking news from the tech world today. Apple announced new features for developers. 
  The updates include improved debugging tools and enhanced performance metrics. 
  Industry experts are calling this a game-changer for mobile app development.
`;

const emailChunks = chunkSentences(article, 150);
// Result: [
//   "Breaking news from the tech world today. Apple announced new features for developers.",
//   "The updates include improved debugging tools and enhanced performance metrics.",
//   "Industry experts are calling this a game-changer for mobile app development."
// ]
```

## API Reference

### `chunkSentences(text, maxLen)`

Splits text into chunks while preserving sentence boundaries whenever possible.

**Parameters**

- `text` (string): The text content to be chunked
- `maxLen` (number): Maximum length for each chunk in characters

**Returns**

- `string[]`: Array of text chunks, each respecting the maximum length while maintaining sentence integrity

**Behavior**

- Attempts sentence-boundary splitting using the compromise NLP library
- Falls back to word-based chunking if no sentences are detected
- Preserves exact original text through precise string slicing
- Ensures no chunk exceeds the specified maximum length 
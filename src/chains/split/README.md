# split

Intelligently split text into meaningful segments using AI-powered analysis with context-aware boundaries and semantic understanding.

## Usage

```javascript
import split from './index.js';

const article = `
Machine learning is transforming industries worldwide. Companies are adopting AI solutions to improve efficiency and reduce costs.

The healthcare sector has seen remarkable advances with AI-powered diagnostics. Medical professionals can now detect diseases earlier and more accurately.

Education is also being revolutionized through personalized learning platforms. Students receive customized instruction based on their individual needs and learning styles.
`;

const sections = await split(article, 'split into topic-based paragraphs');
// Returns: [
//   'Machine learning is transforming industries worldwide...',
//   'The healthcare sector has seen remarkable advances...',
//   'Education is also being revolutionized...'
// ]
```

## API

### `split(text, criteria, config)`

**Parameters:**
- `text` (string): Text to split
- `criteria` (string): Natural language description of how to split
- `config` (Object): Configuration options
  - `maxSegments` (number): Maximum number of segments (optional)
  - `preserveFormatting` (boolean): Keep original formatting (default: true)
  - `llm` (Object): LLM model options

**Returns:** Promise<Array<string>> - Array of text segments

## Use Cases

### Document Processing
```javascript
import split from './index.js';

const manual = `
Chapter 1: Getting Started
This chapter covers the basics of installation and setup.

Chapter 2: Configuration
Learn how to configure the system for optimal performance.

Chapter 3: Advanced Features
Explore advanced functionality and customization options.
`;

const chapters = await split(manual, 'separate by chapters', { maxSegments: 5 });
// Returns each chapter as a separate segment
```

### Content Analysis
```javascript
const transcript = `
Speaker A: Welcome to today's meeting. Let's start with the quarterly review.
Speaker B: Thank you. Our sales numbers show a 15% increase this quarter.
Speaker A: That's excellent news. What about our marketing initiatives?
Speaker B: The new campaign launched successfully and generated significant interest.
`;

const turns = await split(transcript, 'separate by speaker turns');
// Returns each speaker's contribution as separate segments
```

# truncate

Intelligently find where to truncate text by identifying unwanted content from the end. Works backwards through text chunks, scoring each section for removal and returning the character index where unwanted content begins.

## Usage

```javascript
import truncate from './index.js';

const article = `
Main content about the topic...
More relevant information...
[Advertisement]
Footer content
Copyright notice
`;

const cutPoint = await truncate(article, 'advertisements and footer content');
const cleaned = article.slice(0, cutPoint);
```

## API

### `truncate(text, removalCriteria, config)`

**Parameters:**
- `text` (string) - The text to analyze for truncation
- `removalCriteria` (string) - Description of what content to remove from the end
- `config` (Object) - Configuration options
  - `threshold` (number) - Score threshold above which to remove content (default: 6)
  - `chunkSize` (number) - Target characters per chunk (default: 1000)

## Return Value

Returns a number representing the character index where to truncate the text.

## Configuration

```javascript
const cutPoint = await truncate(text, 'boilerplate and footers', {
  threshold: 7,   // Higher threshold = more aggressive removal
  chunkSize: 500  // Smaller chunks for finer control
});
```

## Usage Pattern

```javascript
// Specify what to truncate from the end
const cutPoint = await truncate(text, 'off-topic content and metadata');

// Apply the truncation
const cleaned = text.slice(0, cutPoint);
```
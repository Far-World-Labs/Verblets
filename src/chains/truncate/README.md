# truncate

Intelligently find where to truncate text by identifying unwanted content from the end. Works backwards through text chunks, scoring each section for removal and returning the character index where unwanted content begins.

## Usage

```javascript
import { truncate } from '@far-world-labs/verblets';

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
  - `strictness` (`'low'`|`'high'`|number) - Controls how strictly content is kept. `'high'` (threshold 7) only removes content scored strongly for removal — strict about keeping. `'low'` (threshold 4) removes anything not confidently worth keeping — lenient about cutting. A raw number sets the threshold directly. Default: 6
  - `chunkSize` (number) - Target characters per chunk (default: 1000)
  - `batchSize` (number) - Items per scoring batch (auto-calculated from model context window)
  - `llm` (string|Object) - LLM model configuration (passed through to scoring)

## Return Value

Returns a number representing the character index where to truncate the text.

## Configuration

```javascript
const cutPoint = await truncate(text, 'boilerplate and footers', {
  strictness: 'low',   // Lenient about cutting — removes borderline content
  chunkSize: 500       // Smaller chunks for finer control
});
```


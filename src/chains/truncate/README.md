# truncate

Find the best truncation point in text based on custom instructions.

Uses the existing `score` chain to evaluate text chunks and returns a character index for truncation.

## Usage

```javascript
import truncate from 'verblets/src/chains/truncate/index.js';

const text = `Long document with multiple paragraphs and sections that needs intelligent truncation based on specific criteria...`;

const cutPoint = await truncate(text, 'Keep sections about technical implementation');
// Returns: 1247 (character index)

const truncated = text.slice(0, cutPoint);
```

## Parameters

- `text` (string) - The text to analyze for truncation
- `instructions` (string) - Instructions for evaluating which chunks to keep
- `config` (object) - Configuration options
  - `chunkSize` (number) - Target characters per chunk (default: 1000)
  - Other options passed through to the score chain

## Return Value

Returns a number representing the character index where to truncate the text.

## How It Works

1. **Chunk the text** - Breaks text into ~1000 character chunks at sentence boundaries
2. **Score each chunk** - Uses the score chain with asXML-formatted instructions
3. **Find best chunk** - Identifies the highest-scoring chunk that meets criteria
4. **Return end index** - Returns the character index at the end of that chunk

## Examples

**Content-specific truncation:**
```javascript
const text = 'Introduction... Technical details... Conclusion...';
const cutPoint = await truncate(text, 'Focus on technical implementation only');
const result = text.slice(0, cutPoint);
```

**Custom chunk size:**
```javascript
const cutPoint = await truncate(text, 'Keep marketing content', {
  chunkSize: 500  // Smaller chunks for finer control
});
```

**Pass LLM config:**
```javascript
const cutPoint = await truncate(text, 'Prioritize research findings', {
  chunkSize: 800,
  llm: { temperature: 0.1 }
});
```

## Key Features

- **Proper chunking** - Fills chunks to target size, breaking at sentence boundaries
- **Clear instructions** - Uses asXML to format scoring instructions clearly
- **No fallbacks** - Either works or caller must retry (fail fast)
- **Simple output** - Just returns character index for truncation

## Usage Pattern

```javascript
// Get the truncation point
const cutPoint = await truncate(text, instructions, config);

// Apply the truncation
const truncated = text.slice(0, cutPoint);
```

The function will chunk large texts efficiently and score each chunk against your criteria, returning the end position of the best-matching chunk.
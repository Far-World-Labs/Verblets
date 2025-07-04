# score

Score lines of text with automatic calibration. Each batch returns a JSON array so parsing stays reliable even with long lists. The chain first scores everything, then rescores a few low, middle, and high examples to calibrate. Those references feed a second scoring pass so every item is ranked consistently using OpenAI's JSON schema enforcement.

For single-batch scoring, use the [list-score-lines](../../verblets/list-score-lines) verblet.

## Basic Usage

```javascript
import score from './index.js';

const slogans = [
  'Amazing deals every day!',
  'Unlock a world of wonder', 
  'Buy stuff now',
  'Experience the difference',
  'Quality you can trust',
  'Innovation that inspires'
];

const { scores } = await score(slogans, 'How catchy is this marketing slogan?');
// scores returned as numeric values
```

## Parameters

- **items** (string[]): Array of text items to score
- **instructions** (string): Natural language description of scoring criteria
- **config** (Object): Configuration options
  - **chunkSize** (number): Items per batch (default: 10)
  - **maxAttempts** (number): Retry attempts for failed batches (default: 3)
  - **llm** (Object): LLM model options (default: uses system default)

## Return Value

Returns an object with:
- **scores** (number[]): Array of numerical scores (0-10 scale) corresponding to each input item
- **items** (string[]): Array of original items in the same order as scores

## Features

- **Two-pass calibration**: Initial scoring followed by calibrated rescoring for consistency
- **Batch processing**: Handles large datasets by processing items in manageable chunks
- **JSON schema enforcement**: Uses OpenAI's structured output for reliable parsing
- **Automatic retry**: Failed chunks are automatically retried for improved reliability
- **Consistent scaling**: Calibration ensures scores are comparable across all items

## Use Cases

- Evaluating content quality at scale
- Ranking customer feedback by sentiment or urgency
- Scoring marketing materials for effectiveness
- Assessing document relevance or importance
- Rating user-generated content for moderation
- Comparing product descriptions for quality
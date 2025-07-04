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
<<<<<<< HEAD
- Comparing product descriptions for quality
=======
- Comparing product descriptions for quality

## Advanced Usage

```javascript
// Custom scoring with specific criteria
const { scores, items } = await score(
  customerReviews,
  'Rate the helpfulness and detail of this product review',
  {
    chunkSize: 15,
    maxAttempts: 5,
    llm: { model: 'gpt-4', temperature: 0.2 }
  }
);

// Scoring different content types
const blogPosts = [
  'How to bake perfect cookies',
  'The science behind climate change',
  'Top 10 vacation destinations'
];
const { scores } = await score(blogPosts, 'How engaging and well-written is this title?');

// Processing large datasets
const massiveList = Array.from({ length: 100 }, (_, i) => `Item ${i}`);
const { scores } = await score(
  massiveList, 
  'rate the uniqueness of this item name',
  { chunkSize: 20 }
);
```

## Calibration Process

1. **Initial Scoring**: All items are scored in batches using the provided criteria
2. **Sample Selection**: Low, medium, and high scoring examples are selected for calibration
3. **Rescoring**: Selected samples are rescored with additional context for consistency
4. **Final Adjustment**: All scores are adjusted based on calibration results

## Error Handling

The chain automatically retries failed batches up to `maxAttempts` times. Items from failed batches will be excluded from the final results. The function maintains order correspondence between input items and output scores.
>>>>>>> origin/main

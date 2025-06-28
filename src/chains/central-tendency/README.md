# central-tendency

Evaluate graded family resemblance for datasets in cognitive categories using batch processing. This chain handles large datasets by processing items in chunks while maintaining consistency across the entire evaluation.

For single-item evaluation, use the [central-tendency-lines](../../verblets/central-tendency-lines) verblet.

## Overview

The `centralTendency` chain assesses graded typicality by analyzing feature overlap, core characteristics, and functional alignment with seed items across large datasets. It implements cognitive science principles with automatic retry logic and batch processing for reliable evaluation of category membership.

## Basic Usage

```javascript
import centralTendency from './index.js';

// Evaluate multiple animals for mammalian centrality
const testAnimals = ['wolf', 'tiger', 'elephant', 'whale', 'dolphin', 'bat'];
const mammalSeeds = ['dog', 'cat', 'horse', 'cow'];

const results = await centralTendency(
  testAnimals,
  mammalSeeds,
  {
    context: 'Mammalian characteristics and traits',
    coreFeatures: ['warm-blooded', 'hair/fur', 'mammary glands'],
    chunkSize: 3,
    maxAttempts: 2
  }
);

// Returns array of results with scores, reasons, and confidence values
```

## Parameters

- **items** (string[]): Array of items to evaluate for centrality
- **seedItems** (string[]): Array of known category members for comparison
- **config** (Object): Configuration options
  - **context** (string): Context description for evaluation (default: '')
  - **coreFeatures** (string[]): Known core/definitional features of the category (default: [])
  - **chunkSize** (number): Items per batch for processing (default: 10)
  - **maxAttempts** (number): Retry attempts for failed batches (default: 3)
  - **llm** (string): LLM model to use (default: 'fastGoodCheap')

## Return Value

Returns an array of centrality assessments:

```javascript
[
  {
    score: 0.85,        // Centrality score (0.0-1.0)
    reason: "...",      // Brief explanation of assessment
    confidence: 0.82    // Confidence in assessment (0.0-1.0)
  },
  // ... one result per input item
]
```

## Cognitive Science Applications

This chain is particularly useful for:
- **Large-scale categorization studies**: Evaluate hundreds of items for category membership
- **Prototype research**: Identify central vs peripheral category members in datasets
- **Cross-category comparison**: Compare centrality across different conceptual domains
- **Dataset validation**: Verify that training data contains good category exemplars

## Integration with Other Chains

```javascript
import categorySamples from '../category-samples/index.js';
import centralTendency from './index.js';

// Generate diverse category seeds, then evaluate large dataset
const seeds = await categorySamples('musical instrument', { count: 8, diversityLevel: 'high' });
const instruments = [...]; // Large array of instruments to evaluate
const centralities = await centralTendency(instruments, seeds, {
  context: 'Traditional acoustic instruments for orchestral music',
  chunkSize: 15
});
``` 
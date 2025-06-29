# Sort

AI-powered sorting that can order items by complex, subjective criteria that traditional sorting cannot handle. Like other chains, the sort chain batches over long lists using a custom algorithm made for LLM processing characteristics.

## Usage

```javascript
import { sort } from '@far-world-labs/verblets';

// Sort by subjective criteria
const companies = ['Apple', 'Google', 'Microsoft', 'Amazon'];
const sorted = await sort(companies, 'market influence in AI', {
  batchSize: 10,
  iterations: 2
});
```

## Parameters

- `list` (Array) - Items to sort
- `criteria` (string) - Sorting criteria description
- `options` (Object) - Configuration options
  - `batchSize` (number) - Items per batch (default: 10)
  - `extremeK` (number) - Top/bottom items to track (default: 10)
  - `iterations` (number) - Sorting iterations for accuracy (default: 1)
  - `model` (Object) - LLM model configuration
  - `llm` (Object) - Additional LLM options

## Returns

Array of items sorted according to the specified criteria.

## "Vibe Sort" Algorithm

Uses an iterative batch sorting approach:
1. Processes items in configurable batches
2. Tracks top and bottom ranked items across batches, incrementally extracting both the top and bottom N.
3. Incrementally moves inward until the entire list is sorted.

## Examples

### Business Analysis
```javascript
const competitors = ['Netflix', 'Disney+', 'HBO Max', 'Hulu'];
const sorted = await sort(competitors, 'content quality and user experience');
```
# Summary Map Chain

SummaryMap is a hash table with auto-resizing values that resize upon serialization. It can be used to keep the overall size of a hash of items within a fixed budget. A primary use case for this is keeping prompts full of various pieces of context fixed to a desired size. The chain manages collections of data elements by compressing them based on weights and token budgets, enabling efficient context management for language model interactions.

## Features

- **Token Budget Management**: Automatically compresses data to fit within specified token limits
- **Weighted Prioritization**: Assigns importance weights to different data elements
- **Privacy-Aware Processing**: Built-in support for sensitive data handling with blacklists
- **Multiple Data Types**: Supports text, code, and structured data compression
- **Flexible Integration**: Works seamlessly with existing prompt functions and model services

## Usage

### Basic Token Management

```javascript
import SummaryMap from './src/chains/summary-map/index.js';

// Create a summary map with token budget
const summaryMap = new SummaryMap({ targetTokens: 100 });

// Add weighted data elements
summaryMap.set('userStory', { 
  value: 'Long user story text...', 
  weight: 1.0, 
  type: 'text' 
});

summaryMap.set('codeExample', { 
  value: 'Complex code snippet...', 
  weight: 0.5, 
  type: 'code' 
});

// Get compressed results
const compressedData = await summaryMap.pavedSummaryResult();
```

### Privacy-Aware Processing

```javascript
// Handle sensitive data with privacy controls
const privacyMap = new SummaryMap({ targetTokens: 150 });

privacyMap.set('customerFeedback', {
  value: 'Customer John Smith from Acme Corp said...',
  weight: 1.0,
  privacy: { blacklist: 'names' }
});

const sanitizedData = await privacyMap.pavedSummaryResult();
// Result: 'Customer [REDACTED] from [REDACTED] said...'
```

### Prompt Integration

```javascript
// Integrate with existing prompt workflows
const promptFunction = (data) => `
Analyze this user story: ${data.userStory}
Reference code: ${data.codeExample}
`;

const summaryMap = new SummaryMap({ targetTokens: 200 });
summaryMap.set('userStory', { value: longUserStory, weight: 1.0 });
summaryMap.set('codeExample', { value: complexCode, weight: 0.7 });

const optimizedInputs = await summaryMap.pavedSummaryResult();
const prompt = promptFunction(optimizedInputs);
```

## API Reference

### `new SummaryMap(options)`

Creates a new summary map instance for managing data compression within token budgets.

**Options**

- `targetTokens` (number): Maximum token budget for all compressed data
- `compressionRatio` (number): Default compression ratio (default: 0.5)

### `summaryMap.set(key, dataElement)`

Adds or updates a data element in the summary map.

**Data Element Properties**

- `value` (string): The data content to be managed
- `weight` (number): Relative importance (0.0 to 1.0)
- `type` ('text' | 'code' | 'structured'): Data type for specialized handling
- `privacy` (object): Privacy controls with blacklist options

### `summaryMap.pavedSummaryResult()`

Returns the compressed and optimized data collection that fits within the token budget.

**Returns**

Promise resolving to an object with compressed data elements as key-value pairs.

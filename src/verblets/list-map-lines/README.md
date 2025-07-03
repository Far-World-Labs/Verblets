# list-map-lines

Transform each item in a list using natural language instructions in a single LLM call.

For bulk transformation of large lists, use the [map](../../chains/map) chain.

## Basic Usage

```javascript
import listMapLines from './index.js';

const products = ['Budget smartphone', 'Luxury watch', 'Gaming headset'];
const taglines = await listMapLines(products, 'Write a short playful tagline');

// Returns: ['Affordable tech for everyone', 'Elegance that tells time', 'Level up your audio game']
```

## Parameters

- **list** (Array): Array of items to transform
- **instructions** (string): Natural language transformation instructions
- **config** (Object): Configuration options
  - **llm** (Object): LLM model options (default: uses system default)

## Return Value

Returns an array of transformed strings, one for each input item.

## Use Cases

- Creating marketing copy from product names
- Generating descriptions from keywords
- Converting technical terms to user-friendly language
- Transforming data formats using natural language rules

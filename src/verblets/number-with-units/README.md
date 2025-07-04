# number-with-units

Extract numeric values with their units from text using AI-powered parsing with intelligent unit recognition and context understanding.

## Usage

```javascript
import numberWithUnits from './index.js';

const text = "The server uses 2.5 GB of RAM and runs at 3.2 GHz";
const result = await numberWithUnits(text, {
  prompt: 'Extract memory and processor speed information'
});

// Returns:
// [
//   { value: 2.5, unit: 'GB', context: 'RAM' },
//   { value: 3.2, unit: 'GHz', context: 'processor speed' }
// ]
```

## API

### `numberWithUnits(text, config)`

**Parameters:**
- `text` (string): Text to extract numbers and units from
- `config` (Object): Configuration options
  - `prompt` (string): Instructions for extraction context
  - `llm` (Object): LLM model options

**Returns:** Promise<Array> - Array of objects with value, unit, and context properties

## Use Cases

### Technical Specifications
```javascript
import numberWithUnits from './index.js';

const specs = "Display: 15.6 inch, Weight: 4.2 lbs, Battery: 8 hours";
const measurements = await numberWithUnits(specs, {
  prompt: 'Extract all physical measurements and specifications'
});

// Returns detailed measurements with units and context
``` 
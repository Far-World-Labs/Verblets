# number-with-units

Extract and normalize numeric values with their units from text using AI-powered parsing that handles various formats and unit representations.

## Usage

```javascript
import numberWithUnits from './index.js';

const measurements = await numberWithUnits('The package weighs 2.5 kg and measures 30cm x 15cm');
// Returns: [
//   { value: 2.5, unit: 'kg', original: '2.5 kg' },
//   { value: 30, unit: 'cm', original: '30cm' },
//   { value: 15, unit: 'cm', original: '15cm' }
// ]
```

## API

### `numberWithUnits(text, options)`

**Parameters:**
- `text` (string): Text containing numbers with units
- `options` (Object): Configuration options
  - `unitTypes` (Array): Specific unit types to extract (optional)
  - `normalize` (boolean): Whether to normalize units (default: true)
  - `llm` (Object): LLM model options

**Returns:** Promise<Array<Object>> - Array of extracted measurements with structure:
```javascript
{
  value: number,     // Numeric value
  unit: string,      // Unit of measurement
  original: string   // Original text representation
}
```

## Use Cases

### Recipe Parsing
```javascript
const ingredients = await numberWithUnits('Add 2 cups flour, 250ml milk, and 1 tsp vanilla');
// Returns normalized measurements for recipe scaling
```

### Technical Specifications
```javascript
const specs = await numberWithUnits('CPU: 3.2 GHz, RAM: 16 GB, Storage: 1 TB SSD');
// Returns structured hardware specifications
```

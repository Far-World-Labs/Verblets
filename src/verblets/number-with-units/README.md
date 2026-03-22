# number-with-units

Extract and normalize numeric values with their units from text using AI-powered parsing that handles various formats and unit representations.

## Usage

```javascript
import { numberWithUnits } from '@far-world-labs/verblets';

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

Handles mixed formats and informal notation:

```javascript
await numberWithUnits('Add 2 cups flour, 250ml milk, and 1 tsp vanilla');
// => [{ value: 2, unit: 'cups', original: '2 cups' }, { value: 250, unit: 'ml', original: '250ml' }, ...]

await numberWithUnits('CPU: 3.2 GHz, RAM: 16 GB, Storage: 1 TB SSD');
// => [{ value: 3.2, unit: 'GHz', original: '3.2 GHz' }, { value: 16, unit: 'GB', original: '16 GB' }, ...]
```

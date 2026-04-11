# number-with-units

Extract a numeric value and its unit from a text question using AI-powered parsing.

## Usage

```javascript
import { numberWithUnits } from '@far-world-labs/verblets';

const result = await numberWithUnits('How much does the mass of the Earth weigh in kilograms?');
// Returns: { value: 5.972e24, unit: 'kg' }
```

## API

### `numberWithUnits(text, config)`

**Parameters:**
- `text` (string): Text containing a question or statement with a numeric answer and unit
- `config` (Object): Configuration options
  - `llm` (Object): LLM model options

**Returns:** `Promise<Object>` with:
- `value` (number|undefined): The extracted numeric value, or `undefined` if unanswerable
- `unit` (string|undefined): The unit of measurement

```javascript
await numberWithUnits('What is the boiling point of water in Fahrenheit?');
// => { value: 212, unit: 'F' }

await numberWithUnits('How tall is Mount Everest in meters?');
// => { value: 8849, unit: 'm' }
```

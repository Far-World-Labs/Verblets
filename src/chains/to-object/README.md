# to-object

Repair malformed JSON from LLM responses and optionally validate against a JSON Schema.

```javascript
import { toObject } from '@far-world-labs/verblets';

// LLM returned broken JSON with trailing comma and unquoted key
const broken = '{ name: "Alice", scores: [95, 87, 92,], }';
const result = await toObject(broken);
// => { name: 'Alice', scores: [95, 87, 92] }

// With schema validation — throws ValidationError if structure doesn't match
const schema = {
  type: 'object',
  properties: { name: { type: 'string' }, scores: { type: 'array', items: { type: 'number' } } },
  required: ['name', 'scores'],
};
const validated = await toObject(broken, schema);
```

## API

### `toObject(text, schema?, config?)`

- **text** (string): Raw text containing JSON (possibly malformed)
- **schema** (Object): Optional JSON Schema for validation
- **config** (Object): Configuration options
  - **llm**: LLM configuration for repair calls

**Returns:** Promise\<Object\> — Parsed and optionally validated object

**Throws:** `ValidationError` when schema validation fails after repair attempts

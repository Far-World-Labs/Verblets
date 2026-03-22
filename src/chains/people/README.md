# people

Generate artificial person profiles with consistent demographics and traits from a natural language description.

## Example

Create an expert panel where each person has a coherent background, perspective, and personality — not just random attributes:

```javascript
import { people } from '@far-world-labs/verblets';

const panelists = await people(`
  Expert panel for discussing AI regulation:
  - Philosophy professor specializing in ethics
  - Tech industry ML engineer with deployment experience
  - EU policy maker focused on technology legislation
  - Patient advocate from the healthcare sector
  Include each person's core argument and blind spots
`, 4);
// Each person has a name, background, expertise, core argument,
// blind spots, and other attributes shaped by the description
```

## API Reference

### `people(description, count, config)`

- `description` (string): Natural language description of the people to generate
- `count` (number): Number of people to create (default: 3)
- `config` (Object): `{ llm }` — LLM configuration
- **Returns:** Promise<Array<Object>> — person objects with attributes tailored to the description

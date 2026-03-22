# scale

Create AI-powered scaling functions that map inputs using conceptual reasoning — not just math. The scale understands subjective judgments, context, and non-linear relationships.

## Example

Turn fuzzy human language into consistent numeric scores:

```javascript
import { scale } from '@far-world-labs/verblets';

const threatLevel = scale(`
  Assess cybersecurity threat descriptions on a 0-10 scale:
  - 0-2: informational, no action needed
  - 3-5: suspicious activity, monitor closely
  - 6-8: active threat, immediate investigation
  - 9-10: breach in progress, all hands on deck
`);

await threatLevel('Failed login from known IP');           // 1
await threatLevel('Unusual data export pattern at 3am');   // 6
await threatLevel('SQL injection attempt with exfiltrated customer DB dump'); // 9
```

## API Reference

### `scale(prompt, config)` (default export)

Creates a scaling function from natural language instructions.

- `prompt` (string): Description of the scaling behavior
- `config` (Object): `{ llm }` — LLM configuration
- **Returns:** async function that accepts any input and returns the scaled value

### `scaleSpec(prompt, config)`

Generates a reusable scale specification. Returns `{ domain, range, mapping }`.

### `applyScale(item, specification, config)`

Applies a pre-generated specification to a single item.

### `createScale(specification, config)`

Creates a scale function from a pre-generated specification. The returned function has a `.specification` property.

### Collection Instruction Builders

For use with collection utilities (`map`, `filter`, `find`, `group`, `reduce`). Each accepts `{ specification, processing }`:

`mapInstructions`, `filterInstructions`, `findInstructions`, `groupInstructions`, `reduceInstructions`

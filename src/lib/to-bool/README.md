# to-bool

Parse an LLM response string into a boolean. Strips markdown formatting, then checks for exact `"true"` or `"false"` (case-insensitive).

```javascript
import { toBool } from '@far-world-labs/verblets';

toBool('true');    // => true
toBool('False');   // => false
toBool('TRUE');    // => true
toBool('maybe');   // => undefined
```

## API

### `toBool(value)`

- **value** (any): Lowercased, stripped of markdown formatting via `stripResponse`, then matched against `"true"` and `"false"`.

**Returns:** `true`, `false`, or `undefined` if the cleaned string is neither.

## Related

- [to-number](../to-number/README.md) — numeric coercion
- [to-date](../to-date/README.md) — date coercion
- [to-enum](../to-enum/README.md) — constrained string matching

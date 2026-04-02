# to-bool

Parse an LLM response string into a boolean. Strips markdown formatting, then matches against common truthy/falsy strings (case-insensitive).

```javascript
import { init } from '@far-world-labs/verblets';

const { toBool } = init();

toBool('true');    // => true
toBool('False');   // => false
toBool('yes');     // => true
toBool('no');      // => false
toBool('1');       // => true
toBool('0');       // => false
toBool('maybe');   // => undefined
```

## API

### `toBool(value)`

- **value** (any): Lowercased, stripped of markdown formatting via `stripResponse`, then matched.

**Truthy:** `"true"`, `"yes"`, `"1"`. **Falsy:** `"false"`, `"no"`, `"0"`.

**Returns:** `true`, `false`, or `undefined` if the cleaned string doesn't match any known value.

## Related

- [to-number](../to-number/README.md) — numeric coercion
- [to-date](../to-date/README.md) — date coercion
- [to-enum](../to-enum/README.md) — constrained string matching

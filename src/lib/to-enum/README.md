# to-enum

Match an LLM response string to a key in an enum object. Case-insensitive, strips markdown formatting and punctuation before matching.

```javascript
import { toEnum } from '@far-world-labs/verblets';

const colors = { red: 'red', green: 'green', blue: 'blue' };

toEnum('Red', colors);     // => 'red'
toEnum('GREEN', colors);   // => 'green'
toEnum('purple', colors);  // => undefined
```

## API

### `toEnum(value, enumObject)`

- **value** (any): Raw LLM output. Cleaned via `stripResponse`, then non-word characters removed before matching.
- **enumObject** (Object): Keys are the valid enum values. The first key matching case-insensitively is returned.

**Returns:** The matching key string, or `undefined` if no match.

## Related

- [to-bool](../to-bool/README.md) — boolean coercion
- [to-number](../to-number/README.md) — numeric coercion
- [to-date](../to-date/README.md) — date coercion

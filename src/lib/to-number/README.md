# to-number

Parse a string value into a number. Designed for post-processing LLM responses that contain numeric values.

```javascript
import { init } from '@far-world-labs/verblets';

const { toNumber } = init();

toNumber('42');          // => 42
toNumber('3.14');        // => 3.14
toNumber('$1,299.99');   // => 1299.99  (stripped by stripNumeric)
toNumber('undefined');   // => undefined
toNumber('abc');         // throws Error('LLM output [error]')
```

## API

### `toNumber(value)`

- **value** (any): Lowercased and stripped of markdown formatting via `stripResponse`, then cleaned of non-numeric characters via `stripNumeric` before conversion with the unary `+` operator.

**Returns:** A number if conversion succeeds, `undefined` if the cleaned string is `"undefined"`. Throws if the result is `NaN`.

Like `toDate`, the function is strict — callers handle the error rather than receiving a silent sentinel value.

## Related

- [to-date](../to-date/README.md) — date coercion with the same strip-and-parse pattern
- [to-bool](../to-bool/README.md) — boolean coercion
- [to-enum](../to-enum/README.md) — constrained string matching
